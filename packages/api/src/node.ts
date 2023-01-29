import {
  ClientMessage,
  deserialize,
  NodeId,
  NodeState,
  serialize,
} from "@raft/common";
import { Env, isDev } from ".";
import { signCookie } from "./cookie";

type Metadata = {
  term: number;
};

// Maximum allowed time of inactivity (in ms), after which the DO is automatically
// shut down to save costs
const INACTIVITY_TIMEOUT = 5000;

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
  private env: Env;
  private storage: DurableObjectStorage;

  // WebSocket connections to all connection clients
  private clients: WebSocket[];
  // WebSocket connections to all other nodes in its cluster, mapped by the name of the node
  private nodes: Map<NodeId, WebSocket>;

  constructor(state: DurableObjectState, env: Env) {
    this.env = env;
    this.storage = state.storage;
    this.clients = [];
    this.nodes = new Map();
  }

  async fetch(request: Request) {
    const upgrade = request.headers.get("Upgrade");
    if (!upgrade || upgrade !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const url = new URL(request.url);
    const [_, clusterId, nodeId] = url.pathname.split("/") as [
      never,
      string,
      NodeId
    ];

    if (!clusterId || !nodeId) {
      return new Response(
        "Bad request: `clusterId` and `nodeId` are required",
        {
          status: 400,
        }
      );
    }

    const authorization = request.headers.get("Authorization");
    if (authorization) {
      return this.node(authorization);
    }

    return this.newClient(clusterId, nodeId);
  }

  alarm(): void {
    try {
      console.log("Killing");
      this.clients.forEach((ws) => ws.close(1001, "Inactivity"));
      this.nodes.forEach((ws) => ws.close(1001, "Inactivity"));
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Starts a WebSocket connection with an unauthenticated client, which is usually
   * the UI
   */
  async newClient(clusterId: string, nodeId: NodeId): Promise<Response> {
    const { 0: clientWs, 1: serverWs } = new WebSocketPair();

    const abortController = new AbortController();

    serverWs.addEventListener(
      "message",
      async (event) => {
        const msg = deserialize<ClientMessage>(
          new Uint8Array(event.data as ArrayBuffer)
        );
        if (msg.err) {
          return;
        }

        if (msg.val.clusterId !== clusterId || msg.val.nodeId !== nodeId) {
          return;
        }

        console.log("Incoming", msg);
        await this.storage.setAlarm(Date.now() + INACTIVITY_TIMEOUT);

        switch (msg.val.action) {
          case "SetState": {
            void this.storage.put<NodeState>(`_meta:state`, msg.val.state);
            this.clients.forEach((ws) => {
              if (ws !== serverWs) {
                ws.send(
                  serialize<ClientMessage>({
                    action: "SetState",
                    clusterId,
                    nodeId,
                    state: msg.val.state,
                  })
                );
              }
            });
            break;
          }
          default:
            break;
        }
      },
      { signal: abortController.signal }
    );

    serverWs.addEventListener("error", (e) => {
      console.error("Error", e);
      abortController.abort();
    });

    serverWs.addEventListener("close", (e) => {
      console.error("Close", e);
      this.clients = this.clients.filter((ws) => ws !== serverWs);
      abortController.abort();
    });

    serverWs.accept();
    this.clients.push(serverWs);
    await this.storage.setAlarm(Date.now() + INACTIVITY_TIMEOUT);

    // Send a Welcome message, but don't block on it
    this.storage.get<NodeState>(`_meta:state`).then((state) => {
      serverWs.send(
        serialize<ClientMessage>({
          action: "Welcome",
          clusterId,
          nodeId,
          state: state ?? "follower",
        })
      );
    });

    return new Response(null, {
      status: 101,
      webSocket: clientWs,
      headers: {
        "Set-Cookie": [
          `cluster=${await signCookie(clusterId, this.env)}`,
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
   * Starts a WebSocket connection with another Node, treating it as a new follower.
   * This Node will have to authenticate itself.
   */
  async node(authorization: string): Promise<Response> {
    const { 0: nodeWs, 1: serverWs } = new WebSocketPair();
    if (authorization !== this.env.nodeSecret) {
      return new Response(null, {
        status: 403,
      });
    }

    serverWs.accept();

    const node = new AbortController();
    serverWs.addEventListener(
      "message",
      (event) => {
        console.log(event.data);
      },
      { signal: node.signal }
    );

    return new Response(null, {
      status: 101,
      webSocket: nodeWs,
    });
  }
}
