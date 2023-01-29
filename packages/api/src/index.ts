import { NodeId, NodeIds } from "@raft/common";
import { ulidFactory } from "ulid-workers";
import { verifyCookie } from "./cookie";

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

    const doId = env.nodes.idFromName(`dev:${clusterId}:${nodeId}`);
    const doStub = env.nodes.get(doId);
    return doStub.fetch(
      `http://raft.node/${clusterId}/${nodeId}`,
      request as any
    );
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      new Promise<void>((r) => {
        console.log("ScheduledEvent");
        r();
      })
    );
  },
};

export { Node } from "./node";

export function isDev(env: Pick<Env, "DEVELOPMENT">): boolean {
  return Boolean(env.DEVELOPMENT);
}
