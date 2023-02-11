import { useState } from "react";
import { ClientMessage, NodeId, NodeStatus, serialize } from "../rpc";
import { useCluster } from "./useCluster";
import { useWebSocket } from "./useWebsocket";

const URL = import.meta.env.DEV
  ? "ws://localhost:8787"
  : "wss://api.raft.sdnts.dev";

export function useNode(id: NodeId) {
  const clusterId = useCluster((state) => state.id);
  const setClusterId = useCluster((state) => state.setId);
  const clusterSize = useCluster((state) => state.size);
  const offCount = useCluster((state) => state.off);
  const incrementOff = useCluster((state) => state.incrementOff);
  const decrementOff = useCluster((state) => state.decrementOff);

  const [status, setStatus] = useState<NodeStatus>();

  const ws = useWebSocket(`${URL}/${id}`, {
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
    setStatus(s: NodeStatus) {
      // If cluster is uninitialized, don't allow status changes
      if (clusterId === undefined) {
        return false;
      }

      // If disconnected from cluster, don't allow status changes
      if (status === undefined) {
        return false;
      }

      if (s === "offline") {
        // If cluster will destabilize by turning node off, don't allow status change
        if (offCount >= Math.floor(clusterSize / 2)) {
          // TODO: addToast(
          //   "Disabling another node will destabilize the cluster",
          //   "Raft clusters can only tolerate a limited number of nodes being offline. Turn another node on to be able to turn this one off."
          // );
          return false;
        }

        incrementOff();
      } else if (s === "follower") {
        decrementOff();
      } else {
        // Clients are not allowed to collude in elections
        return false;
      }

      ws.current?.send(
        serialize<ClientMessage>({
          action: "SetStatus",
          clusterId,
          nodeId: id,
          status: s,
        })
      );
      setStatus(s);

      return true;
    },
  };
}
