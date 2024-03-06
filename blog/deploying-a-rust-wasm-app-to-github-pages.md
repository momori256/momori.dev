---
title: "Deploying a Rust WASM App to GitHub Pages"
date: "2024-03-05"
tags: "rust, webassembly, githubpages"
imagePath: "/blog/organize-rust-integration-tests-without-dead-code-warning/dimas-aditya-8dvTZPVEJWk-unsplash.jpg"
photoByName: "dimas aditya"
photoByUrl: "https://unsplash.com/@dimasadityawicaksana?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
photoOnName: "Unsplash"
photoOnUrl: "https://unsplash.com/photos/brown-wooden-crate-with-black-background-8dvTZPVEJWk?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
---

# Deploying a Rust WebAssembly (WASM) App to GitHub Pages

In this post, we'll explore how to deploy a Rust WebAssembly (WASM) app to GitHub Pages step by step. The final website consists of JavaScript frontend and utilizes WASM made from Rust.

The project we'll use is `lp`, a logical operation language that I created before. The implementaion detail is out of interest and you don't have to pay attention it. Rather, we'll focus on introducing WASM to the existing Rust project.

## TL;DR

- `wasm-bindgen` generates `.wasm` and glue JS files
- `wasm-pack` generates JS files intended to be imported from JS using `wasm-bindgen`
- `wasm-pack` can generate files suitable for bundlers like `webpack`

## Table of Contents

## wasm-pack without bundler

The project structure is as follows. The entire code is available on [GitHub](https://github.com/momori256/lip/tree/main/lp).

```
lp
├── Cargo.toml
└── src
   └── lib.rs
```

Let's commence with adding [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen), a tool handles the interaction between Rust and JavaScript.

```toml
[package]
name = "lp"
version = "0.1.0"
edition = "2021"

# See more keys and their definitions at https://doc.rust-lang.org/cargo/reference/manifest.html

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2.91"
```

Along with adding `wasm-bindgen` as a dependency, `[lib]` section is also inserted. The `crate-type` is specified to generate WASM code.

In lib.rs, we'll put `#[wasm_bindgen]` attribute to a `struct` and `impl` block, indicating these Rust code should be able to called by JavaScript.

```rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Repl;

#[wasm_bindgen]
impl Repl {
    pub fn eval(input: &str) -> Result<String, String> {
        tokenizer::tokenize(input)
            .and_then(|tokens| parser::parse(&tokens))
            .and_then(|expr| evaluator::eval(&expr))
            .map(|value| value.to_string())
            .map_err(|e| format!("error: {e}"))
    }
}
```

To build the file for WASM app, we'll use [wasm-pack](https://github.com/rustwasm/wasm-pack), a tool from building Rust to publishing the package to npm, though We won't publish our package in this post. Install `wasm-pack` CLI tool by `cargo install wasm-pack`, and run the following command:

```sh
wasm-pack build --target web --no-pack --out-dir ./www/pkg
```

Some files will be produced to `www/pkg`. 

- `lp.js`: a frontend file to be imported from other JavaScript file
- `lp_bg.wasm`: a WASM file includes the implementation converted from `lib.rs`
- `.ts.d` includes type definitions

`--no-pack` option stops creating `package.json`, which is not necessary in our example.

## HTML and JavaScript to Import WASM

Finally, let's add `index.html` and `index.js`:

```html
<!doctype html>
<html>
  <head>
    <title>lp</title>
    <style>
      :root {
        font-family: monospace;
      }
    </style>
  </head>
  <body>
    <h1>lp (mini (lip))</h1>
    <label for="text">
      Type in lp code
      <input id="text" type="text" />
    </label>
    <button>RUN</button>
    <ol></ol>
    <script type="module" src="./index.js"></script>
  </body>
</html>
```

```js
import init, { Repl } from "./pkg/lp.js";

// Initialization
(async () => {
  await init();
  exec();
})();

function exec() {
  const input = document.querySelector("input");
  const history = document.querySelector("ol");

  document.querySelector("button").addEventListener("click", () => {
    const text = input.value;
    if (!text.length) {
      return;
    }
    let output;
    try {
      output = Repl.eval(text); // Use the Rust function!
    } catch (e) {
      output = e;
    }
    const element = () => {
      const li = document.createElement("li");
      li.innerHTML = `<pre>${text}</pre> => ${output}`;
      return li;
    };
    history.appendChild(element());
    input.value = "";
  });
}
```

The important part here is the initial part of `index.js`, where initialization function and Rust struct is imported. `init()` is an asynchronous function that should be called with `await`.

We can test this app with a local HTTP server, like `miniserve www --index "index.html" -p 8080`. Before pushing it to GitHub, don't forget to include the `www/pkg` by deleting `www/pkg/.gitignore`.

See the [Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) to setup your repository. If you leave the options default, the app is accessed on https://<username>.github.io/lp/www/.

## wasm-pack and webpack

While the previous scenario works properly, there is another way to incorporate Rust WASM to JavaScript: module bundlers. Module bundlers like [webpack](https://webpack.js.org/) can be used to integrate multiple files into a single file.

While using `webpack` makes the process a little complicated, it's more practical. Let's take a quick look at how to use it with a Rust WASM app.

`wasm-pack` has `--target bundler` option to generate files suitable to use with a bundler. The build command will be like:

```sh
wasm-pack build --target bundler --out-dir ./www/pkg
```

Next, go to the `www` directory and run the following command to install include the `pkg` as a dependency:

```
cd www
npm install ./pkg
```

You will see `package.json` created. Add some npm packages for `webpack`:

```sh
npm install -D webpack@5 webpack-cli@5 webpack-dev-server@5 copy-webpack-plugin@12
```

To configure `webpack`, create `webpack.config.js` as follows:

```js
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
  entry: "./index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
  },
  mode: "development",
  experiments: {
    asyncWebAssembly: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "index.html" }],
    }),
  ],
};
```

For convenience, you can add some scripts to `package.json`:

```json
{
  "scripts": {
    "build": "webpack --config webpack.config.js",
    "serve": "webpack serve --config webpack.config.js --open"
  },
  "dependencies": {
    "lp": "file:pkg"
  },
  "devDependencies": {
    "copy-webpack-plugin": "^12.0.2",
    "webpack": "^5.90.3",
    "webpack-cli": "^5.1.4",
    "webpack-dev-server": "^5.0.2"
  }
}
```

The `index.html` remains the same, and `index.js` needs a slight modification. Now `lp` is a npm package in the `node_modules` directory so it is imported like:

```js
import { Repl } from "lp";

exec();

function exec() { /* ... */ }
```

Run `npm run serve` to launch a web server and open http://localhost:8080. Before pushing it, make it sure to execute `npm run build` to generate files (.html, .js and .wasm) that should be deployed to GitHub. It would be like https://momori256.github.io/lip/lp/www/dist/

## Conclusion

We covered how to leverage `wasm-bindgen`, `wasm-pack`, and `webpack` to use Rust with JavaScript frontend.

- [Deploying Rust and WebAssembly](https://rustwasm.github.io/docs/wasm-bindgen/reference/deployment.html): Check all the possible build targets of `wasm-pack`
