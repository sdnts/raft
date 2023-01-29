import { pack, unpack } from "msgpackr";
import { Err, Ok, Result } from "ts-results-es";

export const NodeIds = [
  "us1", // San Jose
  // "us2", // Ashburn
  "eu1", // London
  // "eu2", // Frankfurt
  // "eu3", // Madrid
  "ap1", // Singapore
  // "ap2", // Tokyo
  // "ap3", // New Delhi
  // "af1", // Cape Town
  // "sa1", // Sao Paolo
  // "oc1", // Sydney
] as const;
export type NodeId = (typeof NodeIds)[number];

export type NodeState = "leader" | "follower" | "candidate" | "offline";

// Messages exchanged between a Client and a Node
export type ClientMessage =
  | { action: "Welcome"; clusterId: string; nodeId: NodeId; state: NodeState }
  | { action: "SetState"; clusterId: string; nodeId: NodeId; state: NodeState };

// Messages exchanged between Nodes
export type NodeMessage = { action: "Heartbeat" } | { action: "RequestVote" };

export function serialize<T extends ClientMessage | NodeMessage>(
  msg: T
): ArrayBuffer {
  return pack(msg);
}

export function deserialize<T extends ClientMessage | NodeMessage>(
  msg: ArrayBuffer
): Result<T, Error> {
  try {
    return Ok(unpack(new Uint8Array(msg)));
  } catch (e) {
    return Err(e as Error);
  }
}
