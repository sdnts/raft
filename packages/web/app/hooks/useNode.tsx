import { useState } from "react";

export type NodeState = "leader" | "follower" | "offline";

export function useNode(id: string) {
  let [state, setState] = useState<NodeState>("follower");

  return {
    state,
    setState(s: NodeState) {
      setState(s);
    },
  };
}
