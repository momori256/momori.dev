+++
title = "Reading the Amazon Aurora Limitless Paper"
date = 2026-10-06
tags = ["database", "paper"]
+++

In this post, we'll walk through how Amazon Aurora Limitless works under the hood, based on the paper [Aurora PostgreSQL Limitless Database: Building a Highly Scalable OLTP Database](https://www.amazon.science/publications/aurora-postgresql-limitless-database-building-a-highly-scalable-oltp-database).

Rather than covering every detail of the paper, I'll focus on what I found most interesting: how Limitless implements MVCC across a distributed database.

## Amazon Aurora Limitless TL;DR

- How can we horizontally scale Aurora? Limitless answers this question by sharding data across multiple database instances.
- A Limitless database consists of routers and shards. Routers receive client queries, build query plans, and distribute work among shards. Each shard stores and processes a portion of the data.
- Conventional XID-based MVCC does not scale naturally to a distributed database because it requires global transaction information.
- Limitless instead implements time-based MVCC using Amazon Time Sync Service and Hybrid Logical Clocks (HLCs).
- Limitless can scale vertically by increasing the capacity of individual routers and shards, and horizontally by adding more of them.

## Routers and Shards

```text
                Client
                  |
                  v
        +-------------------+
        |   DNS Endpoint    |
        +-------------------+
           /             \
          v               v
    +----------+     +----------+
    | Router 1 |     | Router 2 |
    +----------+     +----------+
          |               |
          +-------+-------+
                  |
     +------------+------------+
     |            |            |
     v            v            v
+---------+  +---------+  +---------+
| Shard 1 |  | Shard 2 |  | Shard 3 |
+---------+  +---------+  +---------+
     |            |            |
     v            v            v
+---------+  +---------+  +---------+
| Storage |  | Storage |  | Storage |
| Volume  |  | Volume  |  | Volume  |
+---------+  +---------+  +---------+
```

In Limitless, customers can specify a sharding key for a table. The table is divided into partitions using hash-based partitioning, and those partitions are distributed across shards. Typically, a sharded table is divided into 256 partitions.

A Limitless database consists of two types of nodes: routers and shards. Client queries go to routers, which are load-balanced through DNS. A router stores table definitions, builds query plans, and distributes query execution among the relevant shards.

A shard is essentially a PostgreSQL database instance responsible for a portion of the data. Each shard is associated with its own storage volume in the Aurora storage service.

Both routers and shards run on Aurora Serverless v2 and can independently scale their compute capacity up and down in ACUs (Aurora Capacity Units). The number of routers and shards can also be increased to scale the database horizontally.

For example, a DB shard group configured with a maximum capacity of 1200 ACUs is initially created with 4 routers and 8 shards.

Routers also coordinate transactions. A transaction may involve a single shard or span multiple shards. Supporting these distributed transactions while preserving PostgreSQL's consistency guarantees is one of the key challenges of Limitless.

## The Challenge of XID-based MVCC

Standard PostgreSQL implements XID-based MVCC (Multi-Version Concurrency Control). Roughly speaking, when PostgreSQL updates a tuple, it doesn't overwrite the existing version. Instead, it creates a new version and stores metadata about the transactions that created and deleted each version.

Each transaction has a snapshot that determines which tuple versions are visible to it.

For example, imagine a snapshot with the following information:

- Transactions with XIDs < 1001 are complete and visible.
- Transactions with XIDs >= 1100 had not started when the snapshot was taken.
- Between 1001 and 1100, transactions 1010 and 1050 were still in progress.

Using this information, PostgreSQL can determine which tuple version is visible:

- A tuple created by XID 1000 → visible
- A tuple created by XID 1100 → invisible
- A tuple created by XID 1000 and later updated by the still-running XID 1010 → the old version is visible, while the new version is not

PostgreSQL's MVCC relies on monotonically increasing XIDs. In that sense, an XID acts somewhat like a logical clock.

This becomes difficult in a distributed system like Limitless. Obtaining a list of all in-flight transactions across all nodes requires global coordination, and the list itself can become large when many transactions are running concurrently. In addition, globally issuing monotonically increasing XIDs would require centralized coordination, potentially creating a scalability bottleneck and a single point of failure.

Limitless solves this by replacing XID-based visibility with timestamp-based visibility.

Each transaction receives a timestamp used for visibility checks. Each shard can obtain time independently, so there is no need for a centralized timestamp issuer.

Of course, things would be easy if computers always knew the exact current time. Unfortunately, clocks are not perfectly synchronized.

Limitless therefore uses Amazon Time Sync Service, which provides bounded clock uncertainty. Instead of returning one exact time, `now()` returns an interval `[earliest, latest]`. The actual current time is guaranteed to lie somewhere within this interval.

Limitless builds its time-based MVCC protocol on top of these clock bounds.

## How Time-based MVCC Works

The core visibility rule is simple:

```
T1 is visible to T2 if T1.commitTs <= T2.startTs
```

`commitTs` represents when a transaction commits and `startTs` represents the snapshot time.

The basic intuition is straightforward: if T1 committed before T2's snapshot, T2 should see T1's changes.

Limitless chooses:

```
T.startTs = now().latest
```

Choosing `commitTs`, however, is more interesting, especially when a transaction spans multiple shards.

### Distributed Transactions and Two-Phase Commit

Limitless uses two-phase commit (2PC) for distributed transactions.

Suppose a transaction modifies data on shards A and B. A router coordinates the transaction and first asks both shards to prepare. Each shard makes its prepared transaction state durable before acknowledging that it is prepared.

