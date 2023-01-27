import { Env } from ".";

export class Node implements DurableObject {
  #storage: DurableObjectStorage;
  #ns: DurableObjectNamespace;

  constructor(private state: DurableObjectState, private env: Env) {
    this.#storage = state.storage;
    this.#ns = env.nodes;
  }

  async fetch(request: Request) {
    await this.#storage.delete("_meta:region");
    return new Response(`Hello!`);
  }
}
