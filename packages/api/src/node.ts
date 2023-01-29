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
const RPC_TIMEOUT = 1000;

// Returns a random timeout (in ms) to be used as an election timeout
function randomElectionTimeout(): number {
  return 500 + Math.floor(Math.random() * 500);
}

async function setDeadline<T>(
  promise: Promise<T>,
  ms: number
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * A Node is a single DO in a Cluster.
 * Multiple new instances of this DO are created for every cluster that the UI sees,
 * making each Node truly isolated from all other nodes in all other clusters.
 * Every Node also maintains a WebSocket connection with all other Nodes in its
 * cluster that it uses for all gossip traffic.
 * Nodes are capable of shutting themselves down when client traffic stops, which
 * makes clusters cheap to create and run.
 */
export class Node implements DurableObject {
  private clusterSize = NodeIds.length;
  private clusterId!: string;
  private nodeId!: NodeId;

  // WebSocket connections to all connected clients
  private clients: Set<WebSocket> = new Set();

  private status: NodeStatus = "follower";

  // Current election term
  private term: number = 0;
  // Who did we vote for in this term?
  private votedFor?: NodeId;

  // TimeoutIds returned by `setTimeout` / `setInterval`
  private electionTimeoutId: number = 0;

  constructor(private state: DurableObjectState, private env: Env) { }

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
      return this.gossip(await request.arrayBuffer());
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
          case "SetState": {
            switch (msg.val.status) {
              case "offline":
                clearInterval(this.electionTimeoutId); // Cancel heartbeats (if leader)
                clearTimeout(this.electionTimeoutId); // Cancel any elections (if candidate)
                break;
              case "follower":
                break;
              default:
                // Clients are not allowed to collude in elections
                return;
            }

            this.status = msg.val.status;

            // Broadcast status to other clients
            this.clients.forEach((ws) => {
              if (ws !== myHalf) {
                ws.send(
                  serialize<ClientMessage>({
                    action: "SetState",
                    clusterId: this.clusterId,
                    nodeId: this.nodeId,
                    status: msg.val.status,
                  })
                );
              }
            });
            break;
          }
        }
      },
      { signal: abortController.signal }
    );

    myHalf.addEventListener(
      "error",
      (e) => {
        console.error("Error", e);
        abortController.abort();

        // Make sure to stop heartbeats so the DO can shut down
        this.clients.delete(myHalf);
        clearTimeout(this.electionTimeoutId);
      },
      { signal: abortController.signal }
    );

    myHalf.addEventListener(
      "close",
      (e) => {
        console.error("Close", e);
        abortController.abort();

        // Make sure to stop heartbeats so the DO can shut down
        this.clients.delete(myHalf);
        clearTimeout(this.electionTimeoutId);
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
      this.electionTimeoutId = setTimeout(() => {
        console.log(
          `${new Date().toISOString()}`,
          `[${this.nodeId}]`,
          "Waking up cluster"
        );
        this.startElection();
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

  /*
   * Handle a message from another Node
   */
  async gossip(body: ArrayBuffer): Promise<Response> {
    const msg = deserialize<NodeMessage>(body);
    if (msg.err) {
      return new Response(msg.val.message, { status: 400 });
    }

    if (this.status === "offline") {
      console.log(
        `${new Date().toISOString()}`,
        `[${this.nodeId}]`,
        "I am offline"
      );
      return new Response(null, { status: 503 });
    }

    switch (msg.val.action) {
      case "AppendEntries":
        console.log(
          `${new Date().toISOString()}`,
          `[${this.nodeId}] <-`,
          msg.val
        );

        if (msg.val.term < this.term) {
          // Some old leader thinks they can just waltz in and steal the show.
          return new Response(null, { status: 400 });
        }

        // Acknowledge an existing leader
        if (this.status === "leader" || this.status === "candidate") {
          console.log(
            `${new Date().toISOString()}`,
            `[${this.nodeId}]`,
            "Stepping down",
            `status = ${this.status}`
          );

          // Stop leadership announcements
          clearInterval(this.electionTimeoutId);
          this.clients.forEach((client) => {
            client.send(
              serialize<ClientMessage>({
                action: "SetState",
                clusterId: this.clusterId,
                nodeId: this.nodeId,
                status: "follower",
              })
            );
          });
        }

        this.status = "follower";
        this.term = msg.val.term;
        this.votedFor = undefined;

        // Schedule an election if another AppendEntries does not come in time
        clearTimeout(this.electionTimeoutId);
        const electionTimeout = randomElectionTimeout();
        this.electionTimeoutId = setTimeout(() => {
          console.log(
            `${new Date().toISOString()}`,
            `[${this.nodeId}]`,
            "AppendEntries is late"
          );
          this.startElection();
        }, electionTimeout);

        const res: NodeMessage = {
          action: "Appended",
          term: this.term,
        };
        console.log(
          `${new Date().toISOString()}`,
          `[${this.nodeId}] -> ${msg.val.leader}`,
          res,
          `electionTimeout = ${electionTimeout}`
        );
        return new Response(serialize<NodeMessage>(res), { status: 200 });

      case "RequestVote":
        console.log(
          `${new Date().toISOString()}`,
          `[${this.nodeId}] <-`,
          msg.val
        );

        if (msg.val.term > this.term) {
          // A newer term has started and is in the election phase

          // Cancel our election and vote for this candidate
          this.status = "follower";
          this.term = msg.val.term;
          this.votedFor = msg.val.candidateId;

          const res: NodeMessage = {
            action: "Vote",
            granted: true,
            term: this.term,
          };
          console.log(
            `${new Date().toISOString()}`,
            `[${this.nodeId}] -> ${msg.val.candidateId}`,
            res
          );
          return new Response(serialize<NodeMessage>(res), { status: 200 });
        } else if (msg.val.term < this.term) {
          // An older term's candidate is asking for votes, do not grant
          const res: NodeMessage = {
            action: "Vote",
            granted: false,
            term: this.term,
          };
          console.log(
            `${new Date().toISOString()}`,
            `[${this.nodeId}] -> ${msg.val.candidateId}`,
            res
          );
          return new Response(serialize<NodeMessage>(res), { status: 200 });
        } else {
          // Another candidate in the same term is asking for votes, vote if we
          // haven't already voted

          let granted;
          if (this.votedFor === undefined) {
            this.votedFor = msg.val.candidateId;
            granted = true;
          } else {
            granted = false;
          }

          const res: NodeMessage = {
            action: "Vote",
            granted,
            term: this.term,
          };
          console.log(
            `${new Date().toISOString()}`,
            `[${this.nodeId}] -> ${msg.val.candidateId}`,
            res
          );
          return new Response(serialize<NodeMessage>(res), { status: 200 });
        }

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

  async startElection() {
    // Randomize timeout to prevent split votes
    const electionTimeout = randomElectionTimeout();

    console.log(
      `${new Date().toISOString()}`,
      `[${this.nodeId}]`,
      "Starting new election",
      `electionTimeout = ${electionTimeout}`
    );

    this.status = "candidate"; // Make yourself a candidate
    this.term++; // Start a new term
    this.votedFor = this.nodeId; // Vote for yourself

    let numVotes = 1; // Count your vote

    const voteAbortController = new AbortController();
    const votes = await setDeadline(
      this.broadcast(
        {
          action: "RequestVote",
          term: this.term,
          candidateId: this.nodeId,
        },
        voteAbortController.signal
      ),
      electionTimeout
    );

    if (votes.err) {
      // Election has timed out
      voteAbortController.abort();
      console.log(
        `${new Date().toISOString()}`,
        `[${this.nodeId}]`,
        "Election timed out",
        `term = ${this.term}`
      );
      return;
    }

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

    const minRequiredVotes = Math.floor(this.clusterSize / 2) + 1;

    if (numVotes >= minRequiredVotes) {
      console.log(
        `${new Date().toISOString()}`,
        `[${this.nodeId}]`,
        "I am the captain now",
        `term = ${this.term}`
      );

      this.status = "leader";

      // Announce leadership to other nodes immediately
      void this.broadcast({
        action: "AppendEntries",
        term: this.term,
        leader: this.nodeId,
      });

      // Keep establishing authority
      this.electionTimeoutId = setInterval(() => {
        void this.broadcast({
          action: "AppendEntries",
          term: this.term,
          leader: this.nodeId,
        });
      }, electionTimeout);

      // Update clients
      this.clients.forEach((client) => {
        client.send(
          serialize<ClientMessage>({
            action: "SetState",
            clusterId: this.clusterId,
            nodeId: this.nodeId,
            status: "leader",
          })
        );
      });
    }
  }

  broadcast(
    msg: NodeMessage,
    signal?: AbortSignal
  ): Promise<Array<Result<NodeMessage, Error>>> {
    return Promise.all(
      NodeIds.filter((id) => id !== this.nodeId).map((id) =>
        this.send(id, msg, signal)
      )
    );
  }

  async send(
    nodeId: NodeId,
    msg: NodeMessage,
    signal?: AbortSignal
  ): Promise<Result<NodeMessage, Error>> {
    console.log(
      `${new Date().toISOString()}`,
      `[${this.nodeId}] -> ${nodeId}`,
      msg
    );

    const fetchAbortController = new AbortController();
    const response = await setDeadline(
      getStub(this.env, this.clusterId, nodeId).fetch("http://raft.node", {
        method: "PUT",
        body: serialize(msg),
        headers: { Authorization: this.env.nodeSecret },
        signal: signal ?? fetchAbortController.signal,
      }),
      RPC_TIMEOUT
    );

    if (response.err) {
      fetchAbortController.abort();
      console.log(
        `${new Date().toISOString()}`,
        `[${this.nodeId}] -> ${nodeId}`,
        "Send timed out",
        msg
      );
      return Err(new Error("Timeout"));
    }

    if (response.val.status !== 200) {
      console.log(
        `${new Date().toISOString()}`,
        `[${this.nodeId}] -> ${nodeId}`,
        "Send received non-200",
        msg,
        response.val.status
      );
      return Err(new Error("Non-200 response"));
    }

    const data = await response.val.arrayBuffer();
    return deserialize<NodeMessage>(data);
  }
}
