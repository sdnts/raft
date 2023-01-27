import clsx from "clsx";
import { CrownSimple } from "phosphor-react";
import { useNode } from "~/hooks/useNode";

type Props = {
  id: string;
  position: { top: number; left: number };
};

export const NodeControls = ({ id, position: { top, left } }: Props) => {
  const { state, setState } = useNode(id);

  return (
    <button
      id={id}
      className="absolute"
      style={{
        top: `${top}%`,
        left: `${left}%`,
      }}
      onClick={() => {
        if (state === "offline") {
          setState("follower");
        } else {
          setState("offline");
        }
      }}
    >
      <div
        className={clsx(
          "absolute top-0 left-0",
          "w-4 h-4 -translate-x-2 -translate-y-2",
          "rounded-full shadow-sm border",
          {
            "bg-red-500 border-red-300": state === "offline",
            "bg-green-500 border-green-300": state === "follower",
            "bg-yellow-500 border-yellow-300": state === "leader",
          }
        )}
      />
      {state === "leader" && (
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
            "bg-red-500": state === "offline",
            "bg-green-500": state === "follower",
            "bg-yellow-500": state === "leader",
          }
        )}
      />
    </button>
  );
};
