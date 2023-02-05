import type { NodeId, NodeStatus } from "@raft/common";
import clsx from "clsx";
import { CrownSimple } from "phosphor-react";
import { useNode } from "../hooks/useNode";

type Props = {
  id: NodeId;
  position: { top?: number; bottom?: number; left?: number; right?: number };
};

export const NodeControls = ({
  id,
  position: { top, bottom, left, right },
}: Props) => {
  const { status, setStatus } = useNode(id);

  return (
    <button
      id={id}
      className="absolute"
      style={{
        top: top ? `${top}%` : undefined,
        bottom: bottom ? `${bottom}%` : undefined,
        left: left ? `${left}%` : undefined,
        right: right ? `${right}%` : undefined,
      }}
      onClick={() => {
        setStatus(status === "offline" ? "follower" : "offline");
      }}
    >
      <Indicator status={status} />
      <Controls />
    </button>
  );
};

type IndicatorProps = { status: NodeStatus | undefined };
const Indicator = ({ status }: IndicatorProps) => {
  return (
    <>
      <div
        className={clsx(
          "absolute top-0 left-0",
          "w-4 h-4 -translate-x-2 -translate-y-2",
          "rounded-full shadow-sm border",
          {
            "bg-red-500 border-red-300": status === "offline",
            "bg-green-500 border-green-300":
              status === "follower" || status === "candidate",
            "bg-yellow-500 border-yellow-300": status === "leader",
            "bg-gray-500 border-gray-300": !status,
          }
        )}
      />
      {status === "leader" && (
        <CrownSimple
          width={12}
          height={12}
          weight="fill"
          className="absolute -top-5 -left-1.5 text-yellow-500"
        />
      )}
      <div
        className={clsx(
          "absolute top-0 left-0",
          "w-7 h-7 -translate-x-3.5 -translate-y-3.5",
          "rounded-full opacity-20",
          {
            "bg-red-500": status === "offline",
            "bg-green-500": status === "follower",
            "bg-yellow-500": status === "leader",
          }
        )}
      />
    </>
  );
};

type ControlsProps = {};
const Controls = ({}: ControlsProps) => {
  return null;
};
