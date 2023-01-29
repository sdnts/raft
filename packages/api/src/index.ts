import { NodeId, NodeIds } from "@raft/common";
import { ulidFactory } from "ulid-workers";
import { verifyCookie } from "./cookie";
import { getStub } from "./node";

export interface Env {
  nodes: DurableObjectNamespace;
  DEVELOPMENT?: string;

  // Secrets
  cookieSecret: string;
  nodeSecret: string;
}

const ulid = ulidFactory();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const upgrade = request.headers.get("Upgrade");
    if (!upgrade || upgrade !== "websocket") {
      return new Response(
        "Bad Request: Only WebSocket upgrade requests are allowed",
        { status: 426 }
      );
    }

    const url = new URL(request.url);
    const nodeId = url.pathname.split("/")[1] as NodeId;

    if (!NodeIds.includes(nodeId)) {
      return new Response("Bad Request: Unrecognized nodeId", { status: 400 });
    }

    let clusterId: string;

    const cookie = request.headers.get("Cookie");
    if (cookie) {
      const verification = await verifyCookie(cookie, env);
      if (verification.ok) {
        clusterId = verification.val;
      } else {
        // TODO: Handle tampered-with cookies
        clusterId = ulid();
      }
    } else {
      clusterId = ulid();
    }

    return getStub(env, clusterId, nodeId).fetch("http://raft.node", {
      headers: {
        upgrade: upgrade,
        "x-cluster-id": clusterId,
        "x-node-id": nodeId,
      },
    });
  },
};

export { Node } from "./node";
