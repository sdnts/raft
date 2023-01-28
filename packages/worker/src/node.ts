import { Env, isDev, NodeId } from ".";
import { signCookie } from "./cookie";

type Metadata = {
  state: "leader" | "follower" | "candidate" | "offline";
  term: number;
};

export class Node implements DurableObject {
  #env: Env;
  #storage: DurableObjectStorage;

  constructor(state: DurableObjectState, env: Env) {
    this.#env = env;
    this.#storage = state.storage;
  }

  async fetch(request: Request) {
    const upgrade = request.headers.get("Upgrade");
    if (!upgrade || upgrade !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const url = new URL(request.url);
    const [, clusterId, nodeId] = url.pathname.split("/") as [
      "",
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

    return this.client(clusterId);
  }

  /**
   * Starts a WebSocket connection with an unauthenticated client, which is usually
   * the UI
   */
  async client(clusterId: string): Promise<Response> {
    const { 0: clientWs, 1: serverWs } = new WebSocketPair();

    const abortController = new AbortController();
    serverWs.addEventListener(
      "open",
      (e) => {
        console.log("Opened");
      },
      { signal: abortController.signal }
    );

    serverWs.addEventListener(
      "message",
      (event) => {
        console.log("Message", event.data);
      },
      { signal: abortController.signal }
    );

    serverWs.addEventListener("error", (e) => {
      console.error("Error", e);
      abortController.abort();
    });

    serverWs.accept();
    serverWs.send(clusterId!);

    return new Response(null, {
      status: 101,
      webSocket: clientWs,
      headers: {
        "Set-Cookie": [
          `cluster=${await signCookie(clusterId, this.#env)}`,
          isDev(this.#env) ? "Domain=localhost" : `Domain=raft.sdnts.dev`,
          `Path=/`,
          "HttpOnly",
        ].join("; "),
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
