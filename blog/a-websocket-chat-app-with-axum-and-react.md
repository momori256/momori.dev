---
title: "Rust Error Handling: thiserror, anyhow, and When to Use Each"
date: "2024-04-21"
tags: "axum, rust, react, websocket"
imagePath: "/blog/rust-error-handling-thiserror-anyhow/emily-morter-8xAA0f9yQnE-unsplash.jpg"
photoByName: "Emily Morter"
photoByUrl: "https://unsplash.com/@emilymorter?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
photoOnName: "Unsplash"
photoOnUrl: "https://unsplash.com/photos/question-mark-neon-signage-8xAA0f9yQnE?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
---

# A WebSocket Chat App with Axum and React

We'll go through how to build a fullstack chat app using WebSocket. The backend will be build with [Axum](https://github.com/tokio-rs/axum), a backend framework for Rust, and [Shuttle](https://www.shuttle.rs/), a development platform. [React](https://react.dev/) and [Vite](https://vitejs.dev/) will be used for the frontend.

We'll cover

- WebSocket in Axum and React
- Generating unique IDs using nanoid
- Telemetry with tracing

The entire code is available on [GitHub](https://github.com/momori256/fullstack-wschat).

## Setup

To begin with, let's create a new repository for this project.

```
mkdir fullstack-wschat && cd fullstack-wschat
mkdir frontend backend
```

## Frontend - Test

I personally prefer getting started with so small piece of code that I can comprehend what's going on. Implementing both frontend and backend simultaneously can be challenging, so let's regard this single `index.html` as our frontend at this stage:

```html
<!doctype html>
<html>
  <head></head>
  <body>
    <button onclick="socket.send('test')">Send</button>
    <script>
      const socket = new WebSocket("ws://localhost:8000");

      socket.onopen = (e) => {
        console.log("Connected");
      };

      socket.onclose = (e) => {
        console.log("Disconnected");
      };

      socket.onmessage = (e) => {
        console.log(`Received: ${e.data}`);
      };

      socket.onerror = (e) => {
        console.log(`Error: ${e.data}`);
      };
    </script>
  </body>
</html>
```

A socket is initialized by connecting ws://locahost:8000, and event handlers are assigned. The button sends a message. As simple as that.

Reference

- [WebSocket - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket).

## Backend - Echo Server

In `backend` directory, run the following command to initialize it with Shuttle:

```
cargo shuttle init . --template axum
```

Here is the Cargo.toml that includes all dependency needed in this posts:

```
[package]
name = "fullstack-wschat"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = { version = "0.7.4", features = ["ws"] }
futures-util = "0.3.30"
nanoid = "0.4.0"
shuttle-axum = "0.43.0"
shuttle-runtime = "0.43.0"
tokio = "1.28.2"
tracing = "0.1.40"
```

Update the main.rs as the following:

```rs
use axum::{
    extract::{ws::WebSocket, WebSocketUpgrade},
    response::Response,
    routing::get,
    Router,
};

#[shuttle_runtime::main]
async fn main() -> shuttle_axum::ShuttleAxum {
    let router = Router::new().merge(route());
    Ok(router.into())
}

fn route() -> Router {
    Router::new().route("/", get(handler))
}

async fn handler(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket))
}

async fn handle_socket(_ws: WebSocket) {
    todo!()
}
```

Some boilerplate codes are included, but the last function `handle_socket` is the most important.

As a starting point, we create an echo server rather than a chat server for the ease of development. Just exchanging data through WebSocket is as simple as the following:

```rs
async fn handle_socket(mut ws: WebSocket) {
    while let Some(msg) = ws.recv().await {
        let msg = if let Ok(msg) = msg {
            msg
        } else {
            return; // client disconnected
        };
        if ws.send(msg).await.is_err() {
            return; // client disconnected
        }
    }
}
```

We can `recv()` from the socket and `send()` a message to it. Let's see if the backend works properly using the frontend. Run the server by executing `cargo shuttle run`, and open the `index.html` in your browser. If succeeded, you can see some messages in the developer console.

Reference

- [Module axum::extract::ws - Axum](https://docs.rs/axum/latest/axum/extract/ws/index.html)

## Backend - Broadcast

We need to handle multiple connections to implement chat function. Imagine that three client have connections to the server.

```
           ┌────────┐
           │ Server │
           └────────┘
          ╱	   │     ╲
┌────────┐ ┌────────┐ ┌────────┐
│client A│ │client B│ │client C│
└────────┘ └────────┘ └────────┘
```

When client A sends a message, the server needs to broadcast the received message to all clients. Each connection is handled as a task, some process executed by Tokio runtime asynchronouslly. Thus, we need a way to exchange data among all tasks. How do we achieve this behavior? Incidentlly, [Tokio](https://tokio.rs/) provides the exact channel [broadcasat](https://docs.rs/tokio/latest/tokio/sync/broadcast/fn.channel.html).

We can create a sender (or transmitter) and a recever like:

```rs
let (tx, mut rx1) = broadcast::channel(16);
let mut rx2 = tx.subscribe();
```

In our case, each task needs to listen to broadcast channel in addition to the client socket. Therefore, the broadcast transmitter `tx` should be shared as a state. Let's implement state sharing:

```
use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    response::Response,
    routing::get,
    Router,
};
use std::sync::Arc;
use tokio::sync::{
    broadcast::{self, Receiver, Sender},
    Mutex,
};

#[shuttle_runtime::main]
async fn main() -> shuttle_axum::ShuttleAxum {
    let router = Router::new().merge(route());
    Ok(router.into())
}

#[derive(Debug, Clone)]
struct AppState {
    broadcast_tx: Arc<Mutex<Sender<Message>>>,
}

pub fn route() -> Router {
    let (tx, _) = broadcast::channel(32);
    let app = AppState {
        broadcast_tx: Arc::new(Mutex::new(tx)),
    };
    Router::new().route("/", get(handler)).with_state(app)
}

async fn handler(ws: WebSocketUpgrade, State(app): State<AppState>) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, app))
}

async fn handle_socket(ws: WebSocket, app: AppState) {
    todo!()
}
```

The `broadcast_tx` is wrapped with `Mutex` and `Arc` so that multiple tasks can share it safely. As I mentioned earlier, the handler needs to receive data from two sources: the broadcast channel and the client. Suppose that we have functions for those, we can write code like:

```rs
use futures_util::{
    stream::{SplitSink, SplitStream},
    SinkExt, StreamExt,
};

async fn handle_socket(ws: WebSocket, app: AppState) {
    let (ws_tx, ws_rx) = ws.split();
    let ws_tx = Arc::new(Mutex::new(ws_tx));

    {
        let broadcast_rx = app.broadcast_tx.lock().await.subscribe();
        tokio::spawn(async move {
            recv_broadcast(ws_tx, broadcast_rx).await;
        });
    }

    recv_from_client(ws_rx, app.broadcast_tx).await;
}
```

The first line is splitting the socket into a sender and a receiver. It's not necessary, but we can use the socket for writing and reading concurrently. Furthermore, it's a little more efficient than locking the whole socket. The `split()` function is provided by the crate [futures_util](https://rust-lang-nursery.github.io/futures-api-docs/0.3.0-alpha.16/futures_util/stream/struct.SplitStream.html), so don't forget to run `cargo add futures-util`.

Let's implement `recv_from_client` first as we've already implemented it partly. When a message has arrived, send it to the broadcast channel instead of returning it to the client.

```rs
async fn recv_from_client(
    mut client_rx: SplitStream<WebSocket>,
    broadcast_tx: Arc<Mutex<Sender<Message>>>,
) {
    while let Some(Ok(msg)) = client_rx.next().await {
        if matches!(msg, Message::Close(_)) {
            return;
        }
        if broadcast_tx.lock().await.send(msg).is_err() {
            println!("Failed to broadcast a message");
        }
    }
}
```

The remaining part is `recv_broadcast`:

```rs
async fn recv_broadcast(
    client_tx: Arc<Mutex<SplitSink<WebSocket, Message>>>,
    mut broadcast_rx: Receiver<Message>,
) {
    while let Ok(msg) = broadcast_rx.recv().await {
        if client_tx.lock().await.send(msg).await.is_err() {
            return; // disconnected.
        }
    }
}
```

That's it. Let's test it using the frontend again.

Reference

- [Read and write concurrently - Axum](https://docs.rs/axum/latest/axum/extract/ws/index.html#read-and-write-concurrently)

## Frontend - React

The last part is to build a frontend. Our current implementation is just a single HTML file. Let's replace it with React.

The first thing to do is to setup the environment with Vite by running the following command in `frontend` directory. We're going to use React with TypeScript.

```
npm create vite@latest .
npm install
```

I don't talk much about the implementation of the frontend.

```tsx
import { FormEvent, useEffect, useState } from "react";

export default function App() {
  const [messages, setMessages] = useState<string[]>([]);
  const [socket, setSocket] = useState<WebSocket | undefined>(undefined);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/");
    socket.onmessage = (e: MessageEvent<string>) => setMessages((prev) => [...prev, e.data]);
    setSocket(socket);
    return () => socket.close();
  }, []);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!socket) return;
    const form = e.target as typeof e.target & {
      input: { value: string };
    };
    socket.send(form.input.value);
    form.input.value = "";
  };

  return (
    <>
      <h1>WebSocket Chat App</h1>
      <ul>
        {messages.map((body, index) => (
          <li key={index}>{body}</li>
        ))}
      </ul>
      <form onSubmit={submit}>
        <input type="text" name="input" />
        <button type="submit">Send</button>
      </form>
    </>
  );
}
```

Now the socket is initialized using `useEffect`. The messages list is managed as a state, and we can send a message through `<form>`.

## Improvement - Client ID

So far, users can't tell who sent each message. We can indentify users by assigning IDs when they've connected. When it comes to ID, there are some ways to generate it (UUID or auto-incremented integer). We're going to use [nanoid](https://docs.rs/nanoid/latest/nanoid/) for this project.

Let's get started with backend. We need a sturct that represents a message:

```rs
#[derive(Clone)]
struct ChatMessage {
    client_id: String,
    message: Message,
}

impl ChatMessage {
    fn new(client_id: &str, message: Message) -> Self {
        Self {
            client_id: client_id.to_string(),
            message,
        }
    }
}

#[derive(Debug, Clone)]
struct AppState {
    broadcast_tx: Arc<Mutex<Sender<ChatMessage>>>,
}
```

Then, generate an ID for each client and pass it to the handler:

```rs
use nanoid::nanoid;

async fn handler(ws: WebSocketUpgrade, State(app): State<AppState>) -> Response {
    let client_id = nanoid!(5, &nanoid::alphabet::SAFE); // ex. 2Lzri
    ws.on_upgrade(|socket| handle_socket(socket, app, client_id))
}

async fn handle_socket(ws: WebSocket, app: AppState, client_id: String) {
  // ...
}
```

We can combine the `client_id` to build a message in `recv_from_client`:

```rs
async fn recv_from_client(
    client_id: &str,
    mut client_rx: SplitStream<WebSocket>,
    broadcast_tx: Arc<Mutex<Sender<ChatMessage>>>,
) {
    while let Some(Ok(msg)) = client_rx.next().await {
        if matches!(msg, Message::Close(_)) {
            return;
        }
        if broadcast_tx
            .lock()
            .await
            .send(ChatMessage::new(client_id, msg))
            .is_err()
        {
            println!("Failed to broadcast a message");
        }
    }
}
```

To send an ID to the client with message, we can use a simple format like `client_id:message`:

```rs
async fn recv_broadcast(
    client_tx: Arc<Mutex<SplitSink<WebSocket, Message>>>,
    mut broadcast_rx: Receiver<ChatMessage>,
) {
    while let Ok(ChatMessage { message, client_id }) = broadcast_rx.recv().await {
        let msg = if let Ok(msg) = message.to_text() {
            msg
        } else {
            "invalid message"
        };
        if client_tx
            .lock()
            .await
            .send(Message::Text(format!("{client_id}:{msg}")))
            .await
            .is_err()
        {
            return; // disconnected.
        }
    }
}
```

We should notify the client ID to the client when the connection is establised:

```
async fn handle_socket(ws: WebSocket, app: AppState, client_id: String) {
    let (ws_tx, ws_rx) = ws.split();
    let ws_tx = Arc::new(Mutex::new(ws_tx));

    if send_id_to_client(&client_id, ws_tx.clone()).await.is_err() {
        println!("disconnected");
        return;
    }
    // ...
    recv_from_client(&client_id, ws_rx, app.broadcast_tx).await;
}

async fn send_id_to_client(
    client_id: &str,
    client_tx: Arc<Mutex<SplitSink<WebSocket, Message>>>,
) -> Result<(), axum::Error> {
    client_tx
        .lock()
        .await
        .send(Message::Text(client_id.to_string()))
        .await
}
```

Adjust the frontend to handle the message.

```
type Message = {
  clientId: string;
  body: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [socket, setSocket] = useState<WebSocket | undefined>(undefined);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/");
    socket.onmessage = (e: MessageEvent<string>) => {
      const [clientId, body] = e.data.split(":");
      if (body) setMessages((prev) => [...prev, { clientId, body }]);
      else setClientId(clientId);
    };
    setSocket(socket);
    return () => socket.close();
  }, []);
  // ...
}
```

It would be nice to show IDs:

```
return (
  <>
    <h1>WebSocket Chat App</h1>
    <ul>
      {messages.map(({ clientId, body }, index) => (
        <li key={index}>
          <span>{clientId}</span>
          <br />
          {body}
        </li>
      ))}
    </ul>
    <form onSubmit={submit}>
      <p>Post as {clientId}</p>
      <input type="text" name="input" />
      <button type="submit">Send</button>
    </form>
  </>
);
```

By the way, feel free to style it to your hearts content. For your reference, mine is here:

```tsx
// src/index.css
:root {
  font-family: monospace;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

// App.tsx
return (
  <>
    <h1 style={{ padding: "1rem" }}>WebSocket Chat App</h1>
    <ul>
      {messages.map(({ clientId, body }, index) => (
        <li
          key={index}
          style={{ borderBottom: "1px solid black", padding: "1rem" }}
        >
          <span style={{ color: "gray" }}>{clientId}</span>
          <br />
          {body}
        </li>
      ))}
    </ul>
    <form
      onSubmit={submit}
      style={{
        position: "sticky",
        bottom: 0,
        padding: "1rem",
        background: "#FFFFFFA0",
      }}
    >
      <p>Post as {clientId}</p>
      <input type="text" name="input" />
      <button type="submit">Send</button>
    </form>
  </>
);
```

## Improvement - tracing

Let's expemriment with [tracing](https://docs.rs/tracing/latest/tracing/) to improve the logging of our server.

As far as I know, there are two main logging crates in Rust: [log](https://docs.rs/log/0.4.21/log/) and tracing. Both crates provide interfaces, which are implemented by other crates.

 Compared to `log`, `tracing` allows us to have log messages that have a consistant structure. `log` is relatively easy to use, so we'll explore how to use `tracing`.

tracing consists of three main concepts.

- span: time interval that contains events
- event: a moment when something happened
- subscriber: actually writes logs

An example would probably expresses those concepts.

```rs
use tracing::{event, info, span, Level};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

fn main() {
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(EnvFilter::from_default_env())
        .init();

    let span = span!(Level::INFO, "my-span");
    {
        let _enter = span.enter();
        event!(Level::INFO, "event 1");
        event!(Level::WARN, "event 2");

        let _ = add(5, 19);
    }
}

#[tracing::instrument()]
fn add(a: i32, b: i32) -> i32 {
    info!("inside add");
    a + b
}
```

`tracing_subscriber` is the subscriber responsible for outputting logs, which is initialized with some options. `span!` macro creates a new span, and events happen inside of the span. The function `add` is decorated with `instrument`, a macro that automatically creates a new span every time the function is executed.

The output will look like:

```
$ RUST_LOG=trace cargo run
2024-04-22T02:53:36.184122Z  INFO my-span: tracing_sample: event 1
2024-04-22T02:53:36.184180Z  WARN my-span: tracing_sample: event 2
2024-04-22T02:53:36.184210Z  INFO my-span:add{a=5 b=19}: tracing_sample: inside add
```

Each line is an event comprised of date, time, log level, span name, and a message.

Notice that an environment variable `RUST_LOG` was passed. The `tracing_subscriber` was initialized with `EnvFilter::from_default_env()`. Since the default log level is `ERROR`, we need to specify a lower priority threshhold to display logs in the above example.

Let's apply this to our server to track how each client connects and disconnects:

```
use tracing::{error, info};

#[tracing::instrument(skip(ws, app))]
async fn handle_socket(ws: WebSocket, app: AppState, client_id: String) {
    info!("connected");
    let (ws_tx, ws_rx) = ws.split();
    let ws_tx = Arc::new(Mutex::new(ws_tx));

    if send_id_to_client(&client_id, ws_tx.clone()).await.is_err() {
        error!("disconnected");
        return;
    }

    {
        let broadcast_rx = app.broadcast_tx.lock().await.subscribe();
        tokio::spawn(async move {
            recv_broadcast(ws_tx, broadcast_rx).await;
        });
    }

    recv_from_client(&client_id, ws_rx, app.broadcast_tx).await;
    info!("disconnected");
}
```

We just added `instrument` and some logging to the `handle_socket` function. We don't have to write initialization code as Shuttle takes care of it by default.

The output will be like:

```
2024-04-21T00:00:01.665-00:00 [Runtime] Starting on 127.0.0.1:8000
2024-04-21T00:00:04.335-00:00 [Runtime]  INFO handle_socket{client_id="6khXi"}: fullstack_wschat::web_socket: connected
2024-04-21T00:00:04.348-00:00 [Runtime]  INFO handle_socket{client_id="C-2r0"}: fullstack_wschat::web_socket: connected
2024-04-21T00:00:04.423-00:00 [Runtime]  INFO handle_socket{client_id="6khXi"}: fullstack_wschat::web_socket: disconnected
```

Our project is too small to fully realize the importance of tracing, but I hope this provides the key to understanding of it.

## Conclusion
