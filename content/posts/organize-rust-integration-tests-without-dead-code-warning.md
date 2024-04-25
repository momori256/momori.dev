+++
title = "Organize Rust Integration Tests Without Dead Code Warning"
date = 2024-02-05
tags = ["rust", "integration-test"]
cover.image = "https://source.unsplash.com/8dvTZPVEJWk"
+++


In this blog post, we'll explore strategies for organizing integration tests in Rust, addressing challenges like dead code warnings and maximizing modularity.


## Integration Testing In Rust

Conventionally, integration test files are placed in `tests` directory at the top level of a project.

Let's create a project for illustration:

```sh
cargo new --lib my-tests
```

```
❯ exa --tree --level 2
.
├── Cargo.lock
├── Cargo.toml
├── src
│  └── lib.rs
└── tests
   └── integration_tests.rs
```

`src/lib.rs`:

```rs
pub fn add(left: usize, right: usize) -> usize {
    left + right
}
```

`integration_tests.rs`:

```rs
use my_tests;

#[test]
fn integration_test_works() {
    assert_eq!(3, my_tests::add(1, 2));
}
```

`cargo test` executes all tests in this project including ones in `tests` directory.

## How To Make A Utility File

As projects grow, the need to organize code into utility files becomes apparent. This section explores the creation of a utility file and how to prevent Cargo from treating it as an independent integration test.

Let's say the project has grown big and you want to split code into multiple files and make `util.rs`, extracting common functionalities. If you create `tests/util.rs` and run `cargo test`, the result will include the following section.

```
     Running tests/util.rs (target/debug/deps/util-56f0a00bc4335220)

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

Cargo regards `util.rs` as an integration test file. That's because each file under `tests` directory is compiled into an individual executable. The following command exemplifies it:

```
❯ ./target/debug/deps/util-56f0a00bc4335220

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

To avoid having unnecessary output, we can use `mod.rs` to tell Cargo that it's not an integration test. The folder structure will be like:

```
tests
├── integration_tests.rs
└── util
   └── mod.rs
```

`mod.rs`:

```rs
// tests/util/mod.rs
pub fn setup_test() {}
```

`integration_tests.rs` uses `setup_test()` with `mod util;`:

```rs
// tests/integration_tests.rs
use my_tests;
mod util;

#[test]
fn integration_test_works() {
    util::setup_test();
    assert_eq!(3, my_tests::add(1, 2));
}
```

This method is discussed in The Book's [Submodules in Integration Tests
](https://doc.rust-lang.org/book/ch11-03-test-organization.html#submodules-in-integration-tests) section.

Let's see what happens when adding another utility function to `mod.rs`:

```rs
// tests/util/mod.rs
pub fn setup_test() {}
pub fn init_db() {} // <-- Added.
```

Then, `cargo test` warns that `init_db()` is not used:

```
❯ cargo test
warning: function `init_db` is never used
 --> tests/util/mod.rs:2:8
  |
2 | pub fn init_db() {}
  |        ^^^^^^^
  |
  = note: `#[warn(dead_code)]` on by default
```

The warning remains even if there is a new file using both `setup_test()` and `init_db()`. The reason is that `integration_test.rs` and `mod.rs` are compiled as an independent crate, where `init_db()` is not referred to.

To remove this warning, every test file must use every function in `mod.rs,` which is hard to justify. Adding `#[allow(dead_code)]` to all functions in `mod.rs` is also not optimal. Some people complain about this cargo's behavior ([cargo test incorrectly warns for dead code](https://github.com/rust-lang/rust/issues/46379)), but resolving it seems not to be straightforward (as it comes from natural behavior when treating each file under `tests` as a single crate).

However, there is a good way to address this issue.

## One Integration Test Crate With Modules

Managing multiple crates in the `tests` directory can lead to issues. Learning how to put tests into one crate with modules enhances organization and eliminates dead code warnings.

We can make a crate with submodules like:

```
tests
└── integration_tests
   ├── main.rs
   ├── test_a.rs
   ├── test_b.rs
   └── util.rs
```

Now there is only one crate named `integration_tests`, whose source file is `main.rs`.

`main.rs` only declare submodules:

```rs
// main.rs
mod util;
mod test_a;
mod test_b;
```

`test_a.rs` is equivalent to `integration_tests.rs`:

```rs
// test_a.rs
use my_tests;
use crate::util; // <-- util is a submodule of `crate`

#[test]
fn integration_test_works() {
    util::setup_test();
    assert_eq!(3, my_tests::add(1, 2));
}
```

`test_b.rs` is nothing special, but it uses `init_db()` instead of `setup_test()`:

```rs
use my_tests;
use crate::util;

#[test]
fn init_db_works() {
    util::init_db();
    assert_eq!(7, my_tests::add(3, 4));
}
```

`cargo test` no longer warns dead code.

By following this structure, files can easily organized using the ordinal module system. Suppose that `test_a.rs` has become bigger and should be divided. `test_a` folder now has `helper.rs` and `submod.rs`:

```
tests
├── main.rs
├── test_a
│  ├── helper.rs
│  └── submod.rs
├── test_a.rs
├── test_b.rs
└── util.rs
```

`test_a.rs`:

```rs
// tests/test_a.rs
mod helper;
mod submod;
```

`helper.rs`:

```rs
// tests/test_a/helper.rs
pub fn help() {}
```

`submod.rs`:

```rs
// tests/test_a/submod.rs
use my_tests;
use crate::util;
use super::helper; // <-- helper can be accessed via `super`

#[test]
fn integration_test_works() {
    util::setup_test();
    helper::help();
    assert_eq!(13, my_tests::add(6, 7));
}
```

This idea comes from [Zero To Production In Rust](https://www.lpalmieri.com/posts/skeleton-and-principles-for-a-maintainable-test-suite/#sharing-test-helpers) and [Delete Cargo Integration Tests](https://matklad.github.io/2021/02/27/delete-cargo-integration-tests.html).

But why does this work? The reason is implicit Cargo's convention.

## Cargo's Convention

As Cargo follows convention-over-configuration rules, it specially treats some files or folders by default, such as `src/main.rs` or `tests`. `tests/<subdirectory>/main.rs` is a special file as well, and it enables integration tests to have multiple source files. We can confirm that `<subdirectory>` is used as the name of the executable:

```
❯ ./target/debug/deps/integration_tests-ca7ad20fbad0fa3b

running 2 tests
test test_a::integration_test_works ... ok
test test_b::init_db_works ... ok

test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

This convention is described in [The Cargo Book](https://doc.rust-lang.org/cargo/guide/project-layout.html).

## Explicitly Specify The Source File In Cargo.toml

You can control the name of the source file by specifying the file path in `Cargo.toml`:

```
// Cargo.toml
[[test]]
name = "integration"
path = "tests/tests.rs"
```

In this example, `tests/tests.rs` plays the same role as that of `tests/main.rs`, and the name of the output executable is `integration`.

In the real world, [ripgrep](https://github.com/BurntSushi/ripgrep) uses this method. Feel free to check its `Cargo.toml` and `tests` if you are interested.

## Conclusion

In this guide, we've covered various techniques for organizing Rust integration tests, addressing common challenges, and leveraging Cargo's conventions. By adopting these strategies, you can maintain a clean, modular, and warning-free codebase for your Rust projects.

1. `tests/util.rs` is considered an independent integration test
1. `tests/util/mod.rs` is not an integration test, but might cause `dead code` warnings
1. `tests/integration_tests/main.rs` removes the warning and can leverage the module system
1. The naming rule can be altered using the `[[test]]` section in `Cargo.toml`
