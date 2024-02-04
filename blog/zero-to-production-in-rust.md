---
title: "Start backend development with \"Zero To Production In Rust\""
date: "2024-02-04"
tags: "rust, backend"
imagePath: "/blog/relocation-to-vancouver/mark-olsen-K5j1KgecVC8-unsplash.jpg"
photoByName: "Mark Olsen"
photoByUrl: "https://unsplash.com/@markolsen?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
photoOnName: "Unsplash"
photoOnUrl: "https://unsplash.com/photos/K5j1KgecVC8?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
---

# Embarking on Backend Development with "Zero To Production In Rust"

I will summarize what I learned from [Zero To Production In Rust](https://www.zero2prod.com/index.html), which is a book on backend development in Rust.

Through development of a newsletter app, this book covers various topics that are important for the develepment of an API server.

## TDD and User Story

This book consistently starts implementation with tests, which is called Test Driven Development (TDD). While I have heard of it, I personally did not understand its benefit. However, I have realize that one of the biggest value of TDD is to share the vision with others. If you proceed implemention with other people, in a situation like doing pair programming or writing a tech book, TDD is effective to share what you are going to do.

User story plays a similar role in this book. It clarify what the goal is. TDD and user stories it easier to follow this book.

## CI/CD

Before actually wrting code, we made it sure that our main branch is always production-ready by CI (Continuous Integration). Rust provides testing framework (cargo test), linter (cargo clippy), and formatter (cargo fmt) out of the box. Moreover, Rust ecosystem offers code coverage tool ([tarpaulin](https://github.com/xd009642/tarpaulin)), and valunerability checker ([audit](https://crates.io/crates/cargo-audit)).

I found it a good practice to arrange CI at the begging of the development, though wrintg the setting file is not very straightforward, so I will probably have to copy and edit it from somewhere for a while.

CD (Continuous Development) is also covered in this book. Even though CI and CD can be troublesome as they often depends on each platform, this book does not hesitate to talk about them just because they are indeed important for backend development. I admire the authro's attitude.

## Actix Web

[Actix Web](https://actix.rs/) is a web framework that is used in this book entirely. Rust has several frameworks, and Actix Web is one of the most mature ones.

Adding a endpoint is farly simple thanks to its `get` macro.

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

Surprizeingly, this small code accomplishes multithreading REST API servers.

Extracting values, for example query parameters, is also simple. Accessing `http://127.0.0.1:8080/add?lhs=4&rhs=9` shows `4 + 9 = 13`.

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

Actix Web can be instrumented using Middleware, and this book shows some examples like logging or session management.

## Authentication

When it comes to a newsletter app, authentication must not be avoided before sending newsletters. Authentication sounds complicated and tedious, but this book delves into it, explaining essential topics.

The starting point is relatively simple [Basic authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/WWW-Authenticate#basic_authentication). This is based on username and password, and these credentials are sent to the server via `Authorization` HTTP header (`Authorization: Basic <credential>`, credential is a base64-encoded string of `username:password`).

This book goes to SHA, Argon2, and session based authentication to enhance security. Additionally, HMAC (Hash-based Message Authentication Code) is covered during implementing messaging from server to client.

The volume of authentication part is large, which tells me that backend development is inevitably related to security.

## Useful library

Rust's ecosystem is so powerful that it provides a wide variety of libraries that do heavy-lifting instead of us. [sqlx](https://github.com/launchbadge/sqlx) is a SQL toolkit featuring compile-time query checking, used to deal with DBMS including PostgreSQL, MySQL, and SQLite. [serde](https://github.com/serde-rs/serde) is a dominant libary for (de)serializing data structure. [config](https://github.com/mehcode/config-rs) simplifies configuration, reading a file such as JSON, TOML, or YAML, according to a user-defined struct.

This bool levarages several libraries, and at the same time, explains the usage and internals of each library if necessary. This way of adapting library tells me the right balance between utilizing exsisting libraries and understanding them.

## Conclusion

This book gave me an overview of backend development. The features of the newsletter app in this book are only registering and sending emails. At first, I thought this was not very hard, but eventually, I understood each part can be devided into small peices, and every peice has its own difficulty. Newsletter turned out to be an amazing educational resource. Through the journey, this book keeps explaining necessary things in an appropriate way, which I believe is awesome.

While this book provides a great overview of various topics, it does not mean this book alone is enough. Each topic, for instance, CI or authentication, is large enough to write a dedicated book. I think I can prepare to learn things further.
