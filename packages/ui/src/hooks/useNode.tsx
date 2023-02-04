import { ClientMessage, NodeId, NodeStatus, serialize } from "@raft/common";
import { useState } from "react";
import { useCluster } from "./useCluster";
import { useWebSocket } from "./useWebsocket";

const URL = import.meta.env.DEV
  ? "ws://localhost:8787"
  : "wss://api.raft.sdnts.dev";

export function useNode(id: NodeId) {
  let [status, setStatus] = useState<NodeStatus>();
  let clusterId = useCluster((state) => state.id);
  let setClusterId = useCluster((state) => state.setId);
  let ws = useWebSocket(`${URL}/${id}`, {
    onMessage(msg) {
      if (msg.nodeId !== id) {
        return;
      }

      switch (msg.action) {
        case "Welcome": {
          console.log(`[${id}]`, "Connected", msg.status);

          setStatus(msg.status);

          if (!clusterId) {
            setClusterId(msg.clusterId);
          }

          break;
        }
        case "SetStatus": {
          console.log(`[${id}]`, "Status", msg.status);
          setStatus(msg.status);
          break;
        }
        default:
          break;
      }
    },
    onClose(e) {
      console.log("Connection closed", e);
      setStatus(undefined);
    },
  });

  return {
    status,
    setStatus(state: NodeStatus) {
      if (!clusterId) {
        return;
      }

      ws.current?.send(
        serialize<ClientMessage>({
          action: "SetStatus",
          clusterId,
          nodeId: id,
          status: state,
        })
      );
      setStatus(state);
    },
  };
}
