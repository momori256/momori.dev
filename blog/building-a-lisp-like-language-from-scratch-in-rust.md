---
title: "Building a Lisp-like Language from scratch in Rust"
date: "2024-03-04"
tags: "rust, interpreter, lisp"
imagePath: "/blog/building-a-lisp-like-language-from-scratch-in-rust/nada-gamal-alR4kJif9W0-unsplash.jpg"
photoByName: "Nada Gamal"
photoByUrl: "https://unsplash.com/@nada_gamal?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
photoOnName: "Unsplash"
photoOnUrl: "https://unsplash.com/photos/red-lipstick-on-white-table-isHJwLRMpqs?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
---

# Building a Lisp-like Language from Scratch in Rust

This post delves into building an interpreter for a Lisp-like language using Rust. No knowledge beyond Rust basics is required to follow this post.

## Table of Contents

## Inspiration and Project Overview

Inspired by Stepan Parunashvili's article [Risp (in (Rust) (Lisp))](https://stopa.io/post/222), I created **lip**, an interpreted language designed for logical operations with a Lisp-like syntax. This supports logical operations (not, and, or), branching (if expression), lambda functions, and variable definition.

This post guides you through the process of building an interpreter, focusing on the core functionalities of tokenizing, parsing, and evaluating expressions. While it may sound complex, the process only requires basic Rust knowledge. The language we'll build is **lp**, a distilled version of lip designed for illustration. The [live demo](https://momori256.github.io/lip/lp/www/) of an lp interpreter is accessible via a browser, and the complete code is available on [GitHub](https://github.com/momori256/lip).

Here are some examples of lp code:

**Literal (T = true, F = false)**

```
T
=> true
```

**Logical operations (not, and, or)**

```
(^ (& T (| F F T)))
=> !(true & (false | false | true))
=> false
```

**If expression**

```
(if (& T T F)
  (^ F)
  (| F F F))
=> if (true & true & false) { !false } else { false | false | false }
=> false
```

The logical operations may look weird especially if not familiar with Lisp. Lisp uses prefix notation, where the operator comes first, followed by as many operands as you want.

The original Lisp has a number type. `(+ 1 2 3 4)` means `1 + 2 + 3 + 4`, and interestingly, `(+)` is 0. The same thing applies to lp: `(& T T F F)` means `(true & true & false & false)`, and `(&)` is true.

## Implementation Steps

To understand how lp code is evaluated, let's break down the process into three steps: tokenize, parse, and evaluate. We'll use the expression `(& T (| F T))` as an example.

Imagine the lp code as a sentence. **Tokenization** is like splitting the sentence into individual words and punctuation marks. In our example, `(& T (| F T))` is tokenized into an array like `[left paren, and, true, left paren, or, ...]`.

Once we have the tokens, we need to understand their structure and meaning. Parsing involves arranging the tokens in a way that reflects their relationships. This is similar to how we understand the grammar of a sentence.

For our example, **parsing** creates an abstract syntax tree (AST), which is a tree-like representation of the expression. The AST for `(& T (| F T))` looks like this:

```
   and
  /   \
true  or
     /  \
 false  true
```

The last task is `evaluation`. Here, the AST is used to compute the final value of the expression. We traverse the AST starting from the leaves to the root:

```
   and
  /   \
true  or
     /  \
 false  true

    ▼

   and
  /   \
true true

    ▼

  true
```

Now that we have grasped the overview of the implementation steps, let's get started with tokenize.

## Tokenize

Let's commence by defining valid tokens:

```rs
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum Operator {
    And, // &
    Or, // |
    Not, // ^
}

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum Token {
    Lparen, // (
    Rparen, // )
    Bool(bool), // T or F
    Operator(Operator),
}
```

Write a unit test to clarify the goal:

