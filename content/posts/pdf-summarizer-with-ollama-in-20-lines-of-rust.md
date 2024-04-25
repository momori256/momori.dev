+++
title = "PDF Summarizer with Ollama in 20 Lines of Rust"
date = 2024-02-10
tags = ["rust", "llm", "ollama", "pdf"]
cover.image = "https://source.unsplash.com/nzyzAUsbV0M"
+++


Explore the simplicity of building a PDF summarization CLI app in Rust using [Ollama](https://ollama.com/), a tool similar to Docker for large language models (LLM). Ollama allows for local LLM execution, unlocking a myriad of possibilities. This post guides you through leveraging Ollama's functionalities from Rust, illustrated by a concise example. Since PDF is a prevalent format for e-books or papers, it would be useful to be able to summarize it.


We'll be employing the following libraries:

- [ollama-rs](https://github.com/pepperoni21/ollama-rs/tree/master), a library for interaction with Ollama
- [pdf-extract](https://github.com/jrmuizel/pdf-extract), utilized for extracting text from PDF
- [tokio](https://tokio.rs/), an asynchronous runtime, and [tokio-stream](https://docs.rs/tokio-stream/latest/tokio_stream/), providing stream utility

```toml
// Cargo.toml
[dependencies]
ollama-rs = { version = "0.1.6", features = ["stream"] }
pdf-extract = "0.7.4"
tokio = { version = "1.36.0", features = ["macros", "rt-multi-thread"] }
tokio-stream = "0.1.14"
```

The app follows these steps:

1. Extract text from the provided PDF
1. Request summarization to LLM

Text extraction:

```rs
let pdf = pdf_extract::extract_text(pdf_path)?;
```

Sending a request:

```rs
let ollama = Ollama::default();
let model = "llama2:latest";
let prompt = format!("Summarize the following text from a PDF file:\n{pdf}");

let request = GenerationRequest::new(model, prompt);
let response = ollama.generate(request).await?;
```

That's it. Let's incorporate command line parameters to specify a PDF path and the model to use. The entire code looks like this:

```rs
use ollama_rs::{generation::completion::request::GenerationRequest, Ollama};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    const USAGE: &str = "Usage: ./summarizer <pdf_path> <model>";

    // Reading values from command-line arguments.
    let mut args = std::env::args().skip(1);
    let pdf_path = args.next().expect(USAGE);
    let model = args.next().expect(USAGE);

    let ollama = Ollama::default();
    let pdf = pdf_extract::extract_text(pdf_path)?;
    let prompt = format!("Summarize the following text from a PDF file:\n{pdf}");

    let request = GenerationRequest::new(model, prompt);
    let response = ollama.generate(request).await?;
    println!("{}", response.response);

    Ok(())
}
```

Running this app, you will see the response from LLM after a while.

```
> cargo run -- sample.pdf llama2:latest

The article discusses the use of `thiserror` and `anyhow` in Rust error handling, which are ...
```

For Utilizing streaming response with `ollama.generate_stream()` instead of `ollama.generate()`:

```rs
let request = GenerationRequest::new(model, prompt);
let mut stream = ollama.generate_stream(request).await?;
while let Some(Ok(responses)) = stream.next().await {
    for res in responses {
        print!("{}", res.response);
    }
}
println!();
```

The code is available on [GitHub](https://github.com/momori256/pdf-summarizer/blob/main/src/bin/summarizer.rs).


Converting a PDF to text allows for easy passage to LLM. By leveraging Ollama, it becomes feasible to run LLM locally, opening up various possibilities.

I've also implemented other functionalities, such as a chatbot using the same stack, so feel free to explore my [GitHub repository](https://github.com/momori256/pdf-summarizer).
