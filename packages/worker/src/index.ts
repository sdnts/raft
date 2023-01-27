export interface Env {
  nodes: DurableObjectNamespace;
}

export type Region =
  | "us1" // San Jose
  | "us2" // Ashburn
  | "eu1" // London
  | "eu2" // Frankfurt
  | "eu3" // Madrid
  | "ap1" // Singapore
  | "ap2"; // Tokyo

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const region = url.hostname.split(".")[0] as Region;
    const id = env.nodes.idFromName(`dev:${region}`);
    const stub = env.nodes.get(id);

    return stub.fetch("http://raft.node", request as any);
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
