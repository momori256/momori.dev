+++
title = "Reading the Amazon Aurora Paper"
date = 2026-09-15
tags = ["database", "paper"]

+++

In this post, we'll walk through how Amazon Aurora works under the hood, based on the paper [Amazon Aurora: Design Considerations for High Throughput Cloud-Native Relational Databases](https://www.amazon.science/publications/amazon-aurora-design-considerations-for-high-throughput-cloud-native-relational-databases).

## Amazon Aurora TL;DR

- In the cloud era, OLTP databases need both high performance and resilience to failures.
- Aurora pushes the separation of compute and storage further by introducing a distributed storage service responsible for redo processing and page materialization.
- Aurora addresses the network I/O bottleneck between compute and storage by sending only redo logs describing changes, instead of writing full pages over the network.

## How Aurora Achieves Durability

In a distributed environment, failures are always happening somewhere, ranging from temporary issues such as slow disk reads or network congestion to permanent failures of disks, nodes, or even an entire data center. A cloud database needs to remain available despite these failures.

Aurora splits the database volume into 10 GB segments. Each segment is replicated six ways across three Availability Zones (a physically isolated group of data centers within an AWS region), with two replicas in each AZ.

Aurora uses a 4/6 write quorum and a 3/6 read quorum. This allows writes to remain available even if an entire AZ goes down, while reads can tolerate the loss of one AZ plus one additional replica.

A 10 GB segment can be restored in roughly 10 seconds over a 10 Gbps network, minimizing the time the system runs with reduced redundancy. Aurora can also treat many operational events in a similar way: disk failures, software upgrades, and heat management can all be handled by temporarily removing a replica and repairing the quorum elsewhere.

## The Log Is the Database

Aurora replicates data six ways for durability. Naturally, this creates write amplification.

Disk I/O itself can be distributed across storage nodes, but the network between compute and storage becomes the bottleneck. A traditional database may send multiple forms of data to storage, including WAL records and modified pages.

Aurora takes a different approach: the compute node sends only redo log records to storage.

Redo records describe changes to pages and are typically much smaller than the pages themselves. Aurora's storage service understands these redo records and can apply them to reconstruct pages on its own.

As a result, when a storage node receives a redo record, the foreground path is very short: persist the log record and return an ACK.

Most other work, such as organizing logs, applying them to pages, materializing page versions, garbage collecting old versions, and backing up data, can happen asynchronously in the background.

## How Aurora Handles Commit, Read, and Recovery

Now that we understand the basic idea, let's look at what actually happens during a commit, a read, and crash recovery.

### Commit

The compute node is responsible for generating redo records for changes made by transactions and sending them to storage.

A redo record is considered durable once it has been persisted by a 4/6 write quorum.

In reality, many transactions run concurrently, so their LSNs (Log Sequence Numbers) are interleaved. For example:

- Tx: 1000 → 1010 → 1020
- Ty: 1005 → 1015

Aurora therefore cannot simply look at the last log record of Tx in isolation. To advance the durable point to LSN 1020, it needs to know that the required log history up to that point is durable without gaps.

The compute node tracks ACKs from storage and continuously advances this durable frontier. Aurora calls this the Volume Durable LSN, or VDL.

Once the transaction's commit record is within the durable history, the compute node can acknowledge the commit to the client.

This plays a role similar to WAL durability in a traditional relational database: once the transaction is acknowledged as committed, the information required to recover its changes has been persisted.

An important property here is that LSNs form a monotonically increasing history. Aurora can keep this ordering simple because there is only one writer generating the log stream.

### Read

Naively, we might expect every read to contact three storage replicas to form a read quorum.

In practice, this isn't necessary.

The compute node tracks how complete each storage replica is and therefore knows which replica has all the redo records required for a particular read. It can send the request directly to a suitable replica instead of querying three arbitrary replicas.

The compute node also has its own buffer cache, so it contacts storage only on a cache miss.

Storage nodes cache and materialize pages as well. If the requested page is not already available in the required version, the storage node can reconstruct it by applying the necessary redo records.

Storage also materializes pages in the background so that it doesn't need to replay the entire log history every time a page is requested.

### Recovery

Traditional databases using WAL typically rely on checkpoints for crash recovery.

Conceptually, after a crash, the database starts from a checkpoint and replays subsequent log records to reconstruct the latest state. An old checkpoint means more redo work during recovery, while frequent checkpointing adds overhead to normal foreground processing.

This creates a trade-off between runtime performance and recovery time.

Aurora largely removes this trade-off.

Redo application and page materialization are already normal responsibilities of the storage service. Therefore, the database engine does not need to replay all outstanding redo records into pages before it can come back online.

Aurora still needs to determine the durable point of the log after a crash and discard any log records beyond it. However, it does not need to perform traditional page-level redo recovery during startup.

Instead, page reconstruction happens naturally as pages are accessed and through normal background processing.

As a result, Aurora can typically restart after a crash in under 10 seconds, regardless of how much work had been performed before the crash.

## Closing Thoughts

We've covered the main idea behind Aurora: moving redo processing into a distributed storage service and making redo records the primary unit of communication between compute and storage.

At the same time, transaction processing remains largely on the compute layer. Aurora radically redesigns the storage layer without requiring the entire relational database stack to become a distributed system.

One interesting limitation follows from this design.

An Aurora cluster has one writer and can have up to 15 read replicas. The single writer provides a centralized ordering of the redo log, which greatly simplifies the system. However, it also means that write throughput cannot be scaled simply by adding more writers.

Aurora Limitless Database tackles exactly this limitation by allowing writes to scale across multiple database nodes.

I'll read [the Aurora Limitless Database paper](https://www.amazon.science/publications/aurora-postgresql-limitless-database-building-a-highly-scalable-oltp-database) next.

We've only covered a small part of the original Aurora paper here. If you're interested in database internals or distributed storage, I highly recommend reading the full paper.

Thanks for reading!
