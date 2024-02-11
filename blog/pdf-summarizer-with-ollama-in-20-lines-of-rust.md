---
title: "PDF Summarizer with Ollama in 20 Lines of Rust"
date: "2024-02-10"
tags: "rust, llm, ollama, pdf"
imagePath: "/blog/rust-error-handling-thiserror-anyhow/emily-morter-8xAA0f9yQnE-unsplash.jpg"
photoByName: "Emily Morter"
photoByUrl: "https://unsplash.com/@emilymorter?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
photoOnName: "Unsplash"
photoOnUrl: "https://unsplash.com/photos/question-mark-neon-signage-8xAA0f9yQnE?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
---

# PDF Summarizer with Ollama in 20 Lines of Rust

Discover the simplicity of building a PDF summarizing CLI app in Rust using [Ollama](https://ollama.com/), a tool like Docker for large language models (LLM). Ollama facilitates running LLM locally and unlocks a realm of possibilities. This post guides you through leveraging Ollama's functionalities from Rust, illustrated by a concise example. PDF is a major format for e-books, so it would be useful to be able to summarize it.

# Implementation

We're going to use these libraries:

- [ollama-rs](https://github.com/pepperoni21/ollama-rs/tree/master) is a library for interation with Ollama
- [pdf-extract](https://github.com/jrmuizel/pdf-extract) will be used to get text from PDF, namely
- [tokio](https://tokio.rs/) is an asynchronus runtime, and [tokio-stream](https://docs.rs/tokio-stream/latest/tokio_stream/) provides stream utility

```toml
// Cargo.toml
[dependencies]
ollama-rs = { version = "0.1.6", features = ["stream"] }
pdf-extract = "0.7.4"
tokio = { version = "1.36.0", features = ["macros", "rt-multi-thread"] }
tokio-stream = "0.1.14"
```

The app has the following steps:

1. Extract text from the provided PDF
1. Request summarization to LLM

Extracting text:

```rs
let pdf = pdf_extract::extract_text(pdf_path)?;
```

Sending request:

```rs
let ollama = Ollama::default();
let model = "llama2:latest";
let prompt = format!("Summarize the following text from a PDF file:\n{pdf}");

let request = GenerationRequest::new(model, prompt);
let response = ollama.generate(request).await?;
```

That's it. Let's take commandline parameters to specify a PDF path and the model to use. The entire code is like:

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

Utilize streaming response with `ollama.generate_stream()` instead of `ollama.generate()`:

```rs
let request = GenerationRequest::new(model, prompt);
let mut stream = ollama.generate_stream(request).await?;
while let Some(Ok(responses)) = stream.next().await {
    for res in responses {
        print!("{}", res.response);
    }
}
```

# Conclusion

Converting a PDF to text enables us to pass it to LLM easily. By using Ollama, it's possible to run LLM locally, which opens various possibility.

I also implemented other functionality such as chatbot using the same stack, so feel free to visit my [GitHub repository](https://github.com/momori256/pdf-summarizer).
