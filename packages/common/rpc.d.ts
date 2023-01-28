export type NodeState = "leader" | "follower" | "candidate" | "offline";
export type ClientMessage =
  | { action: "Cluster"; id: string; state: NodeState }
  | { action: "SetState"; state: NodeState };
