---
title: "Deploying a Rust WebAssembly (WASM) App to GitHub Pages"
date: "2024-03-05"
tags: "rust, webassembly, githubpages"
imagePath: "blog/deploying-a-rust-wasm-app-to-github-pages/vadim-sherbakov-osSryggkso4-unsplash.jpg"
photoByName: "Vadim Sherbakov"
photoByUrl: "https://unsplash.com/@madebyvadim?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
photoOnName: "Unsplash"
photoOnUrl: "https://unsplash.com/photos/flatlay-photography-of-camera-module-parts-osSryggkso4?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
---

# Deploying a Rust WebAssembly (WASM) App to GitHub Pages

In this tutorial, we'll guide you through the step-by-step process of deploying a Rust WebAssembly (WASM) app on GitHub Pages. The final website will consist of a JavaScript frontend that utilizes WASM, generated from Rust code.

The project we'll use is called `lp`, a logical operation language that [I created earlier](https://momori-nakano.hashnode.dev/building-a-lisp-like-language-from-scratch-in-rust). We won't delve into the implementation details; instead, our focus will be on incorporating WASM into an existing Rust project.

## TL;DR

- `wasm-bindgen` generates `.wasm` and glue JS files.
- `wasm-pack` generates JS files intended to be imported from JS using `wasm-bindgen`.
- `wasm-pack` can generate files suitable for bundlers like `webpack`.

## Table of Contents

## wasm-pack without bundler

The project structure looks like this, and the entire code is available on [GitHub](https://github.com/momori256/lip/tree/main/lp).

```
lp
├── Cargo.toml
└── src
   └── lib.rs
```

Let's begin by adding [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen), a tool that handles the interaction between Rust and JavaScript, to the `Cargo.toml` file:

```toml
[package]
name = "lp"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2.91"
```

Along with adding `wasm-bindgen` as a dependency, the `[lib]` section is also added, specifying the `crate-type` to generate WASM code.

In `lib.rs`, we'll add `#[wasm_bindgen]` attribute to a `struct` and `impl` block, indicating these Rust code should be callable from JavaScript.

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

To build the file for the WASM app, we'll use [wasm-pack](https://github.com/rustwasm/wasm-pack), a tool covering from building Rust to generating a package to be publish to `npm`, though We won't publish our package in this post. Install `wasm-pack` CLI tool by running `cargo install wasm-pack` and execute the following command:

```sh
wasm-pack build --target web --no-pack --out-dir ./www/pkg
```

Some files will be produced in the `www/pkg` directory:

- `lp.js`: an interface file to be imported from other JavaScript files.
- `lp_bg.wasm`: a WASM file that includes the implementation converted from `lib.rs`.
- `.ts.d` includes type definitions.

The `--no-pack` option stops the creation of `package.json`, which is not necessary in our example.

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

The crucial part here is the initial part of `index.js`, where the initialization function and Rust struct are imported. `init()` is an asynchronous function that should be called with `await`.

We can test this app with a local HTTP server, like `miniserve www --index "index.html" -p 8080`.

Before pushing it to GitHub, don't forget to include the `www/pkg` by deleting `www/pkg/.gitignore`. See the [Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) to set up your repository. If you leave the default options, the app will be accessed on https://username.github.io/lp/www/.

## wasm-pack and webpack

While the previous scenario works properly, there is another way to incorporate Rust WASM into JavaScript: using module bundlers. Module bundlers like [webpack](https://webpack.js.org/) can be used to integrate multiple files into a single file.

While using `webpack` makes the process a little more complicated, it's more practical. Let's take a quick look at how to use it with a Rust WASM app.

`wasm-pack` has a `--target bundler` option to generate files suitable for use with a bundler. The build command will be like:

```sh
wasm-pack build --target bundler --out-dir ./www/pkg
```

Next, go to the `www` directory and run the following command to register the `pkg` as a dependency:

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

The `index.html` remains the same, and `index.js` needs a slight modification. Now `lp` is an npm package in the `node_modules` directory, so it is imported like this:

```js
import { Repl } from "lp";

exec();

function exec() { /* ... */ }
```

Run `npm run serve` to launch a web server and open http://localhost:8080. Before pushing it, make sure to execute `npm run build` to generate files (.html, .js, and .wasm) in `www/dist` that should be deployed to GitHub. The final output would be like https://momori256.github.io/lip/lp/www/dist/

## Conclusion

We have covered how to leverage `wasm-bindgen`, `wasm-pack`, and `webpack` to integrate Rust with a JavaScript frontend. For further exploration and comprehensive details, consider referring to the following resources:

- [Deploying Rust and WebAssembly](https://rustwasm.github.io/docs/wasm-bindgen/reference/deployment.html): The `wasm-pack` document about possible build targets.
- [Compiling from Rust to WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly/Rust_to_Wasm): A tutorial of bulding a `hello world` WASM app.
- [JavaScript to Rust and Back Again: A wasm-bindgen Tale](https://hacks.mozilla.org/2018/04/javascript-to-rust-and-back-again-a-wasm-bindgen-tale/): An article about what `wasm-bindgen` is and how it works.
- [Hello wasm-pack!](https://hacks.mozilla.org/2018/04/hello-wasm-pack/): The purpose of `wasm-pack` and the explanation of its process.
