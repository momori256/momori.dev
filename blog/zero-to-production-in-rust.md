---
title: "Embarking on Backend Development with \"Zero To Production In Rust\""
date: "2024-02-04"
tags: "rust, backend"
imagePath: "/blog/zero-to-production-in-rust/scott-rodgerson-5v235ueAU58-unsplash.jpg"
photoByName: "Scott Rodgerson"
photoByUrl: "https://unsplash.com/@scottrodgerson?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
photoOnName: "Unsplash"
photoOnUrl: "https://unsplash.com/photos/a-black-and-white-photo-of-the-word-boo-on-a-machine-5v235ueAU58?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
---

# Embarking on Backend Development with "Zero To Production In Rust"

In this blog post, I will share insights gained from [Zero To Production In Rust](https://www.zero2prod.com/index.html), a comprehensive guide to backend development in Rust.

Through the development of a newsletter app, this book covers various important topics for developing an API server.

## TDD and User Stories: A Shared Vision

This book adopts Test Driven Development (TDD) as a consistent approach, starting implementation with tests. This improves code reliability and, more importantly, facilitates a shared vision when collaborating with others. I think it is effective, especially in scenarios like pair programming. 

User stories play a complementary role by clarifying the goals. TDD and user stories make following this book a seamless experience.

## CI/CD

Before coding, the book emphasizes maintaining a deployable main branch through Continuous Integration (CI). Rust streamlines the process with its built-in tools like `cargo test` for testing, `cargo clippy` for linting, and `cargo fmt` for formatting. Moreover, the Rust ecosystem enriches CI with tools like [tarpaulin](https://github.com/xd009642/tarpaulin) for code coverage and [audit](https://crates.io/crates/cargo-audit) for vulnerability checks.

While setting up CI can be challenging, the book's early commitment to CI highlights its importance in backend development.

Continuous Development (CD) is also discussed. Though CI and CD can be troublesome as they often depend on each platform, this book does not hesitate to delve into these topics. I was impressed by the author's commitment to providing a holistic understanding of backend development.

## Actix Web

[Actix Web](https://actix.rs/), a mature web framework for Rust, is used in this book entirely. A basic endpoint setup is simple thanks to its `get` macro:

```rs
use actix_web::{get, App, HttpResponse, HttpServer};

#[get("/")]
async fn hello() -> HttpResponse {
    HttpResponse::Ok().body("hello, world")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| App::new().service(hello))
        .bind(("127.0.0.1", 8080))?
        .run()
        .await
}
```

Surprisingly, this small code effortlessly accomplishes a multithreaded REST API server.

Extracting values, such as query parameters, is intuitive as well. Accessing `http://127.0.0.1:8080/add?lhs=4&rhs=9` in a browser displays `4 + 9 = 13`.

```rs
use actix_web::{get, web, App, HttpResponse, HttpServer};

#[derive(serde::Deserialize)]
struct Operands {
    lhs: u32,
    rhs: u32,
}

#[get("/add")]
async fn add(operands: web::Query<Operands>) -> HttpResponse {
    let Operands { lhs, rhs } = operands.0;
    HttpResponse::Ok().body(format!("{lhs} + {rhs} = {}", lhs + rhs))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| App::new().service(add))
        .bind(("127.0.0.1", 8080))?
        .run()
        .await
}
```

This book also explores Actix Web's extensibility through its middleware system. Logging and session management are used as examples.

## Authentication: Navigating the Security Landscape

Authentication is a must when publishing a newsletter. Authentication might sound complicated and tedious, but this book delves into it, explaining essential topics.

The starting point is relatively simple [Basic authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/WWW-Authenticate#basic_authentication). This is based on username and password, and these credentials are sent to the server via `Authorization` HTTP header (`Authorization: Basic <credential>`, credential is a base64-encoded string of `username:password`).

This book includes SHA, Argon2, and session-based authentication for better security. Additionally, Hash-based Message Authentication Code (HMAC) is covered for secure server-to-client messaging.

The substantial volume spared on authentication proves its crucial role in backend development.

## Useful Libraries: Leveraging Rust's Ecosystem

Rust's ecosystem provides powerful libraries that do the heavy lifting. [sqlx](https://github.com/launchbadge/sqlx) is a SQL toolkit featuring compile-time query checking. [serde](https://github.com/serde-rs/serde) is a pivotal library for (de)serializing data structure. [config](https://github.com/mehcode/config-rs) simplifies configuration, reading a file such as JSON, TOML, or YAML and constructing a struct.

This book not only utilizes these libraries but also explains their usage and internals to an appropriate extent, striking a balance between leveraging existing tools and understanding them.

## Conclusion

"Zero To Production in Rust" provides a comprehensive overview of backend development. While the newsletter app only has two features, subscribing to the newsletter and sending emails, I ended up realizing this app is a good educational resource as each feature is divided into smaller pieces and each one has its difficulty. This book properly explains essential concepts at every step.

While this book covers a broad range of topics, it serves as a stepping stone. Each topic, like CI or authentication, is substantial enough to be a dedicated book. This book acts as a guide to further learning about specific topics in backend development.