```rs
#[derive(Debug)]
pub enum LpErr {
    Tokenize(String),
    Parse(String),
    Eval(String),
}

#[test]
fn tokenize_example_works() -> Result<(), LpErr> {
    let tokens = tokenize("(& T (| F T))")?;
    assert_eq!(
        vec![
            Token::Lparen,
            Token::Operator(Operator::And),
            Token::Bool(true),
            Token::Lparen,
            Token::Operator(Operator::Or),
            Token::Bool(false),
            Token::Bool(true),
            Token::Rparen,
            Token::Rparen,
        ],
        tokens
    );
    Ok(())
}
```

Tokenizing lp is simple because it is almost tokenized from the start! Each token is separated by whitespace except for `(` and `)`. To achieve tokenization, add whitespace to the parenthesis and split the expression:

```rs
pub fn tokenize(expr: &str) -> Result<Vec<Token>, LpErr> {
    expr.replace('(', "( ")
        .replace(')', " )")
        .split_ascii_whitespace()
        .map(|s| match s {
            "(" => Ok(Token::Lparen),
            ")" => Ok(Token::Rparen),
            "T" => Ok(Token::Bool(true)),
            "F" => Ok(Token::Bool(false)),
            "&" => Ok(Token::Operator(Operator::And)),
            "|" => Ok(Token::Operator(Operator::Or)),
            "^" => Ok(Token::Operator(Operator::Not)),
            _ => Err(LpErr::Tokenize(format!("invalid token `{s}`"))),
        })
        .collect::<Result<Vec<Token>, LpErr>>()
}
```

That's it. By the way, the implementation above shows an effective use of `collect()`. It transforms the iterator of `Result<T, U>` into `Result<Vec<T>, U>`, constructing `Vec<U>` by accumulating `Ok<T>`. If the iterator contains `Err<U>`, the result will be `Err<U>`.

## Parse

Before diving into parsing expressions, let's establish what constitutes an expression in lp. Expressions in lp can be primitives (`T` and `F`) or logical operations:

```rs
#[derive(Debug, PartialEq, Eq, Clone)]
pub enum Expr {
    Bool(bool),
    Call(Operator, Vec<Expr>),
}
```

Again, our expectations are clarified by the following test:

```rs
#[test]
fn parse_example_works() -> Result<(), LpErr> {
    let tokens = tokenizer::tokenize("(& T (| F T))")?;
    let expr = parse(&tokens)?;
    assert_eq!(and(&[T, or(&[F, T])]), expr);
    Ok(())
}

const T: Expr = Expr::Bool(true);
const F: Expr = Expr::Bool(false);

fn and(operands: &[Expr]) -> Expr {
    Expr::Call(Operator::And, operands.to_vec())
}

fn or(operands: &[Expr]) -> Expr {
    Expr::Call(Operator::Or, operands.to_vec())
}
```

The helper functions and constants (`and`, `or`, `T`, `F`) simplify the test code. For instance, `and(&[T, or(&[F, T])])` looks concise compared to `Expr::Call(Operator::And, vec![T, Expr::Call(Operator::Or, vec![F, T])])`.

In implementing `parse`, the crucial insight is that lp expression has a recursive structure, where `Expr::Call` contains `Expr`. This naturally leads us to consider  a recursive function for parsing:

```rs
// Returns parsed Expr and the number of consumed tokens if succeeded.
fn parse(tokens: &[Token]) -> Result<(Expr, usize), LpErr> {
    if tokens[0] != Token::Lparen {
        return match tokens[0] {
            Token::Bool(b) => Ok((Expr::Bool(b), 1)),
            _ => Err(LpErr::Parse(format!("invalid expression: `{:?}`", tokens[0]))),
        };
    }

    let operator = match tokens[1] {
        Token::Operator(o) => o,
        _ => return Err(LpErr::Parse(format!("invalid operator: `{:?}`", tokens[1]))),
    };

    // parsing operands
    let mut p = 2;
    let mut operands = vec![];
    while tokens[p] != Token::Rparen {
        let (expr, consumed) = parse(&tokens[p..])?;
        operands.push(expr);
        p += consumed;
    }
    Ok((Expr::Call(operator, operands), p + 1))
}
```

