import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "phosphor-react";
import { useState } from "react";
import { useCluster } from "../hooks/useCluster";
import { Icon } from "./Icon";
import { Tooltip } from "./Tooltip";

export function ClusterId() {
  const id = useCluster((state) => state.id);
  const [copied, setCopied] = useState(false);

  return (
    <Tooltip.Provider>
      <div className="flex items-center mt-12">
        <Tooltip.Root>
          <Tooltip.Trigger>
            <button
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
                  "transition-opacity",
                  {
                    "opacity-0": !id,
                  }
                )}
              >
                {id ?? "···"}
              </span>
            </button>
          </Tooltip.Trigger>

          <Tooltip.Content>
            This is your Cluster ID. <br />A Cluster ID is a unique identifier
            for this specific Raft cluster. It is stored in a cookie, which
            means that if you visit{" "}
            <a
              href="/"
              target="_blank"
              className="underline underline-offset-4"
            >
              this page
            </a>{" "}
            in a new tab, you will automatically start talking to the same
            cluster. <br />
            <br />
            Please don't store sensitive / non-ephemeral data in clusters, they
            are public & are automatically wiped every 7 days.
          </Tooltip.Content>
        </Tooltip.Root>

        <AnimatePresence>
          {copied && (
            <motion.div
              initial={{ opacity: 0, translateY: "0.5rem" }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: "-0.5rem" }}
              transition={{ duration: 0.1 }}
            >
              <Icon label="Copy successful">
                <Check className="ml-3 text-green-300" />
              </Icon>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Tooltip.Provider>
  );
}
