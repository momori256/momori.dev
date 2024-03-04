---
title: "Building a Lisp-like Language from scratch in Rust"
date: "2024-03-03"
tags: "rust, interpreter, lisp"
imagePath: "/blog/building-a-lisp-like-language-from-scratch-in-rust/emily-morter-8xAA0f9yQnE-unsplash.jpg"
photoByName: "Emily Morter"
photoByUrl: "https://unsplash.com/@emilymorter?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
photoOnName: "Unsplash"
photoOnUrl: "https://unsplash.com/photos/question-mark-neon-signage-8xAA0f9yQnE?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
---

# Building a Lisp-like Language from scratch in Rust

The other day, I read the article [Risp (in (Rust) (Lisp))](https://stopa.io/post/222) by Stepan Parunashvili, which is an exciting tutotial of building Lisp in Rust. It was so inspiring that I came to want to do it by myself, and I created **lip**, an interpreted language designed for performing logical operations using a Lisp-like syntax, which includes logical operations (not, and, or), branching, lambda, and variable definition.

In this post, we'll see how to build an interpreter for Lisp-like language. The language we'll build is **lp**, a small version of lip designed for illustration created by extracting essential parts of lip. Building an iterpreter may sound mysterious, but no knowledge other than Rust basics is requried to read this post.

This post contains all necessary code, but the entire code is available of [the repository](https://github.com/momori256/lip).

To get an overview, examples of lp are like:

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

This may look wired especially if not familiar with Lisp. Lisp uses prefix notation, so the operator comes first, followed by as many operands as you want.

The original Lisp obviously has number type. `(+ 1 2 3 4)` means `1 + 2 + 3 + 4`, and interestingly, `(+)` is 0. The same thing applies to lp: `(& T T F F)` means `(true & true & false & false)`, and `(&)` is true.

**If expression**

```
(if (& T T F)
  (^ F)
  (| F F F))
=> if (true & true & false) { !false } else { false | false | false }
=> false
```

## Table of Contents

## Overview of implementation steps

Given an lp expression `(& T (| F T))`, what will happen until it is evaluated to true at the end? The process contains 3 steps: tokenize, parse, and evaluate.

`Tokenize` means converting the string into a sequence of tokens, valid symbols of lp. `(& T (| F T))` is tokenized to `[left paren, and, true, left paren, or, ...]`.

The next step is constructing an abstract syntax tree (AST) by `parsing` the tokens. AST is a tree expression of code, and the expression `(& T (| F T))` is described in an AST like:

```
   and
  /   \
true  or
     /  \
 false  true
```

Once the AST is built, the last task is `evaluating` it, meaning actually computing the value by traversing the AST. The AST above will be evaluated from the leaves to the root:

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

Now, let's get started.

## Tokenize

Firstly, valid tokens must be defined:

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

You might notice this, but actually tokinizing lp is simple because it is almost tokenized from the start! Each token is separeted by whitespace except for `(` and `)`. Thus, add a whitespace to the parentathes and split:

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

That's it. By the way, the above implementation shows an effective way of using `collect()`. `collect()`for the iterator of `Result<T, U>` can produce `Result<Vec<T>, U>`, building `Vec<U>` by gathering `Ok<T>`, or leaving `Err<U>` if the iterator contains `Err`.

## Parse

Before parsing an expression, it's necessary to define what expression is in lp. Expressions of lp are primitives (`T` and `F`) or logical operations:

```rs
#[derive(Debug, PartialEq, Eq, Clone)]
pub enum Expr {
    Bool(bool),
    Call(Operator, Vec<Expr>),
}
```

Again, the following test clarifies what is expected:

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

I believe the helper functions and constants (`and`, `or`, `T`, `F`) simplify the test code: `and(&[T, or(&[F, T])])` looks concise compared to `Expr::Call(Operator::And, vec![T, Expr::Call(Operator::Or, vec![F, T])])`.

For implementing `parse`, the important insight is that the lp expressions have the recursive structure, meaning `Expr::Call` contains `Expr`, which leads us to think about recursive function to parse it:

```
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

The first two parts have nothing special. If the expression starts without `(`, it must be `T` or `F`. If the first token is `(`, the following token must be an operator.

The most interesting part is parsing operands. It parses expressions while keeping track of the current position.

The first `parse` start from the head, and take `(` and `&` tokens:

```
▼
(& T (| F T))
```

The second `parse` is called recursively and starts from `tokens[2]`. It consumes one token `T` and returns:

```
   ▼
(& T (| F T))
```

The third `parse` is called recursively again, starting from `tokens[3]`. This time, it is the beggining of `or`expression, so the same process of parsing operands starts.

```
     ▼
(& T (| F T))
```

After parsing `or`, `p` points to the last token, which must be `)`:

```
            ▼
(& T (| F T))
```

Lastly, wrap the function and expose only the necessary result:

```
pub fn parse(tokens: &[Token]) -> Result<Expr, LpErr> {
    let (expr, _) = parse_internal(tokens)?;
    Ok(expr)
}

fn parse_internal(tokens: &[Token]) -> Result<Expr, LpErr> {
  // ...
}
```

## Evaluate

Once the hardest part `parse` is done, the rest is remarkably simple! Before talking about the implementation, let's get started with test:

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

As the AST has a recursive structure, naturally the evalation function `eval` is recursive as well.

```rs
#[derive(Debug, PartialEq, Eq)]
pub enum Value {
    Bool(bool),
}

pub fn eval(expr: &Expr) -> Result<Value, LpErr> {
    match expr {
        Expr::Bool(b) => Ok(Value::Bool(*b)), // base case of recursion
        Expr::Call(operator, operands) => {
            let operands: Vec<bool> = operands
                .iter()
                .map(|o| match eval(o) { // eval operands
                    Ok(Value::Bool(b)) => Ok(b),
                    _ => Err(LpErr::Eval(format!("invalid operand: {o:?}"))),
                })
                .collect::<Result<Vec<bool>, LpErr>>()?;

            let value = match operator { // computing the result
                Operator::And => operands.into_iter().all(|o| o),
                Operator::Or => operands.into_iter().any(|o| o),
                Operator::Not => {
                    let len = operands.len();
                    if len != 1 {
                        return Err(LpErr::Eval(format!(
                            "not must have 1 operands, not {len}"
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

Finally, we can evaluate lp code. To wrap things up, let's create a REPL, an interactive environment.

## REPL (Read-Evalueate-Print Loop)

Many interpreted languages have REPL, for example, running `python` launches its REPL, Ruby has `irb`, and even Rust has one such as [evcxr](https://github.com/evcxr/evcxr). Why not lp has one.

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

Let's play with it:

```
lp> (& T (| F T))
=> Bool(true)
lp> (|)
=> Bool(false)
lp> :exit
```

Implementing `std::fmt::Display` for `Value` is a good way to provide nicer output. Feel free to do so.

## If Expression

lp can evaluate complicated expressions, but still it lacks a lot of features that ordinary languages have, like if, for, or function.

Fortunately, adding some features is not very hard. I'll share how to implement `if` expression. The expected result is like the following:

```
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

Let's go through from `tokenize` to `eval`. First, new keyword must be added to `Token`:

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

`parse` also shoud be modified:

```
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

The implementation of `parse_if` is simple because it leverages the existing code. It calls `parse_internal` 3 times to parse condition, then-clause, and else-clause.

The last part `eval` is also straightforward:

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

It may be benefitial to mention that it uses [raw identifier](https://doc.rust-lang.org/rust-by-example/compatibility/raw_identifiers.html) `r#else` to use `else` as a variable.

If expression is implemented relatively easily as it is built on top of existing logic. However, function or defining variable requires more work. Try it by yourself if interested, and check out and use [lip repo](https://github.com/momori256/lip) as a reference.

## Conclusion

We went through the implementation of an interpreter, demysifying it. Both Rust's powerfull features and Lisp's simple sytax makes it easy to parse lp. 

I believe interpreter can be a good practice beyond hello world or to-do app. There are a plenty of room for improvement, and it'll be a good exercise.
