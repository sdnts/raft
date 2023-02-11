import { Question } from "phosphor-react";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

export const Help = () => {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Icon label="Help">
          <Question
            width={24}
            height={24}
            className="text-white transition-opacity opacity-25 hover:opacity-100"
          />
        </Icon>
      </Dialog.Trigger>

      <Dialog.Content title="About">
        This is a demo implementation of the{" "}
        <a
          href="https://raft.github.io"
          target="_blank"
          className="underline underline-offset-4"
        >
          Raft
        </a>{" "}
        consensus algorithm running on Cloudflare's{" "}
        <a
          href="https://developers.cloudflare.com/workers/runtime-apis/durable-objects/"
          target="_blank"
          className="underline underline-offset-4"
        >
          Durable Objects
        </a>
        . Each instance of the Durable Object is treated as a standalone
        "server", and they together form a cluster that is unique & isolated to
        this browser.
        <br />
        <br />
        Each server is represented by a marker on the world map. Healthy servers
        are colored green, unhealthy ones are red, and the cluster leader is
        yellow. You have full control of the cluster, and can turn individual
        servers on and off by clicking on them. If you turn off the leader, a
        new one is elected automatically. Raft ensures that the cluster can
        tolerate up to 5 server failures, since there are 11 in total.
        <br />
        <br />
        This demo only implements leader election currently. Log replication
        will arrive soon.
        <br />
        <br />
        <a
          href="https://github.com/sdnts/raft"
          target="_blank"
          className="underline underline-offset-4"
        >
          Source on GitHub
        </a>
      </Dialog.Content>
    </Dialog.Root>
  );
};
