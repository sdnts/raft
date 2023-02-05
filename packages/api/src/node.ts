import {
  ClientMessage,
  deserialize,
  NodeId,
  NodeIds,
  NodeMessage,
  NodeStatus,
  serialize,
} from "@raft/common";
import { Err, Ok, Result } from "ts-results-es";
import { Env } from ".";
import { signCookie } from "./cookie";

/**
 * A Node is a single DO in a Cluster.
 * Multiple new instances of this DO are created for every cluster that the UI sees,
 * making each Node truly isolated from all other nodes in all other clusters.
 * Every Node also maintains a WebSocket connection with all UI clients connected
 * to it, to keep them in sync.
 * Nodes do not maintain WebSocket connections between themselves though. There's
 * no reason they can't, I just ... didn't do it.
 *
 * Nodes are capable of shutting themselves down when all client traffic stops,
 * which makes clusters cheap to create and run.
 */
export class Node implements DurableObject {
  clusterSize = NodeIds.length;
  clusterId!: string;
  nodeId!: NodeId;

  status: NodeStatus = "follower";
  // Current election term
  term: number = 0;
  // Who did we vote for in this term?
  votedFor?: NodeId;

  // TimeoutIds returned by `setTimeout` / `setInterval`
  // Used for both election & heartbeat timeouts.
  timeoutId: number = -1;

