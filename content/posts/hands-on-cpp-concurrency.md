+++
title = "Hands-On C++ Concurrency: Quick Sort and Hash Table"
date = 2024-06-17
tags = ["C++", "multithreading"]
cover.image = "https://source.unsplash.com/EA4MvInOSy0"
+++

In this hands-on tutorial, we will explore concurrent programming in C++ through the implementation of a concurrent quick sort and a lock-based hash table.

## Building Blocks

Before diving into the detailed implementation, let's first go through the building blocks of concurrent programming in C++.

### `std::thread`

[`std::thread`](https://cplusplus.com/reference/thread/thread/) is a class that represents a single thread of execution. It can be used to create new threads that run concurrently with the calling thread.

```cpp
#include <iostream>
#include <thread>

void thread_ex1() {
    std::thread t([] { std::cout << "Hello, World!" << std::endl; });
    t.join();
}
```

A thread can be created by passing a callable object (e.g., a lambda function) to the `std::thread` constructor. The thread should be either `join()`ed to wait for the thread to finish its execution or `detach()`ed from the calling thread. 

Here is another example of using `std::thread` to call a member function of a class:

```cpp
#include <cassert>
#include <iostream>
#include <thread>

struct A {
    int x = 2;
    void f(int y) {
        x += y;
    }
};

void thread_ex2() {
    A a;
    std::thread t(&A::f, &a, 3);
    t.join();
    assert(a.x == 5); // 2 + 3
}
```

### `std::future`

[`std::future`](https://cplusplus.com/reference/future/future/) is a class representing the result that will be available in the future. It can be created using `std::async`, which abstracts away the thread management, making it simpler to run a function asynchronously and get the result later.

```cpp
#include <cassert>
#include <future>

void future_ex1() {
    std::future<int> fut = std::async([] { return 25; });
    assert(25 == fut.get());
}
```

There are two other ways to create a `std::future` object: [`std::promise`](https://cplusplus.com/reference/future/promise/) and [`std::packaged_task`](https://cplusplus.com/reference/future/packaged_task/). Briefly, `std::promise` is used to separate the producer and consumer of the value, and `std::packaged_task` is for decoupling function execution and future retrieval.

```cpp
#include <cassert>
#include <future>
#include <thread>

void producer(std::promise<int>&& prom) {
    using namespace std::chrono_literals;
    std::this_thread::sleep_for(1s);
    prom.set_value(6);
}

void future_ex2() {
    std::promise<int> prom;
    std::future fut = prom.get_future();
    std::thread t(producer, std::move(prom));
    assert(6 == fut.get());
    t.join();
}

void future_ex3() {
    std::packaged_task<int(int)> task([](int x) { return x * x; });
    std::future fut = task.get_future();

    std::thread t(std::move(task), 5);
    assert(25 == fut.get());
    t.join();
}
```

### `std::mutex`

`std::mutex` is a synchronization primitive that can be used to protect shared data from being simultaneously accessed by multiple threads.

```cpp
#include <mutex>

void mutex_ex1() {
    std::mutex mut;
    mut.lock();
    // access shared resource
    mut.unlock();
}
```

`std::lock_guard` is an RAII mechanism for automatically unlocking a mutex:

```cpp
void mutex_ex2() {
    std::mutex mut;
    std::lock_guard lock(mut);
    // access shared resource
}
```

### `std::shared_mutex`

`std::shared_mutex` is used to implement readers-writer lock. `std::unique_lock` and `std::shared_lock` are used for exclusive access and for shared access, respectively.

```cpp
#include <shared_mutex>

void shared_mutex_ex1() {
    std::shared_mutex mut;
    {
        std::unique_lock lock(mut);
        // write access
    }
    {
        std::shared_lock lock(mut);
        // read access
    }
}
```

## Quick Sort

Let's take a look at how to utilize multiple threads in the implementation of quick sort. To begin with, the below is a non-parallel quick sort implementation.

```cpp
#include <algorithm>
#include <cassert>
#include <vector>

template <typename Iterator>
void quick_sort(Iterator first, Iterator last) {
    if (std::distance(first, last) <= 0) {
        return;
    }

    const auto& pivot = *first;
    const Iterator divide_point = std::partition(
        std::next(first), last,
        [&](const auto& x) { return x < pivot; });

    std::iter_swap(first, std::prev(divide_point));
    quick_sort(first, std::prev(divide_point));
    quick_sort(divide_point, last);
}

void quick_sort_ex1() {
    std::vector<int> v{5, 3, 2, 4, 1};
    quick_sort(v.begin(), v.end());
    assert(std::is_sorted(v.begin(), v.end()));
}
```

The key to parallelizing quick sort is the fact that it has two tasks: sorting the left and right partitions of the array. We can use `std::async` to sort the left part in a new thread and sort the right part in the current thread.

```cpp
#include <algorithm>
#include <cassert>
#include <future>
#include <iostream>
#include <thread>
#include <vector>

template <typename Iterator>
void parallel_quick_sort(Iterator first, Iterator last) {
    std::cout << std::this_thread::get_id() << std::endl;
    if (std::distance(first, last) <= 0) {
        return;
    }

    const auto& pivot = *first;
    const Iterator divide_point = std::partition(
        std::next(first), last,
        [&](const auto& x) { return x < pivot; });
    std::iter_swap(first, std::prev(divide_point));

    std::future fut = std::async(
        parallel_quick_sort<Iterator>, first, std::prev(divide_point));
    parallel_quick_sort(divide_point, last);
    fut.get();
}
```

How many threads are created by the above code? Well, it depends. `std::async` can launch a new thread to execute the function immediately or defer the execution until the result is needed (e.g., when `get()` is called). If the behavior is not specified, the implementation can choose either way depending on factors such as resource availability and optimization strategies.

## Hash Table

Let's delve into the implementation of a lock-based hash table. The obvious way to implement a thread-safe hash table is to protect an `unordered_map` with a mutex.

```cpp
#include <cassert>
#include <mutex>
#include <string>
#include <unordered_map>

template <typename K, typename V>
class hash_table {
private:
    std::unordered_map<K, V> data;
    std::mutex mut;

public:
    hash_table() = default;

    void insert(K key, V value) {
        std::lock_guard lk(mut);
        data[key] = value;
    }

    V get(K key) {
        std::lock_guard lk(mut);
        return data[key];
    }

    void remove(K key) {
        std::lock_guard lk(mut);
        data.erase(key);
    }
};

void hash_table_ex1() {
    hash_table<int, std::string> table;
    table.insert(5, std::string{"5"});
    table.insert(9, "9");
    table.remove(9);
    assert("5" == table.get(5));
    assert("" == table.get(9));
    return 0;
}
```

The above implementation is simple. However, it is not efficient because, after all, only one thread can access the hash table at a time. While a readers-writer lock will surely improve the situation, it is still not optimal.

To maximize the potential of concurrency, we can use more fine-grained locking. Each bucket in the hash table has its own mutex, allowing multiple threads to access different buckets concurrently.

```cpp
#include <algorithm>
#include <cassert>
#include <list>
#include <mutex>
#include <shared_mutex>
#include <string>
#include <vector>

template <typename K, typename V, typename Hash = std::hash<K>>
class hash_table {
private:
    class bucket {
    public:
        using value_type = std::pair<K, V>;

        bucket() = default;

        V get(const K& key) {
            std::shared_lock lock(mut);
            const auto it = find(key);
            return it == data.end() ? V() : it->second;
        }

        void insert(const K& key, const V& value) {
            std::unique_lock lock(mut);
            const auto it = find(key);
            if (it == data.end()) {
                data.push_back({key, value});
                return;
            }
            it->second = value;
        }

        void remove(const K& key) {
            std::unique_lock<std::shared_mutex> lock(mut);
            std::erase_if(data, [&](const auto& kv) { return kv.first == key; });
        }

    private:
        std::list<value_type> data;
        std::shared_mutex mut;

        typename decltype(data)::iterator find(const K& key) {
            return std::find_if(data.begin(), data.end(),
                [&](const auto& kv) { return kv.first == key; });
        }
    };

public:
    hash_table(std::size_t size, Hash hasher = Hash())
        : size(size), buckets(size), hasher(hasher) {}

    hash_table(const hash_table& other) = delete;
    hash_table(hash_table&& other) = delete;
    hash_table& operator=(const hash_table& other) = delete;
    hash_table& operator=(hash_table&& other) = delete;

    V get(const K& key) {
        return find(key).get(key);
    }

    void insert(const K& key, const V& value) {
        find(key).insert(key, value);
    }

    void remove(const K& key) {
        find(key).remove(key);
    }

private:
    std::size_t size;
    std::vector<bucket> buckets;
    Hash hasher;

    bucket& find(const K& key) {
        return buckets[hasher(key) % size];
    }
};
```

Most of the heavy lifting is done by the `bucket` class, which is responsible for managing the data in each bucket. The `hash_table` class itself forwards the operations to the appropriate bucket based on the hash of the key.

## Conclusion

In this tutorial, we explored the foundational concepts of concurrent programming in C++ and demonstrated practical implementations of a parallel quick sort algorithm and a lock-based hash table. By utilizing concurrency features such as `std::thread`, `std::future`, and various mutex types, we can significantly improve the performance and responsiveness of our programs.
