# raft

This is a demo of the Raft consensus algorithm running on [Durable Objects](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/). It replicates key-value pairs across multiple DO instances, which otherwise have their own isolated storage.

The DO instances themselves are geographically distributed. There are currently 7 of them: San Jose (us1), Ashburn (us2), London (eu1), Frankfurt (eu2), Madrid (eu3), Singapore (ap1) and Tokyo (ap2). The distributed nature of them doesn't actually matter, I just did it to be able to distinguish them.

The demo lets you see which instance is the current leader, and lets you modify the "database" from that instance. Other instances see these updates soon after. You can also turn any instance "off" at any time, watch its storage go out of date, then turn it back on to see it catch up. Raft guarantees that you can safely turn off 50% of the instances and still maintain data integrity.

### Implementation Notes

To allow a somewhat "personal" playground,