The initial parts of the function handle non-special cases. If the expression doesn't start with `(`, it must be `T` or `F`. If the first token is `(`, the subsequent token is expected to be an operator.

The most intriguing aspect lies in parsing operands. It parses expressions while maintaining the current position.

The first call to `parse` starts from the head, encountering `(` and `&` tokens:

```
▼
(& T (| F T))
```

The second `parse` is called recursively and starts from `tokens[2]`. processing a single token `T` and returns:

```
   ▼
(& T (| F T))
```

The third recursive call commences from `tokens[3]`. This time, it marks the start of an `or` expression, initiating the operand-parsing process.

```
     ▼
(& T (| F T))
```

After parsing `or`, the position `p` points to the last token, which should be `)`:

```
            ▼
(& T (| F T))
```

Finally, we encapsulate the function and expose only the necessary result:

```rs
pub fn parse(tokens: &[Token]) -> Result<Expr, LpErr> {
    let (expr, _) = parse_internal(tokens)?;
    Ok(expr)
}

fn parse_internal(tokens: &[Token]) -> Result<Expr, LpErr> {
  // ...
}
```

## Evaluate

After conquering the challenging part of `parse`, the remainder is surprisingly straightforward! Before delving into the implementation, let's get started with a test:

```rs
#[test]
fn eval_example_works() -> Result<(), LpErr> {
    // (true & (false | true)) => true
    let tokens = tokenizer::tokenize("(& T (| F T))")?;
    let expr = parser::parse(&tokens)?;
    let value = eval(&expr)?;
    assert_eq!(Value::Bool(true), value);
    Ok(())
}
```

Given the recursive structure of AST, it's only natural that the evaluation function `eval` mirrors this recursive design:

```rs
#[derive(Debug, PartialEq, Eq)]
pub enum Value {
    Bool(bool),
}

pub fn eval(expr: &Expr) -> Result<Value, LpErr> {
    match expr {
        Expr::Bool(b) => Ok(Value::Bool(*b)), // Base case of recursion
        Expr::Call(operator, operands) => {
            let operands: Vec<bool> = operands
                .iter()
                .map(|o| match eval(o) { // Eval operands
                    Ok(Value::Bool(b)) => Ok(b),
                    _ => Err(LpErr::Eval(format!("invalid operand: {o:?}"))),
                })
                .collect::<Result<Vec<bool>, LpErr>>()?;

            let value = match operator { // Compute the result
                Operator::And => operands.into_iter().all(|o| o),
                Operator::Or => operands.into_iter().any(|o| o),
                Operator::Not => {
                    let len = operands.len();
                    if len != 1 {
                        return Err(LpErr::Eval(format!(
                            "not must have 1 operand, not {len}"
                        )));
                    }
                    !operands[0]
                }
            };
            Ok(Value::Bool(value))
        }
    }
}
```

Now, the lp code can be evaluated. To wrap things up, let's create a REPL, an interactive environment.

## REPL (Read-Evalueate-Print Loop)