  // WebSocket connections to all connected clients
  clients: Set<WebSocket> = new Set();

  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request) {
    this.clusterId = this.clusterId ?? request.headers.get("x-cluster-id");
    this.nodeId = this.nodeId ?? request.headers.get("x-node-id");

    if (!this.clusterId || !this.nodeId) {
      return new Response("`clusterId` & `nodeId` must be known", {
        status: 500,
      });
    }

    const authorization = request.headers.get("Authorization");
    if (authorization && authorization === this.env.nodeSecret) {
      const body = await request.arrayBuffer();
      return this.state.blockConcurrencyWhile(() => this.gossip(body));
    }

    return this.acceptClient();
  }

  /**
   * Accept an incoming WebSocket connection request from a client. This is the
   * UI.
   */
  async acceptClient(): Promise<Response> {
    const { 0: theirHalf, 1: myHalf } = new WebSocketPair();

    const abortController = new AbortController();

    myHalf.addEventListener(
      "message",
      async (event) => {
        const msg = deserialize<ClientMessage>(
          new Uint8Array(event.data as ArrayBuffer)
        );
        if (msg.err) {
          // Malformed message
          return;
        }

        if (
          msg.val.clusterId !== this.clusterId ||
          msg.val.nodeId !== this.nodeId
        ) {
          // Message is not meant for me, must be bad routing
          return;
        }

        console.log(
          `${new Date().toISOString()}`,
          `[${this.nodeId}] <- Client`,
          msg.val
        );

        switch (msg.val.action) {
          case "SetStatus": {
            // Clients are only allowed to do certain kinds of status transitions
            if (this.status === "offline" && msg.val.status === "follower") {
            } else if (msg.val.status === "offline") {
              clearInterval(this.timeoutId);
              clearTimeout(this.timeoutId);
            } else {
              return;
            }

            // Notify all clients of this status change except this one
            this.setStatus(msg.val.status, [myHalf]);
            break;
          }
        }
      },
      { signal: abortController.signal }
    );

    myHalf.addEventListener(
      "error",
      (e) => {
        console.error(
          `${new Date().toISOString()}`,
          `[${this.nodeId}]`,
          "Client Error",
          e
        );

        abortController.abort();
        this.clients.delete(myHalf);

        if (this.clients.size === 0) {
          // Make sure to stop heartbeats so the DO can shut down
          clearTimeout(this.timeoutId);
          clearInterval(this.timeoutId);
        }
      },
      { signal: abortController.signal }
    );

    myHalf.addEventListener(
      "close",
      (e) => {
        console.error(
          `${new Date().toISOString()}`,
          `[${this.nodeId}]`,
          "Client Close",
          e
        );

        abortController.abort();
        this.clients.delete(myHalf);

        if (this.clients.size === 0) {
          // Make sure to stop heartbeats so the DO can shut down
          clearTimeout(this.timeoutId);
          clearInterval(this.timeoutId);
        }
      },
      { signal: abortController.signal }
    );

    myHalf.accept();
    this.clients.add(myHalf);

    // Send a Welcome message to the client but don't block on it
    myHalf.send(
      serialize<ClientMessage>({
        action: "Welcome",
        clusterId: this.clusterId,
        nodeId: this.nodeId,
        status: this.status,
      })
    );

    // If this is the first client, schedule a leader election
    if (this.clients.size === 1) {
      this.timeoutId = setTimeout(() => {
        console.log(
          `${new Date().toISOString()}`,
          `[${this.nodeId}]`,
          "Waking up cluster"
        );

        void this.election();
      }, randomElectionTimeout());
    }

    return new Response(null, {
      status: 101,
      webSocket: theirHalf,
      headers: {
        "Set-Cookie": [
          `cluster=${await signCookie(this.clusterId, this.env)}`,
          isDev(this.env) ? "Domain=localhost" : `Domain=raft.sdnts.dev`,
          `Path=/`,
          "HttpOnly",
          isDev(this.env) ? "Secure" : undefined,
        ]
          .filter((v) => !!v)
          .join("; "),
      },
    });
  }

  /**
   * Handle a message from another Node
   *
   * @param body The serialized message
   */
  async gossip(body: ArrayBuffer): Promise<Response> {
    const msg = deserialize<NodeMessage>(body);
    if (msg.err) {
      return new Response(msg.val.message, { status: 400 });
    }

    console.log(`${new Date().toISOString()}`, `[${this.nodeId}] <-`, msg.val);

    if (this.status === "offline") {
      console.log(
        `${new Date().toISOString()}`,
        `[${this.nodeId}]`,
        "I am offline"
      );
      return new Response(null, { status: 503 });
    }

    // Messages from old terms mean nothing
    if (msg.val.term < this.term) {
      return new Response(null, { status: 400 });
    }

    // Always keep the term up-to-date
    if (msg.val.term > this.term) {
      this.term = msg.val.term;
      this.votedFor = undefined;
    }

    switch (msg.val.action) {
      case "AppendEntries":
        // Clearly the leader is valid, so switch status back to follower, if not
        // already
        this.setStatus("follower");

        // Schedule an election if the next AppendEntries is late
        clearInterval(this.timeoutId);
        clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => {
          console.log(
            `${new Date().toISOString()}`,
            `[${this.nodeId}]`,
            "AppendEntries is late",
            `term = ${this.term}`
          );

          this.election();
        }, randomElectionTimeout());

        // Acknowledge AppendEntries
        const response: NodeMessage = {
          action: "Appended",
          term: this.term,
        };
        return new Response(serialize(response), {
          status: 200,
        });

      case "RequestVote":
        clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => {
          console.log(
            `${new Date().toISOString()}`,
            `[${this.nodeId}]`,
            "Election timed out"
          );

          this.election();
        }, randomElectionTimeout());

        // If we haven't already voted this term, grant vote
        if (this.votedFor === undefined) {
          this.votedFor = msg.val.candidateId;
          return new Response(
            serialize<NodeMessage>({
              action: "Vote",
              term: this.term,
              granted: true,
            })
          );
        }

        return new Response(
          serialize<NodeMessage>({
            action: "Vote",
            term: this.term,
            granted: false,
          })
        );

      default:
        console.log(
          `${new Date().toISOString()}`,
          `[${this.nodeId}] <-`,
          msg.val
        );

        return new Response(
          `Bad Request: Action ${msg.val.action} is not valid here`,
          { status: 400 }
        );
    }
  }

  /**
   * Set this node's status, and announce the new status to all connected clients
   *
   * @param status The status to set
   * @param except All clients except the ones here will be notified
   */
  setStatus(status: NodeStatus, except: WebSocket[] = []) {
    if (this.status === status) {
      return;
    }

    this.status = status;

    // In the next tick, notify clients of this status change
    // setTimeout(() => {
    this.clients.forEach((client) => {
      !except.includes(client) &&
        client.send(
          serialize<ClientMessage>({
            action: "SetStatus",
            clusterId: this.clusterId,
            nodeId: this.nodeId,
            status,
          })
        );
    });
    // }, 0);
  }

  /**
   * Marks this node as a candidate and starts an election trying to get itself
   * elected as the new cluster leader
   */
  async election(): Promise<void> {
    // Randomize timeout to prevent split votes
    const electionTimeout = randomElectionTimeout();

    console.log(
      `${new Date().toISOString()}`,
      `[${this.nodeId}]`,
      "Starting new election"
    );

    this.term++; // Start a new term
    this.setStatus("candidate"); // Mark yourself as a candidate
    this.votedFor = this.nodeId; // Vote for yourself

    let numVotes = 1; // Count your vote

    // Request votes from all other nodes
    const voteAbortController = new AbortController();
    const votes = await setDeadline(
      electionTimeout,
      broadcast(
        this.env,
        this,
        {
          action: "RequestVote",
          term: this.term,
          candidateId: this.nodeId,
        },
        voteAbortController
      )
    );

    if (votes.err) {
      voteAbortController.abort();
      console.log(
        `${new Date().toISOString()}`,
        `[${this.nodeId}]`,
        "Election timed out",
        `term = ${this.term}`
      );

      return this.election();
    }

    const minRequiredVotes = Math.floor(this.clusterSize / 2) + 1;
    numVotes += votes.val.reduce((count, vote) => {
      if (
        vote.ok &&
        vote.val.action === "Vote" &&
        vote.val.term === this.term &&
        vote.val.granted
      ) {
        count++;
      }

      return count;
    }, 0);

    if (numVotes < minRequiredVotes) {
      console.log(
        `${new Date().toISOString()}`,
        `[${this.nodeId}]`,
        "Lost election",
        `term = ${this.term}`
      );
      return;
    }

    // If you are still a candidate, declare yourself a leader.
    // We must check for candidacy because some other valid leader might have reached
    // out while we were waiting for votes
    if (this.status !== "candidate") {
      return;
    }

    console.log(
      `${new Date().toISOString()}`,
      `[${this.nodeId}]`,
      "I am the captain now",
      `term = ${this.term}`
    );

    this.setStatus("leader");

    // Announce leadership to other nodes immediately
    void broadcast(this.env, this, {
      action: "AppendEntries",
      term: this.term,
      leader: this.nodeId,
    });

    // Keep establishing authority
    this.timeoutId = setInterval(() => {
      void broadcast(this.env, this, {
        action: "AppendEntries",
        term: this.term,
        leader: this.nodeId,
      });
    }, HEARTBEAT_INTERVAL);
  }
}

