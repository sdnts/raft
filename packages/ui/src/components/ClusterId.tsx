import clsx from "clsx";
import { Check } from "phosphor-react";
import { useState } from "react";
import { useCluster } from "../hooks/useCluster";
import { HoverCard } from "./HoverCard";
import { Icon } from "./Icon";

export function ClusterId() {
  const id = useCluster((state) => state.id);
  const [copied, setCopied] = useState(false);

  return (
    <button
      className={clsx("flex items-center", "mt-12")}
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
      <HoverCard.Root>
        <HoverCard.Trigger>
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
        </HoverCard.Trigger>

        <HoverCard.Content side="top" className="max-w-md">
          <div>
            This is your Cluster ID. <br />A Cluster ID is a unique identifier
            for this specific Raft cluster. It is stored in a cookie, which
            means that if you visit{" "}
            <a
              href={window.location.toString()}
              target="_blank"
              className="underline underline-offset-4"
            >
              this page
            </a>{" "}
            in a new tab, you will automatically start talking to the same
            cluster. <br />
            <br />
            Please don't store sensitive / non-ephemeral data in clusters, they
            are automatically wiped every 7 days.
          </div>
        </HoverCard.Content>
      </HoverCard.Root>

      {copied && (
        <Icon label="Copy successful">
          <Check className="ml-3 text-green-300 animate-smallSlideUp" />
        </Icon>
      )}
    </button>
  );
}