If every participating shard successfully prepares, the transaction can proceed toward commit. If any shard fails to prepare, the transaction is aborted and the prepared participants are rolled back.

One of the participating shards is chosen as the lead shard. The lead shard becomes the authority for the final transaction outcome. We'll see later how the lead shard is used.

The commit timestamp must be at least as large as the relevant clocks of all participating shards. At a high level:

```
commitTs >= max(participant shards' now().latest)
```

The transaction can then be committed across the participants using the 2PC protocol. However, clock uncertainty introduces another interesting problem.

### What If a Reader Is Ahead of a Shard?

Consider this example:

```
T.startTs = 60

Shard S:
now() = [20, 40]
```

Transaction `T` now wants to read from shard `S`.

Can `S` immediately return a result?

Surprisingly, no.

Suppose `S` returns the result, and shortly afterward another transaction `T'` commits on `S`:

```
T'.commitTs = 50
```

Now we have:

```
T'.commitTs = 50 <= T.startTs = 60
```

According to our visibility rule, `T` should have seen `T'`. However, `T` already completed its read before `T'` committed.

This inconsistency is possible because the clocks of different shards can temporarily be at different logical points.

One solution would be to wait until `S` catches up:

```
now().latest > T.startTs
```

Once this is true, future transactions on `S` will receive commit timestamps greater than `T`'s snapshot timestamp.

Limitless avoids making the read wait by using a Hybrid Logical Clock (HLC).

Each shard maintains a logical clock `C`. When `T` reads from `S`, the shard advances its clock:

```
C = max(C, T.startTs + 1)
```

A future commit timestamp is then chosen using both the physical clock and the logical clock:

```
commitTs = max(C, now().latest)
```

Using the previous example:

```
Initially:
C = now().latest = 40

T reads:
C = max(40, 60 + 1) = 61

Later:
now() = [30, 50]

T' commits:
T'.commitTs = max(61, 50) = 61

Therefore:
T.startTs < T'.commitTs
```

T' is correctly considered to happen after T's snapshot.

The neat idea here is that instead of waiting for physical time to catch up, Limitless moves logical time forward.

### What About Prepared Transactions?

There is another complication.

Suppose `T` reads a tuple whose creating transaction `T'` is still in the `PREPARED` state. `T'` does not yet have a final transaction outcome, so simply comparing timestamps is not enough.

The shard queries `T'`'s lead shard, which is authoritative for the transaction's state.

If `T'` has committed, its `commitTs` can be compared with `T.startTs`. If it has aborted, its changes are invisible.

But what if `T'` is still unresolved?

Again, Limitless uses the HLC.

The lead shard advances its logical clock:

```
C = max(C, T.startTs + 1)
```

If `T'` eventually commits, its commit timestamp must therefore be greater than `T`'s snapshot timestamp:

```
T'.commitTs > T.startTs
```

`T` can safely treat `T'` as invisible and continue immediately.

This captures the intuition behind Limitless's use of HLCs: **prefer not to block reads**.

Instead of waiting during a read, the system advances logical time. If that logical clock gets ahead of physical time, the cost may later be paid during commit, when the system waits for physical time to catch up.

This trade-off works well for typical OLTP workloads. In practice, Amazon Time Sync Service also provides very tight clock bounds, usually below a millisecond and often on the order of tens of microseconds, keeping this waiting time small.

## Keeping Real-Time Order

Time-based MVCC gives Limitless another useful property: it can preserve the real-time ordering of non-overlapping transactions.

By real-time order, I mean:

```
If T1 commits before T2 starts, T2 must be able to see T1's changes.
```

Without an additional mechanism, clock uncertainty could violate this property. `T1` could logically receive a commit timestamp that is still in the future according to another node's clock, allowing `T2` to start afterward in real time but receive an earlier snapshot timestamp.

Limitless solves this with a clock barrier.

After a transaction's `commitTs` has been determined, the shard waits until `now().earliest > T.commitTs` before completing the commit.

Why does this work?

When `T1` finishes committing, real time is guaranteed to have passed `T1.commitTs` because `now().earliest > T1.commitTs`.

If `T2` starts after `T1` has finished, `T2` chooses `T2.startTs = now().latest`.

Since the real time at which `T2` starts must be later than `T1`'s completed clock barrier, we get:

```
T1.commitTs < now().earliest <= now().latest = T2.startTs
```

So the same timestamp-based visibility rule that enables distributed MVCC can also preserve an intuitive real-time ordering between transactions.

## Closing Thoughts

Aurora Limitless starts with a simple but ambitious goal: make Aurora scale horizontally without requiring applications to manage sharding themselves.

Doing so turns transaction processing into a distributed systems problem. In particular, PostgreSQL's conventional XID-based MVCC doesn't scale naturally because determining visibility depends on globally coordinated transaction information.

The most interesting idea in Limitless, to me, is how time-based MVCC changes this problem.

At its core, visibility becomes a timestamp comparison:

```
commitTs <= startTs
```

Of course, distributed clocks make that deceptively simple rule much harder to implement correctly. Limitless combines bounded clocks, Hybrid Logical Clocks, two-phase commit, and clock barriers to make it work.

There is much more in the paper, including query optimization, failover, backup and recovery, and online resharding. But I found time-based MVCC the most interesting because it sits at the heart of how Limitless turns PostgreSQL into a horizontally scalable distributed database.

Thanks for reading!