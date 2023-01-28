import { ClientMessage, NodeState } from "@raft/common";
import { pack, unpack } from "msgpackr";
import { Env, isDev, NodeId } from ".";
import { signCookie } from "./cookie";

type Metadata = {
  term: number;
};

export class Node implements DurableObject {
  #env: Env;
  #ctx: ExecutionContext;
  #storage: DurableObjectStorage;

  constructor(state: DurableObjectState, env: Env, ctx: ExecutionContext) {
    this.#env = env;
    this.#ctx = ctx;
    this.#storage = state.storage;
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

    return this.client(clusterId, nodeId);
  }

  /**
   * Starts a WebSocket connection with an unauthenticated client, which is usually
   * the UI
   */
  async client(clusterId: string, nodeId: string): Promise<Response> {
    const { 0: clientWs, 1: serverWs } = new WebSocketPair();

    const abortController = new AbortController();

    serverWs.addEventListener(
      "message",
      (event) => {
        const msg: ClientMessage = unpack(
          new Uint8Array(event.data as ArrayBuffer)
        );
        console.log("Incoming", msg);

        switch (msg.action) {
          case "Cluster": {
            break;
          }
          case "SetState": {
            this.#storage.put<NodeState>(`${clusterId}:_meta:state`, msg.state);
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

    serverWs.accept();

    // Send a Welcome message, but don't block
    this.#storage.get<NodeState>(`${clusterId}:_meta:state`).then((state) => {
      const msg: ClientMessage = {
        action: "Cluster",
        id: clusterId,
        state: state ?? "follower",
      };
      serverWs.send(pack(msg));
    });

    return new Response(null, {
      status: 101,
      webSocket: clientWs,
      headers: {
        "Set-Cookie": [
          `cluster=${await signCookie(clusterId, this.#env)}`,
          isDev(this.#env) ? "Domain=localhost" : `Domain=raft.sdnts.dev`,
          `Path=/`,
          "HttpOnly",
          isDev(this.#env) ? "Secure" : undefined,
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
    if (authorization !== this.#env.nodeSecret) {
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
