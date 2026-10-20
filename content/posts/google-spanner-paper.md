+++
title = "Reading the Google Spanner Paper"
date = 2026-10-19
tags = ["database", "paper"]
+++

I read the Google Spanner paper, [Spanner: Google’s Globally-Distributed Database](https://static.googleusercontent.com/media/research.google.com/en//archive/spanner-osdi2012.pdf), so I'm going to share my take on it.

We'll focus on its essence rather than covering every detail, so we can get an overview of what Spanner is, what makes it powerful, and how it works.

## Google Spanner TL;DR

- Google already had Bigtable and Megastore, but both had limitations. Bigtable was difficult to use for applications requiring complex schemas or strong consistency across datacenters. Megastore provided a semi-relational data model and synchronous replication, but its write throughput was relatively low.
- Spanner combines automatic sharding, synchronous replication, serializable distributed transactions, and SQL-based queries in a globally distributed database.
- One of its key features is **external consistency**: the order of transactions respects the order in which they happen in the real world.
- To achieve this, Spanner uses **TrueTime**, a novel clock API that exposes bounded clock uncertainty. TrueTime also helps Spanner support lock-free read-only transactions and globally consistent snapshot reads.

## Architecture

Although Spanner supports SQL-like queries, its underlying storage is more like a distributed key-value store. Data is stored as versioned key-value pairs. Let's look at how Spanner organizes and replicates this data.

```text
Universe
  ├── Zone 1
  │   ├── Spanserver 1
  │   ├── Spanserver 2
  │   └── ...
  ├── Zone 2
  │   └── ...
  └── ...
```

The entire Spanner deployment is called a `universe`. It consists of multiple `zones`. A zone is a unit of deployment and physical isolation. Data is replicated across zones, potentially in different datacenters, for availability and disaster tolerance.

Each zone has hundreds to thousands of `spanservers`, which serve data to clients.

Let's take a closer look at spanservers.

A spanserver manages roughly 100–1000 `tablets`. A tablet stores a collection of versioned key-value pairs. Each tablet is replicated across multiple spanservers using Paxos. Each spanserver hosts a replica of the tablet, and these replicas form a **Paxos group**. A spanserver can host replicas belonging to multiple Paxos groups.

Paxos ensures that the replicas agree on the order of writes. Replication is synchronous, so writes are replicated before they are acknowledged as committed.

Spanner also introduces a unit called a `directory`. A directory is a group of rows that share a common key prefix. A tablet can contain multiple directories, and a directory is normally placed within a single Paxos group.

```text
Paxos Group A
  ├── Replica 1: Tablet
  │                ├── Directory 1
  │                └── Directory 2
  ├── Replica 2: Tablet
  │                ├── Directory 1
  │                └── Directory 2
  └── Replica 3: Tablet
                   ├── Directory 1
                   └── Directory 2
```

Directories are important because they are the unit of data placement. Applications can control where their data is replicated. For example, data belonging to users in London can be replicated in datacenters in Europe.

Spanner can also move directories between Paxos groups to balance load or improve data locality. Very large directories may be split into multiple fragments.

### Data Locality

Applications can place related rows close together using `INTERLEAVE IN PARENT` in `CREATE TABLE`.

For example, let's create `Users` and `Orders` tables using the schema syntax from the paper.

```sql
CREATE TABLE Users {
    user_id INT64 NOT NULL,
    name STRING
} PRIMARY KEY (user_id), DIRECTORY;

CREATE TABLE Orders {
    user_id INT64 NOT NULL,
    order_id INT64 NOT NULL
} PRIMARY KEY (user_id, order_id),
  INTERLEAVE IN PARENT Users ON DELETE CASCADE;
```

This tells Spanner to store each user's orders together with the corresponding user.

```text
Directory A
  ├── Users(1)
  ├── Orders(1, 32)
  └── Orders(1, 55)

Directory B
  ├── Users(2)
  ├── Orders(2, 10)
  └── Orders(2, 94)
```

By placing related rows close together, Spanner can execute many queries within a single Paxos group.

## TrueTime

Spanner needs to provide consistency across Paxos groups distributed around the world.

Imagine several datacenters, each containing many Paxos groups, with transactions reading and writing data concurrently. Each Paxos group agrees on the order of its own writes, but how can Spanner maintain a consistent order across different groups?

More specifically, how does Spanner guarantee **external consistency**?

External consistency means that if transaction A commits before transaction B starts, A must come before B in the serialization order.

This is difficult because clocks on different machines are never perfectly synchronized. If two machines assign timestamps using their local clocks, the timestamps might disagree with the actual order of events.

Here, **TrueTime**, a novel clock service, comes in.

TrueTime provides `TT.now()`, but instead of returning a single timestamp, it returns a range:

```text
TT.now() = [earliest, latest]
```

The actual current time is guaranteed to be within this range.

For example, if `TT.now()` returns `[98, 102]`, the actual time must be somewhere between 98 and 102.

Spanner supports both read-write and read-only transactions, so let's see how TrueTime is used in each.

### Read-Write Transactions

Spanner uses **Two-Phase Locking (2PL)** for concurrency control and serializability.

A transaction acquires shared locks when reading data, while writes are buffered at the client until commit.

Once reads and writes are done, the client starts **Two-Phase Commit (2PC)** if the transaction involves multiple Paxos groups. A transaction involving only one Paxos group can use a simpler path without 2PC.

In 2PC, one Paxos group acts as the coordinator, while the other groups are participants.

The process works roughly as follows:

1. **Prepare:** Each non-coordinator participant acquires write locks, chooses a `prepareTs` greater than the timestamps it previously assigned, and records the prepare state durably through Paxos.
2. **Choose commit timestamp:** The coordinator collects the `prepareTs` values and chooses a `commitTs` greater than or equal to all of them. It must also be greater than `TT.now().latest` and greater than the timestamps the coordinator previously assigned.
3. **Commit:** The coordinator records the decision through Paxos, waits until the commit timestamp is in the past, and then sends the result to the client and participants.

The coordinator's timestamp assignment follows an important rule called the **Start Rule**.

The Start Rule requires the commit timestamp to be no earlier than `TT.now().latest`, evaluated after the commit request reaches the coordinator.

```text
TT.now().latest <= commitTs
```

Spanner also uses another rule called **Commit Wait**. Before making the commit visible, the coordinator waits until the actual time has passed `commitTs`:

```text
commitTs < TT.now().earliest
```

Together, the Start Rule and Commit Wait guarantee that commit timestamps respect the real-time order of transactions.

Let's see why. Suppose transaction A (TxA) commits before transaction B (TxB) starts. We want to prove that `TxA.commitTs < TxB.commitTs`.

- Commit Wait: `TxA.commitTs < TxA.commitRealTime`
- Assumption: `TxA.commitRealTime < TxB.startRealTime`
- Causality: `TxB.startRealTime <= TxB.commitRequestRealTime`
- Start Rule: `TxB.commitRequestRealTime <= TxB.commitTs`
- **Therefore:** `TxA.commitTs < TxB.commitTs`

Elegantly, these two rules, combined with TrueTime, ensure that commit timestamps follow real-time order. Together with serializability, this provides external consistency.

Of course, Commit Wait adds some latency because Spanner must wait for clock uncertainty to pass. However, this wait can overlap with Paxos communication.

### Read-Only Transactions

An application declares a transaction as read-only if it only needs to read data.

As we saw, read-write transactions require locking and may also require 2PC. On the other hand, read-only transactions are **lock-free**, meaning they don't block concurrent writes.

Spanner assigns a snapshot timestamp to a read-only transaction, and all reads in the transaction use that same timestamp.

For reads across multiple Paxos groups, `TT.now().latest` is used as the snapshot timestamp. Tablets store versioned key-value pairs `(key, timestamp) => value`, so Spanner can return the version visible at the given timestamp.

To serve a read, a replica must be sufficiently up-to-date for the requested timestamp. Spanner tracks this using a value called `safe time`. If the replica is not ready, the read may need to wait.

Another operation called **Snapshot Read** allows applications to specify a snapshot timestamp. However, old versions are eventually garbage-collected.

## Closing Thoughts

We've seen Spanner's architecture (universe, zone, spanserver, tablet, directory, and Paxos group) and how TrueTime is used to achieve external consistency and lock-free snapshot reads.

What I found especially interesting is that Spanner uses globally meaningful timestamps to solve difficult problems in distributed databases. Paxos handles replication and the order of writes within each group, while TrueTime helps Spanner maintain consistency across groups without relying on a single global timestamp server.

According to the paper, there was debate about whether general-purpose distributed transactions should be supported at all, because they can be expensive and complicated. Some argued that applications should handle those problems themselves.

However, the Spanner team believed it was better to provide transactions and deal with performance problems when they arise, rather than always forcing application developers to work around the lack of transactions.

One example was F1, Google's advertising backend, which moved from a MySQL-based system to Spanner. This helped reduce the complexity of managing sharded databases while providing strong consistency and scalability.

Personally, I read this paper after [reading the Amazon Aurora Limitless paper](https://momori.dev/posts/amazon-aurora-limitless-paper/), so it was interesting to compare their approaches. Both systems use time-based techniques to manage consistency in distributed databases, although their transaction models and consistency guarantees are different.

Thanks for reading! I hope you enjoyed it, and see you again in another post.