export function isDev(env: Pick<Env, "DEVELOPMENT">): boolean {
  return Boolean(env.DEVELOPMENT);
}

export function getStub(
  env: Env,
  clusterId: string,
  nodeId: NodeId
): DurableObjectStub {
  const doId = env.nodes.idFromName(`node:${clusterId}:${nodeId}`);
  return env.nodes.get(doId);
}

// Timeout (in ms) applied to individual RPC requests. If responses don't arrive
// within this time, the node is considered lost.
const RPC_TIMEOUT = 2000;

// Timeout (in ms) the leader re-establishes its authority.
// This must be lower than all possible election timeouts, just so that heartbeats
// are guaranteed to reach other nodes quicker than their randomized election timeouts
// time out.
const HEARTBEAT_INTERVAL = 150;

/**
 * Returns a random timeout (in ms) to be used as an election timeout
 */
function randomElectionTimeout(): number {
  // Set up a safe lower limit. DO timers aren't super precise, so adding this
  // additional padding makes sure that there isn't aren't constant re-elections
  // in cases when the random number is low.
  const lowerLimit = HEARTBEAT_INTERVAL * 4;
  return lowerLimit + Math.floor(Math.random() * lowerLimit);
}

/**
 * Sets a deadline on a provided promise. If the promise resolves before the deadline,
 * its result is returned, otherwise an error.
 * Inspired by tokio::time::timeout
 *
 * @param ms Time (in ms) to wait for the Promise to resolve
 * @param promise The Promise to resolve
 */
async function setDeadline<T>(
  ms: number,
  promise: Promise<T>
): Promise<Result<T, void>> {
  const result = await Promise.race([
    sleep(ms).then(() => Symbol("sleep")),
    promise,
  ]);

  if (typeof result === "symbol") {
    return Err(undefined);
  }

  return Ok(result);
}

/**
 * Returns a Promise that only resolves after a specified time
 *
 * @param ms Time (in ms)
 */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Broadcasts a message to all Nodes
 */
function broadcast(
  env: Env,
  from: Node,
  msg: NodeMessage,
  abort?: AbortController
): Promise<Array<Result<NodeMessage, Error>>> {
  return Promise.all(
    NodeIds.filter((id) => id !== from.nodeId).map((id) =>
      send(env, from, id, msg, abort)
    )
  );
}

/**
 * Sends a message to a specific Node
 */
async function send(
  env: Env,
  from: Node,
  to: NodeId,
  msg: NodeMessage,
  abort: AbortController = new AbortController()
): Promise<Result<NodeMessage, Error>> {
  console.log(`${new Date().toISOString()}`, `[${from.nodeId}] -> ${to}`, msg);

  const node = getStub(env, from.clusterId, to);
  const response = await setDeadline(
    RPC_TIMEOUT,
    node.fetch("http://raft.node", {
      method: "PUT",
      body: serialize(msg),
      headers: { Authorization: env.nodeSecret },
      signal: abort.signal,
    })
  );

  if (response.err) {
    abort.abort();
    console.log(
      `${new Date().toISOString()}`,
      `[${from.nodeId}] -> ${to}`,
      "Send timed out",
      msg
    );
    return Err(new Error("Timeout"));
  }

  if (response.val.status !== 200) {
    console.log(
      `${new Date().toISOString()}`,
      `[${from.nodeId}] -> ${to}`,
      "Send received non-200",
      msg,
      response.val.status,
      await response.val.text()
    );
    return Err(new Error("Non-200 response"));
  }

  const data = await response.val.arrayBuffer();
  return deserialize<NodeMessage>(data);
}
