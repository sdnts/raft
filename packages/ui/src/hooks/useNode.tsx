import { ClientMessage, NodeId, NodeState, serialize } from "@raft/common";
import { useState } from "react";
import { useCluster } from "./useCluster";
import { useWebSocket } from "./useWebsocket";

const URL = import.meta.env.DEV
  ? "ws://localhost:8787"
  : "wss://api.raft.sdnts.dev";

export function useNode(id: NodeId) {
  let [state, setState] = useState<NodeState>();
  let clusterId = useCluster((state) => state.id);
  let setClusterId = useCluster((state) => state.setId);
  let ws = useWebSocket(`${URL}/${id}`, {
    onMessage(msg) {
      if (msg.nodeId !== id) {
        return;
      }

      console.log("Incoming", msg);
      switch (msg.action) {
        case "Welcome": {
          setState(msg.state);
          if (!clusterId) {
            setClusterId(msg.clusterId);
          }
          break;
        }
        case "SetState": {
          setState(msg.state);
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
      if (!clusterId) {
        return;
      }

      ws.current?.send(
        serialize<ClientMessage>({
          action: "SetState",
          clusterId,
          nodeId: id,
          state,
        })
      );
      setState(state);
    },
  };
}
