import { useState } from "react";
import { useWebSocket } from "./useWebsocket";

export type NodeState = "leader" | "follower" | "offline";

export function useNode(id: string) {
  let [state, setState] = useState<NodeState>("follower");
  let [clusterId, setClusterId] = useState<string>();
  let ws = useWebSocket(`ws://localhost:8787/${id}`, {
    onOpen(e) {
      console.log("WS open", e);
    },
    onMessage(e) {
      console.log("WS message", e);
    },
  });

  return {
    state,
    setState(s: NodeState) {
      setState(s);
    },
  };
}
