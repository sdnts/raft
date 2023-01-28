import { useState } from "react";
import { useCluster } from "./useCluster";
import { useWebSocket } from "./useWebsocket";

export type NodeState = "leader" | "follower" | "offline";

export function useNode(id: string) {
  let [state, setState] = useState<NodeState>("follower");
  let clusterId = useCluster((state) => state.id);
  let setClusterId = useCluster((state) => state.setId);
  let ws = useWebSocket(`ws://localhost:8787/${id}`, {
    onOpen(e) {
      console.log("WS open", e);
    },
    onMessage(e) {
      console.log("WS message", e);
      if (!clusterId) {
        setClusterId(e.data);
      }
    },
  });

  return {
    state,
    setState(s: NodeState) {
      setState(s);
    },
  };
}
