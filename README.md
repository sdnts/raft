# raft

(Disclaimer: this is a WIP, so this README is aspirational, AKA what I _want_ to
do with this experiment, not necessarily what is implemented. Only leader election works currently.)

This is a demo of the [Raft consensus algorithm](https://raft.github.io/) running on [Durable Objects](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/). It replicates key-value pairs across multiple DO instances, which otherwise have their own isolated storage.

The DO instances themselves aren't _actually_ geographically distributed, but displaying them as such makes distinguishing them easier. They might as well be though, Raft don't care.

The demo lets you see which instance is the current leader, and lets you modify the "database" from that instance. Other instances see these updates soon after. You can also turn any instance "off" at any time, watch its storage go out of date, then turn it back on to see it catch up. Raft guarantees that you can safely turn off <50% of the instances and still maintain data integrity. In this case, this means that 5 / 11 instances can
be turned off without causing a ruckus.

### Implementation Notes

To allow a somewhat "personal" playground, every session gets a unique signed cookie, which means that opening up the [website](https://raft.sdnts.dev) on multiple tabs of the same browser connects you to the same cluster.

A WebSocket connection is maintained by the client (the UI) with all 11 Durable Objects. To keep things simple, DOs don't connect to each other over WebSockets. Instead, DOs send each other good ol' `fetch` requests to communicate.

As soon as the first browser connects, it schedules a leader election with a random timeout. This happens on all 11 DOs. One of the DOs eventually wins the election and is declared the leader.

When the last client disconnects, it cancels all pending `fetch` requests between DOs, which essentially causes the cluster to "shut down".

A major problem right now is that the Workers runtime enforces a maximum of 1000 subrequests, which means that after 1000 messages, DOs get killed. Because Raft enforces a lot of gossip between nodes, this means that clusters are forcibly killed after about ~3 minutes. This is fine for a demo.

Log replication is yet to be implemented.