Many interpreted languages boast a REPL. For instance, running `python` launches its REPL, Ruby has `irb`, and even Rust offers one like [evcxr](https://github.com/evcxr/evcxr). Why not have one for lp?

```rs
use std::io::{self, Write};

fn main() -> io::Result<()> {
    loop {
        print!("lp> ");
        io::stdout().flush()?;

        let mut input = String::new();
        io::stdin().read_line(&mut input)?;
        if input.trim() == ":exit" {
            break;
        }

        let result = tokenize(&input)
            .and_then(|tokens| parse(&tokens))
            .and_then(|expr| eval(&expr));

        match result {
            Ok(value) => {
                println!("=> {value:?}");
                io::stdout().flush()?;
            }
            Err(e) => eprintln!("error: {e:?}"),
        }
    }
    Ok(())
}
```

Let's engage with it:

```
lp> (& T (| F T))
=> Bool(true)
lp> (|)
=> Bool(false)
lp> :exit
```

Implementing `std::fmt::Display` for `Value` is a good way to provide a more user-friendly output. Feel free to do so.

## If Expression

While lp can deal with complex expressions, it still lacks many features found in ordinary languages, such as `if`, `for`, or function definition.

Fortunately, incorporating some additional features is not overly complicated. Take `if` as an example. The expected result is like the following:

```rs
#[test]
fn eval_if_works() -> Result<(), LpErr> {
    // if false { true } else { false | false } => false
    let tokens = tokenizer::tokenize("(if F T (| F F))")?;
    let expr = parser::parse(&tokens)?;
    let value = eval(&expr)?;
    assert_eq!(Value::Bool(false), value);
    Ok(())
}
```

Let's walk through the process from `tokenize` to `eval`. First, a new keyword must be added to `Token`:

```rs
pub enum Token {
    Lparen,
    Rparen,
    Bool(bool),
    Operator(Operator),
    If, // <- new
}

pub fn tokenize(expr: &str) -> Result<Vec<Token>, LpErr> {
    expr.replace('(', "( ")
        .replace(')', " )")
        .split_ascii_whitespace()
        .map(|s| match s {
            "(" => Ok(Token::Lparen),
			// ...
            "if" => Ok(Token::If), // <-- new
	// ...
}
```

`parse` also needs modification:

```rs
#[derive(Debug, PartialEq, Eq, Clone)]
pub enum Expr {
    Bool(bool),
    Call(Operator, Vec<Expr>),
    If(Box<Expr>, Box<Expr>, Box<Expr>), // condition, then, else
}

fn parse_internal(tokens: &[Token]) -> Result<(Expr, usize), LpErr> {
    if tokens[0] != Token::Lparen {
	  // ...
    }
    if tokens[1] == Token::If {
        return parse_if(tokens);
    }
    // ...
}

fn parse_if(tokens: &[Token]) -> Result<(Expr, usize), LpErr> {
    let mut p = 2;
    let (cond, consumed) = parse_internal(&tokens[p..])?;
    p += consumed;
    let (then, consumed) = parse_internal(&tokens[p..])?;
    p += consumed;
    let (r#else, consumed) = parse_internal(&tokens[p..])?;
    p += consumed;
    Ok((
        Expr::If(Box::new(cond), Box::new(then), Box::new(r#else)),
        p + 1,
    ))
}
```

The implementation of `parse_if` is straightforward as it leverages existing code. It calls `parse_internal` three times to parse the condition, then-clause, and else-clause.

The last part, `eval`, is also uncomplicated:

```rs
pub fn eval(expr: &Expr) -> Result<Value, LpErr> {
    match expr {
        Expr::Bool(b) => { /* ... */ },
        Expr::Call(operator, operands) => { /* ... */ }
        Expr::If(cond, then, r#else) => {
            let cond = match eval(cond)? {
                Value::Bool(cond) => cond,
            };
            eval(if cond { then } else { r#else })
        }
    }
```

It's worth mentioning that it uses [raw identifier](https://doc.rust-lang.org/rust-by-example/compatibility/raw_identifiers.html) with `r#else` to use `else` as a variable.

`If` is implemented relatively easily. However, adding functions or variable definitions requires more work. Feel free to explore these aspects on your own, and check out and use the [lip repo](https://github.com/momori256/lip) as a reference.

## Conclusion

In this exploration of interpreter implementation, we demystified the process by leveraging Rust's powerful features and embracing Lisp's straightforward syntax.

The journey through building an interpreter extends beyond the typical "hello world" or to-do app projects. It serves as a valuable exercise, showcasing the elegance and flexibility that Rust offers.
