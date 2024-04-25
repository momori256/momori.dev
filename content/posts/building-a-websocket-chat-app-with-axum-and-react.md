+++
title = "Step-by-Step Guide to Building a WebSocket Chat App with Axum and React"
date = 2024-04-22
tags = ["axum", "rust", "react", "websocket"]
cover.image = "https://source.unsplash.com/mZNRsYE9Qi4"
+++


In this guide, we'll walk through the process of creating a full-stack chat app using WebSocket. Our backend will be built with [Axum](https://github.com/tokio-rs/axum), a powerful Rust backend framework, and [Shuttle](https://www.shuttle.rs/), a development platform, while the frontend will be developed using [React](https://react.dev/) and [Vite](https://vitejs.dev/).

We'll cover

- Utilizing WebSocket in Axum and React.
- Generating unique identifiers using nanoid.
- Incorporating telemetry with tracing for enhanced logging.

You can find the complete code for this project on [GitHub](https://github.com/momori256/fullstack-wschat).


## Setup

Let's start by creating a new repository for this project:

```
mkdir fullstack-wschat && cd fullstack-wschat
mkdir frontend backend
```

## Frontend - Test

For simplicity, let's commence with a minimal frontend implementation. We'll start with a single `index.html` file:

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

This simple HTML file establishes a WebSocket connection to ws://localhost:8000 and provides a button to send a test message.

Reference:

- [WebSocket - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket).

## Backend - Echo Server

In the `backend` directory, let's initialize our project with Shuttle:

```
cargo shuttle init . --template axum
```

Here's the Cargo.toml with the required dependencies:

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

And here is the main.rs:

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

We'll create an echo server that simply reflects any messages it receives:

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

We can `recv()` from the socket and `send()` a message to it. Let's see if the backend works properly using the frontend. Run the server by executing `cargo shuttle run`, and open the `index.html` in your browser. If succeeds, you can see some messages in the developer console.

Reference:

- [Module axum::extract::ws - Axum](https://docs.rs/axum/latest/axum/extract/ws/index.html)

## Backend - Broadcast

To handle multiple connections and enable chat functionality, we need to implement a broadcast mechanism. Imagine that three clients have connections to the server. When client A sends a message, the server needs to broadcast the received message to all clients.

```
           ┌────────┐
           │ Server │
           └────────┘
          ╱	   │     ╲
┌────────┐ ┌────────┐ ┌────────┐
│client A│ │client B│ │client C│
└────────┘ └────────┘ └────────┘
```

Every incoming connection is treated as an independent task, a process executed asynchronously by the Tokio runtime. Consequently, we need a way to facilitate data exchange among these tasks. Fortunately, Tokio offers the precise tool for this purpose: the [broadcast](https://docs.rs/tokio/latest/tokio/sync/broadcast/fn.channel.html) channel.

We initialize a sender (or transmitter) and a receiver as follows:

```rs
let (tx, mut rx1) = broadcast::channel(16);
let mut rx2 = tx.subscribe();
```

In our scenario, each task must monitor the broadcast channel while handling client sockets. Hence, the broadcast transmitter `tx` needs to be shared as a state. Let's proceed with implementing state sharing

```rs
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

The `broadcast_tx` is wrapped with `Mutex` and `Arc` to ensure safe sharing among multiple. As mentioned earlier, the handler must process data from two sources: the broadcast channel and the client. Let's outline the implementation with the following code:

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

The initial line splits the socket into a sender and a receiver. While not strictly necessary, this setup enables concurrent read and write operations on the socket and can enhance efficiency compared to locking the entire socket. The `split()` function is provided by the [futures_util](https://rust-lang-nursery.github.io/futures-api-docs/0.3.0-alpha.16/futures_util/stream/struct.SplitStream.html) crate.

Let's start by implementing `recv_from_client`. When a message arrives, we'll forward it to the broadcast channel instead of returning it to the client:

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

Now, let's complete the implementation with `recv_broadcast`:

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

With this setup, we're ready to test our app using the frontend once again.

Reference:

- [Read and write concurrently - Axum](https://docs.rs/axum/latest/axum/extract/ws/index.html#read-and-write-concurrently)

## Frontend - React

To complete our app, we'll build the frontend using React. Currently, our implementation consists of a single HTML file. Let's migrate it to React.

First, let's set up the environment with Vite by executing the following commands within the `frontend` directory. We'll be using React with TypeScript.

```
npm create vite@latest .
npm install
```

Now, let's dive into the frontend implementation:

```tsx
import { FormEvent, useEffect, useState } from "react";

export default function App() {
  const [messages, setMessages] = useState<string[]>([]);
  const [socket, setSocket] = useState<WebSocket | undefined>(undefined);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/");
    socket.onmessage = (e: MessageEvent<string>) =>
      setMessages((prev) => [...prev, e.data]);
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

In this React component:

- We initialize the WebSocket connection within a useEffect hook, ensuring it only happens once when the component mounts.
- We set up a listener for incoming messages, updating the state with each new message received.
- A form allows users to input and send messages, with the submit function handling the form submission by sending the message through the WebSocket connection.

With this implementation, our frontend is now fully functional.

## Improvement - Client ID

Up until now, users can't identify who sent each message. To address this, We'll assign unique IDs to clients when they connect. We'll use [nanoid](https://docs.rs/nanoid/latest/nanoid/) for this purpose.

Let's get started with backend. We'll define a sturct to represent a message:

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

Next, we'll generate an ID for each client and pass it to the handler:

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

In the `recv_from_client` function, we'll combine the `client_id` with a message:

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

To send the client ID along with the message to the client, we'll use a simple format like `client_id:message`:

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

We'll also notify the client of their ID when the connection is established:

```rs
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

Now, let's update the frontend to handle the message.

```tsx
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

Finally, we'll display the IDs alongside the messages:

```tsx
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

Feel free to apply your preferred styling. For reference, a simple CSS style is provided:

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

Let's experiment with [tracing](https://docs.rs/tracing/latest/tracing/) to improve the logging of our server.

In Rust, there are two main logging crates: [log](https://docs.rs/log/0.4.21/log/) and tracing. While both provide logging interfaces, `tracing` offers more structured logging compared to `log`.

`tracing` revolves around three main concepts.

- Span: Represents a time interval that contains events.
- Event: A moment when something happened.
- Subscriber: The component responsible for writing logs.

Let's illustrate these concepts with an example:

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

In this example, `tracing_subscriber` is initialized with some options. The `span!` macro creates a new span, and events occur within that span. The `add` function is decorated with `instrument`, a macro that automatically creates a new span every time the function is executed.

When executed by `RUST_LOG=trace cargo run`, the output will look something like this:

```
2024-04-22T02:53:36.184122Z  INFO my-span: tracing_sample: event 1
2024-04-22T02:53:36.184180Z  WARN my-span: tracing_sample: event 2
2024-04-22T02:53:36.184210Z  INFO my-span:add{a=5 b=19}: tracing_sample: inside add
```

Each line represents an event, including date, time, log level, span name, and message.

In the above example, the environment variable `RUST_LOG` was set to specify logging configuration. The `tracing_subscriber` was initialized with `EnvFilter::from_default_env()`. Since the default log level is `ERROR`, we needed to specify a lower priority threshold to display logs.

To integrate tracing into our server and track client connections and disconnections, we can modify the `handle_socket` function:

```rs
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

We've added `instrument` and some logging to the `handle_socket` function. The initialization code is automatically handled by Shuttle.

The output will resemble:

```
2024-04-21T00:00:01.665-00:00 [Runtime] Starting on 127.0.0.1:8000
2024-04-21T00:00:04.335-00:00 [Runtime]  INFO handle_socket{client_id="6khXi"}: fullstack_wschat::web_socket: connected
2024-04-21T00:00:04.348-00:00 [Runtime]  INFO handle_socket{client_id="C-2r0"}: fullstack_wschat::web_socket: connected
2024-04-21T00:00:04.423-00:00 [Runtime]  INFO handle_socket{client_id="6khXi"}: fullstack_wschat::web_socket: disconnected
```

Although our project may not fully demonstrate the significance of tracing due to its size, this example provides a foundation for understanding its utility.

## Conclusion

In this post, we provided an overview of using WebSocket and building a full-stack application with Axum and React. We explored enhancements such as implementing broadcast functionality with Tokio's broadcast channel, integrating client IDs for user identification, and leveraging tracing for improved logging.
