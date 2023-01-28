import type { ClientMessage, NodeState } from "@raft/common";
import { pack } from "msgpackr";
import { useState } from "react";
import { useCluster } from "./useCluster";
import { useWebSocket } from "./useWebsocket";

const URL = import.meta.env.DEV
  ? "ws://localhost:8787"
  : "wss://api.raft.sdnts.dev";

export function useNode(id: string) {
  let [state, setState] = useState<NodeState>();
  let clusterId = useCluster((state) => state.id);
  let setClusterId = useCluster((state) => state.setId);
  let ws = useWebSocket(`${URL}/${id}`, {
    onMessage(msg) {
      console.log("WS message", msg);

      switch (msg.action) {
        case "Cluster": {
          setState(msg.state);
          if (!clusterId) {
            setClusterId(msg.id);
          }
          break;
        }
        case "SetState": {
          break;
        }
        default:
          break;
      }
    },
  });

  return {
    state,
    setState(state: NodeState) {
      const msg: ClientMessage = { action: "SetState", state };
      ws.current?.send(pack(msg));
      setState(state);
    },
  };
}
