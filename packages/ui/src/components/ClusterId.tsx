import clsx from "clsx";
import { Check } from "phosphor-react";
import { useState } from "react";
import { useCluster } from "../hooks/useCluster";
import { Icon } from "./Icon";

export function ClusterId() {
  const id = useCluster((state) => state.id);
  const [copied, setCopied] = useState(false);

  return (
    <div
      className={clsx("flex items-center", "mt-8")}
      onClick={() => {
        if (id) {
          navigator.clipboard
            .writeText(`https://raft.sdnts.dev/${id}`)
            .then(() => {
              setCopied(true);
              setTimeout(() => {
                setCopied(false);
              }, 3000);
            });
        }
      }}
    >
      <span
        className={clsx(
          "text-white text-sm",
          "transition-opacity opacity-25 hover:opacity-100",
          "cursor-pointer",
          {
            "opacity-0": !id,
          }
        )}
      >
        {id ?? "..."}
      </span>

      {copied && (
        <Icon label="Copy successful">
          <Check className="ml-3 text-green-300 animate-smallSlideUp" />
        </Icon>
      )}
    </div>
  );
}
