+++
title = "RDB Internals Made Intuitive: Notes from Database Design and Implementation"
date = 2025-07-05
tags = ["C++", "database"]
+++

In this post, I’ll share what I learned from the book [Database Design and Implementation](https://link.springer.com/book/10.1007/978-3-030-33836-7) by Edward Sciore, which explains how a relational database (RDB) works by guiding the reader through building a simple RDBMS called *SimpleDB*.

My goal is to give an intuitive, top-down understanding of how RDBs work internally. I also hope this post serves as a high-level summary of the book, helping readers grasp the core ideas before diving deeper.

I’ll divide the RDBMS into two parts:

- The **Storage Engine**, which manages how data is stored and accessed
- The **Query Engine**, which processes SQL queries by using the storage engine

In the first half, I’ll focus on the storage engine, explaining its purpose and structure from a top-down perspective.

## Storage Engine

The storage engine is the core of an RDBMS. It is responsible for managing data on disk, including how data is stored, retrieved, updated, and deleted, while ensuring correctness and concurrency. To understand what the storage engine does, let’s first consider what properties an RDBMS must guarantee.

## What Must a Storage Engine Provide?

A relational database must ensure ACID properties:

- Atomicity: Each transaction must either complete fully or have no effect at all.
- Consistency: The database must always satisfy defined constraints (like `UNIQUE` or `FOREIGN KEY`).
- Isolation: Transactions should behave as if there were no other concurrent transactions.
- Durability: Once a transaction is committed, its effects must not be lost, even if the system crashes.

While keeping these, the storage engine must support CRUD operations (create, read, update, delete) on records.

## What Does a Table Look Like?

Before diving into implementation details, let’s first build an intuitive understanding of the data layout.

In SimpleDB, each table is stored in a file. This file is logically divided into blocks (typically 8 KB). Each block contains records, and each record is made up of fields corresponding to the table schema.

Here is a conceptual diagram of how data is organized in the storage engine:

```
╔═══════════════════════════════════╗
║   students table (students.tbl)   ║
║  ┌─────────────────────────────┐  ║
║  │           Block 0           │  ║
║  │ ┌───────────┐ ┌───────────┐ │  ║
║  │ │int│varchar│ │int│varchar│ │  ║
║  │ └───────────┘ └───────────┘ │  ║
║  │    Record 0      Record 1   │  ║
║  └─────────────────────────────┘  ║
║  ┌─────────────────────────────┐  ║
║  │           Block 1           │  ║
║  │ ┌───────────┐ ┌───────────┐ │  ║
║  │ │int│varchar│ │int│varchar│ │  ║
║  │ └───────────┘ └───────────┘ │  ║
║  │    Record 2      Record 3   │  ║
║  └─────────────────────────────┘  ║
╚═══════════════════════════════════╝
```

Now that we understand the end goal, let’s walk through the layers of abstraction that make this structure work, from high-level record access to low-level file I/O.

## TableScan: The Public Interface for Scanning Tables

`TableScan` is the main class used by the query engine. It provides an interface to iterate over records in a table, and to read or write field values.

```cpp
class TableScan {
  void open();
  void close();

  bool next_record();
  void next_empty();

  int get_int(string field_name);
  string get_string(string field_name);
  void set_int(string field_name, int value);
  void set_string(string field_name, string value);
  void remove();
};
```

Internally, `TableScan` keeps track of a current position, a block number and a slot within that block. A slot either contains a record or is empty. A user of this class first calls `open()` to start scanning, then moves to `next_record()` to read its values using `get_int/string()`, or calls `next_empty()` to find an empty slot for insertion using `set_int/string()`. The user can scan through all records in a table by repeatedly calling the `next_*` functions, which traverse blocks. Once completed, it needs to be `closed` to release resources.

`TableScan` uses the following component to access individual records.

## RecordIO: Record-Level Operations Within a Block

`RecordIO` interprets the binary content of a block as a series of structured records, based on a schema and layout.

```cpp
class Schema {
  void add_int_field(string name);
  void add_string_field(string name);
};

class Layout {
  int offset(string field_name);
  int slot_size();
};

class RecordIO {
  int next_record(int slot);
  int next_empty(int slot);

  int get_int(int slot, string field_name);
  int get_string(int slot, string field_name);
  int set_int(int slot, string field_name, int value);
  int set_string(int slot, string field_name, string value);
  void remove(int slot);
};
```

`RecordIO` is built on two key components:

- **Schema** defines the field names and types for records
- **Layout** calculates field offsets and slot sizes based on the schema

## Transaction: Concurrent and Durable Page Access

The `Transaction` class provides a high-level interface for reading and writing to pages while enforcing the AID properties of ACID. Consistency is a higher-level concept supported by these three.

To do this, `Transaction` handles:

- **Locking**: to prevent conflicting access from other transactions
- **Page management**: to ensure data is loaded into memory when needed and reused efficiently
- **Logging**: to allow rollback and crash recovery

Let's take a closer looks at each of them in the following sub-sections.

```cpp
class Transaction {
  void commit();
  void rollback();
  void recover();

  void pin(BlockId block);
  void unpin(BlockId block);

  int get_int(BlockId block, int offset);
  string get_string(BlockId block, int offset);
  void set_int(BlockId block, int offset, int value);
  void set_string(BlockId block, int offset, string value);

  BlockId append_block(string &file_name);
};
```

### Locking: Acquiring and Releasing Locks for Isolation

`Transaction` uses locks to ensure serializability. What is serializability? Let's say some transactions are running. Their execution order is called serializable if the result is equivalent to some sequential execution of those transactions. Serializability ensures isolation; from each transaction's perspective, it appears as if transactions are executed sequentially, not concurrently. Serializability strictly ensures isolation of ACID.

To do this, `Transaction` follows these rules:
- Acquires a shared lock for reading
- Acquires an exclusive lock for writing
- Holds all locks until the transaction ends

Locking is handled by `ConcurrencyManager`:

```cpp
class ConcurrencyManager {
  void acquire_slock(BlockId block);
  void acquire_xlock(BlockId block);
  void release();
};
```

### Page Management: What Is Pin and Unpin?

Accessing a block on disk requires loading it into memory. However, allocating a fresh memory every time would be inefficient. To solve this, the system uses a buffer pool, a fixed number of in-memory slots shared across transactions.

To coordinate usage of these shared buffers, we pin a block before accessing it. This tells the system, "This buffer is in use. Don’t evict it." Once we’re done, we unpin it to allow others to reuse that slot.

So, when `Transaction` wants to read or write a value, it first pins the target block, performs the operation on the in-memory page, and unpins it afterward.

To support this, it collaborates with `BufferManager`:

```cpp
class Buffer {
  Page& content();
  BlockId block();

  void pin();
  void unpin();
};

class BufferManager {
  Buffer& pin(BlockId block);
  void unpin(Buffer &buffer);
};
```

Each buffer wraps a `Page` (in-memory representation of a block, discussed later) and tracks whether it is currently pinned (i.e., in use). `BufferManager` allocates the buffers on startup and allows transactions to use them.

Although a buffer pool improves the performance, it introduces the risk of durability. Let's discuss this next.

### Logging: Durability and WAL

A buffer pool is used to avoid frequent disk I/O. Instead of writing every change immediately to disk, modified pages stay in memory and are flushed later when convenient.

While this greatly improves performance, it introduces a risk; What if a transaction commits, but the modified pages haven’t been written to disk and the system crashes?

In that case, the changes would be silently lost, violating Durability in ACID. To prevent this, databases use Write-Ahead Logging (WAL). The core idea is: Before a modified page is written to disk, or before a transaction commits, the corresponding log records must be flushed to disk.

A WAL record describes an operation such as “Update the bytes at offset 42 on block 5 from value 2 to value 5.”

This ensures that even if data pages are lost in a crash, the changes can be replayed from the log during recovery.

WAL guarantees durability by:

- Recording redo information before modifying the page
- Flushing the log to disk before a page is flushed or the transaction commits
- Replaying log entries during crash recovery to restore consistency

SimpleDB uses the WAL both as a redo log and an undo log, allowing it to support both rollback and recovery after crashes.

## FileManager: Low-Level File and Block I/O

At the base layer, `FileManager` handles raw disk I/O at the block level. It reads and writes blocks, appends new blocks, and abstracts away OS file operations.

```cpp
class BlockId {
  string file_name;
  int block_number;
};

class Page {
  int get_int(int offset);
  string get_string(int offset);
  void set_int(int offset, int value);
  void set_string(int offset, string value);
};

class FileManager {
  void read(BlockId block, Page &page);
  void write(BlockId block, Page &page);
  BlockId append();
};
```

- `BlockId` identifies a block using a file name and block number.
- `Page` is an in-memory representation of a block, providing typed access to its contents.

To summarize, the storage engine in SimpleDB is structured in layered modules, each building on the lower layers:

- **`TableScan`**: scan operations for the query engine
- **`RecordIO`**: record-level operations within blocks
- **`Transaction`**: block-level operations with ACID enforcement
- **`FileManager`**: raw block-level disk I/O

Now let's explore how the query engine builds upon this foundation.

## Query Engine

The query engine is responsible for processing SQL queries using the storage engine. It follows a three-step process: parse the SQL, plan how to execute the query, and carry out that execution.

## Planner

Ultimately, the query engine needs to retrieve records using the `TableScan` class. For example, if it receives a query like:

```sql
SELECT id, name FROM students;
```

It constructs a `TableScan` to scan all records in the students table. The main loop then repeatedly calls `TableScan::next_record()` until all records have been consumed.

The component that creates a `TableScan` instance is called the `Planner`, as its job is to plan how to execute the query.

```cpp
class Planner {
  TableScan create_scan(string query);
};
```

To instantiate a `TableScan`, the planner needs to provide the name and layout (schema and offsets) of the table. Getting the table name is straightforward since it’s written in the SQL's FROM clause. But how do we obtain the layout of a table?

## Catalog Tables

We need somewhere to store metadata such as table names and field definitions. SimpleDB handles this using built-in catalog tables, which are themselves just normal tables. For example:

- `table_catalog` stores table-level metadata
- `field_catalog` stores field-level metadata

A simplified schema might look like this:

**table_catalog**

| Column     | Type    |
|------------|---------|
| table_name | varchar |

**field_catalog**

| Column     | Type                              |
|------------|-----------------------------------|
| table_name | varchar                           |
| field_name | varchar                           |
| type       | int (0 = int, 1 = varchar)        |
| length     | int (0 if int, length if varchar) |
| offset     | int                               |

Using these catalogs, we can reconstruct a `Layout` for any table.

## Parser

So far, the `Planner` needs to extract the table name from the SQL query. For simple queries, this might seem easy: just look at the FROM clause. However, queries also include other information like the selected fields (in the SELECT clause) and filter conditions (in the WHERE clause).

To support more complex queries, we need a proper parser that extracts all this information.

```cpp
class SelectQuery {
  string table_name;
};

class Parser {
  SelectQuery parse(string query);
};
```

The parser works by first breaking the query into tokens, the smallest meaningful pieces of SQL. For example, the query `SELECT id, name FROM students` would be tokenized into:

```
[Select, Identifier("id"), Identifier("name"), From, Identifier("students")]
```

This tokenization is handled by a `Tokenizer` (also called a lexer):

```cpp
namespace token {
  class Select {};
  class From {};
  class Identifier {
    string name;
  };
  using T = variant<Select, From, Identifier>;
}

class Tokenizer {
  vector<token::T> tokenize(string query);
};
```

Then the `Parser` uses the token stream to build a `SelectQuery` object. SimpleDB uses an approach called *recursive descent parsing*, which is easy to implement and suitable for SimpleDB’s simple SQL grammar.

## How the Query Engine Works (So Far)

Let’s walk through what happens when a query is executed:

1. The main loop receives a SQL query string from the user.
1. The string is passed to the `Planner`.
1. The `Planner` uses the `Parser` and `Tokenizer` to extract information (like the table name).
1. The `Planner` retrieves the table's layout from the catalog and creates a `TableScan`.
1. The main loop repeatedly calls `TableScan::next_record()` and prints values with `get_int/string()`.

At this point, our database supports very simple queries like `SELECT id, name FROM students`.

## Relational Algebra: Select, Project, Product

To support more complex queries, we introduce three fundamental relational algebra operations:

- **Select** filters rows based on a condition (`WHERE`)
- **Project** selects specific columns (`SELECT`)
- **Product** produces the Cartesian product of two tables (`CROSS JOIN`)

These operations each take one or two input tables and return a new table as output.

With these, we can express more complex queries for `students(id, name)` and `enrollments(class_name, student_id)` like:

```sql
SELECT id, name, class_name
FROM students, enrollments
WHERE id = student_id;
```

For simplicity, we assume:

- There are no duplicate column names across tables
- The `WHERE` clause contains only a single equality condition like `A = B`

## New Scan Types

To support these relational algebra operations, we introduce new scan classes: `SelectScan`, `ProjectScan`, and `ProductScan`. Each scan wraps another scan and processes the records returned from it.

Here’s an example of how the planner could compose these scans to execute the earlier query:

```cpp
TableScan students("students");
TableScan enrollments("enrollments");

ProductScan product(students, enrollments);
SelectScan select(product, "id", "student_id"); // id = student_id
ProjectScan project(select, {"id", "name", "class_name"});
```

Now the planner's job becomes more than just creating a `TableScan`. It needs to parse the query, identify necessary operations, and compose a scan pipeline using these building blocks.

To support this architecture, we need to update:

- **`Tokenizer`**: to recognize additional SQL keywords and expressions
- **`Parser`**: to construct a richer query representation (e.g., including `WHERE` and `SELECT` fields)
- **`Planner`**: to convert the query representation into a scan pipeline

Similarly, we can support other types of queries like `CREATE TABLE`, `INSERT`, `UPDATE`, and `DELETE`.

## Performance Improvements: Indexing and Materialization

So far, our query engine executes operations in a straightforward way: scanning full tables, applying filters, and combining rows. While this is functionally correct, it's not efficient for large datasets.

To improve performance, SimpleDB uses techniques like indexing and materialization.

### Indexing: Fast Record Lookup

An index is a data structure used to quickly locate records without scanning the entire table. The most common indexing method is the B-Tree. Essentially, it's a tree structure where each node has multiple items that use column values as keys, and the leaf nodes contain pointers to actual records (block and slot number for SimpleDB).

With an index on `student_id` column, a WHERE clause like `student_id = 123` can be evaluated in logarithmic time instead of linear.

### Materialization: Creating Temporary Tables

Materialization refers to the strategy of storing intermediate results as temporary tables. This can be useful when:

- Sorting large inputs (e.g., for `ORDER BY` or `GROUP BY`)
- Implementing efficient join algorithms like merge join or hash join

For example, to perform a `GROUP BY` operation, we can first sort the input on the grouping key, write the sorted result to a temporary table, and then scan through it to compute aggregates.

Materialization introduces overhead (since it writes data to disk), but it often pays off by enabling more efficient algorithms for subsequent operations.

## Closing Thoughts

In this post, we explored how an RDB works by following the architecture of SimpleDB from a top-down perspective. We looked at how the storage engine manages data and enforces ACID properties, and how the query engine executes SQL using scan operators. We also touched on optimization techniques such as indexing and materialization.

The book *Database Design and Implementation* goes even further, covering topics like join algorithms and cost-based optimization. If you're interested in building or deeply understanding how databases work, it’s a great resource to continue with.

Thank you for reading!
