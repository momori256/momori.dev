---
title: "C のエレガンスが詰まった『The C Programming Language』"
date: "2022-11-06"
tags: "c"
imagePath: "/blog/the-c-programming-language/nikhil-mitra-OiUDGKHHuN0-unsplash.jpg"
photoByName: "Nikhil Mitra"
photoByUrl: "https://unsplash.com/@nikhilmitra?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
photoOnName: Unsplash
photoOnUrl: "https://unsplash.com/photos/OiUDGKHHuN0?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
---

# C のエレガンスが詰まった『The C Programming Language』

[『The C Programming Language』](https://s3-us-west-2.amazonaws.com/belllabs-microsite-dritchie/cbook/index.html) は C 言語の教科書です.

最新の第二版が出版されたのが 1988 年ですから流石に時代を感じますが, C の原点を知る歴史読み物的な価値があります.  
個人的に, 配列やポインタ絡みの異常に複雑な型や `typedef` などの文法に疑問や不満を持っていたのですが, 本書を読み一部が解消されました.

## Table of Contents

## コンパクトな言語

C 言語はコンパクトな言語である. 本書はサンプルプログラムを交えつつ C の文法を解説しているが, 付録を除けば約 160 ページしかない. それでいてプログラムを書くのに必要な機能は一通り揃っているから, 小さいことは良いことであるという UNIX 哲学を体現したような言語だと思う.  

本書でよく引き合いに出される Pascal や FORTRAN といった言語が当時は流行っていたのだろうが, 著者の一人である Kernighan は [Why Pascal is Not My Favorite Programming Language](http://www.lysator.liu.se/c/bwk-on-pascal.html) という論文を書いていたようだし, それらの改良版言語という意味もあるのかもしれない. 今となっては一般的となった概念も, C によってもたらされたものは多いのだろう.

## 複雑な型の読み方

配列やポインタ絡みでやたらと型の記述が複雑になるが, その読み方を整理しよう.

### 型を文に翻訳する方法

まずは簡単な型を見てみる.

```c
int *x
```

x は int 型の値を指すポインタである.

```c
int *x[13]
```

x は int 型の値を指すポインタの配列 (サイズ 13) である.

```c
int (*x)[13]
```

x は int 型配列を指すポインタである.  
この辺りから型が何を意味しているのか, なぜ `()` が必要なのかといった疑問を持ち始めるのだが, 更に `char (*(*x())[])()` や `char (*(*x[3])())[5]` といった型も考えられる. これらは以下のルールに従って解読できる.

1. `*` = pointer to
2. `[]` = array of
3. `()` = function returning
4. `*` よりも `[]` と `()` の方が優先順位が高い

まず `int *x[13]` から考えよう.
スタート地点は `x`, つまり変数名である.

```
x is
```

`x` の隣には `*` と `[13]` があるが, 次に適用するのは `[13]` である. なぜなら `*` よりも `[]` の方が優先順位が高いからだ.

```
x is array[13] of
```

次は `*` だ.

```
x is array[13] of pointer to
```

最後に `int` が来て完了となる.

```
x is array[13] of pointer to int
```

このルールを理解すれば `int (*x)[13]` になぜ `(*x)` が必要なのか分かるだろう. `[]` よりも `*` を優先するためだ.

```
x is pointer to array[13] of int
```

関数ポインタにも優先順位のための括弧が必要だ.  
`int (*f)()` は `f is poiner to function returning int` となる. もし `int *f()` だったら `()` が先に解釈されて `f is function returning pointer to int`, つまり `int*` を返す関数を意味する型となる.

複雑な型も同様の手順で読み解ける.

`char (*(*x())[])()` で試してみよう.
`*x()` では `()` が優先されるため, `()` の次に `*` を適用する.

```
x is function returning pointer to
```

`*(*x())[]` では `[]` が `*` よりも先に来る.

```
x is function returning pointer to
  array[] of pointer to
```

次は `(*(*x())[])()` なので `()` を適用する. これまでに `(*(*x())[])` の型が解釈済みであることを考えると, 全体として `char <type>()` という形なので char を返す関数であることは直感的にも分かる.

```
x is function returning pointer to
  array[] of pointer to
  function returning char
```

文にしても長いので実際のところ `x` が何なのかイメージしづらいが, コードでの説明を試みてみる.

```c
#include <assert.h>

// f1 is function returning char.
char f1() { return 'a'; }

// f2 is function returning char.
char f2() { return 'b'; }

// a is array[] of pointer to function returning char.
char (*a[])() = {f1, f2};

// x is function returning pointer to
// array[] of pointer to function returning char.
char (*(*x())[])() { return &a; }

int main() {
  // p is pointer to array[] of pointer to function returning char.
  char (*(*p)[])() = x();
  char r1 = (*p)[0]();
  assert(r1 == 'a');

  // fs is array[] of pointer to function returning char.
  char (**fs)() = *p;
  char r2 = fs[1]();
  assert(r2 == 'b');

  return 0;
}
```

### 文を型に翻訳する

手順を逆に適用すれば型の宣言を書くことも可能である. 以下の文を型に翻訳してみよう.

```
x is
array[] of
pointer to
function returning
pointer to
array of int
```

まず `x is array of` から始める.
```
x[]
```

`x is array[] of pointer to` で `*` を付与する.

```
*x[]
```

`x is array[] of pointer to function returning` では `function returing` に当たる `()` を付け足すのだが, 優先順位に注意が必要だ.

```
(*x[])()
```

`x is array[] of pointer to function returning pointer to` では順当に `*` を追加する.

```
*(*x[])()
```

`x is array[] of pointer to function returning pointer to array of int` で完成だ. ここでも優先順位に気を付けて, `[]` が `*` よりも後に解釈されるようにする必要がある.

```
int (*(*x[])())[]
```

### 型に名前を付ける

型と文を相互に変換する方法は分かったが, それにしても読みにくいのは事実である. そんな時は `typedef` で型に別名を付けるのがおすすめだ.

例えば関数ポインタの配列を考えよう.
文だと `x is array[5] of pointer to function returning int`, 型は `int (*x[5])()` である. ここで関数ポインタに別名を付けると, 型は随分簡単になる. 複雑な型を表記するとき `typedef` が有用であることが分かるだろう.

```c
typedef int (*fp_int_t)();
fp_int_t x[5];
```

ちなみに, これまで `typedef` には疑問を持っていた. 順番が逆ではないかと思っていたのだ. つまり

```
typedef t int
```

のように, 変数やマクロと同じ順番なら良かったのにと思っていたのである. しかし本書を読んで理解したのだが, `typedef` は変数宣言と同じ書き方で型を定義する構文なのだ. つまり変数宣言の先頭に `typedef` を付けることで, 変数の代わりに新たな型を宣言できる.

```c
int a[5];
typedef int a5_t[5];
```

文法上は `typedef` は `static` や `extern` などと同じ場所に書くキーワードなのだ. 小さなことだがようやく納得できた.  
まあそれでも C++ の `using` の方が分かりやすいとは思うが.

## ストレージクラスとリンケージ

`static` や `extern` は文脈に応じて複数の意味を持つ場合があるし, その意味も分かりづらく, いまいち整理が付いていなかった.  
これはストレージクラスとリンケージという二つの概念を把握していなかったからだ.

ストレージクラスは変数の有効期限を指定する属性だ. 定義されたブロックの中でのみ有効なローカルな有効期間と, プログラム全体で有効なグローバルな有効期間の二つがあり, それぞれ `auto` と `static` と呼ばれる.  
`auto` と `static` は変数宣言の先頭に付ける.

```c
auto short x;
static int y = 10;
```

`auto` なんて見たことがなかったのだが, それは省略可能だからだ. 例えばローカル変数の場合, ストレージクラス指定子を省略すると `auto` であることになる. 同様にグローバル変数 (=関数外で定義する変数) には `static` が自動で補われる.

もう一つの概念リンケージは変数や関数を参照可能な範囲についての規則だ. プログラム全体で参照可能なら external リンケージ, ファイル内やそのファイルを include したファイル (=翻訳単位) でのみ参照可能なら internal リンケージを持つ. ブロック内でのみ参照可能ならリンケージなしだ.

ストレージクラスとリンケージという二つの要素が一つのキーワードによって決まるし, 省略されたときのデフォルト値が対象によって異なるので混乱する.

```c
void f1() { // linkage: external.
  int x1; // storage: auto, linkage: none.
  auto int x2; // storage: auto, linkage: none.
  static int x3;  // storage: static, linkage: none.
}

extern void f2(); // linkage: external.
static f3(); // linkage: internal.

int x4; // storage: static, linkage: external.
extern int x5; // storage: static, linkage: external.
```

例えばリンケージ指定子が external/internal/none, ストレージクラス指定子が local/global であれば明確で分かりやすいかもしれない. `internal global int x;` のようなイメージだ.  
しかし `external local` のような宣言はおかしいので `3*2 = 6` 通り存在するわけではないから, 独立に指定できる必要はない. それに毎回の宣言/定義で書くには冗長なので省略可能なのは妥当だと思う.  
`static` が内部リンケージの意味であったり, スコープを抜けても値が保持されるという意味であったりするのは, もしかすると予約語を増やさないという意図もあったのかもしれない. 何かまっとうな理由があったのだろうか.

## 結語

文法はおおよそ知っていましたが, C のコンパクトでエレガントな雰囲気を感じることができました.  
型の読み方やストレージクラス, リンケージなど, よく分かっていなかったことが整理できたり, ANSI C 以前は関数宣言の文法が違っていた, `register` 修飾子というものがあったなど, 知らなかったことを知ることもできました. 本書を読んでいて知らなかった・驚いたのは以下のような事柄です.

- 関数の仮引数がないとき void を書くのは旧式の記法と区別するため
- 関数呼び出しで引数の値をコピーするのは画期的な方法だった
- コンパイラによる最適化のために `const` や `register` 修飾子があった
- int のサイズがマシン依存なのでサイズが変わっても通用するポータブルな書き方が推奨されている
- `goto` は避けるべきと 1988 年の書籍に書かれている (もしかすると初版から?)
- 早期 `continue` はこんなに古くから紹介されているテクニックだった
- `char *s = "..."` のストレージクラスは static, つまり文字列は読み取り専用. ただし `char s[] = "..."` なら `auto` なので文字列を書き換え可能

今では多くの入門書で見られる「hello, world」の元祖が本書であるというのは知っていましたが, 言語の作者が本を書く, サンプルプログラムを交えつつ文法を解説するといったスタイルは, 後世の技術書の基礎となった本だと思いました.
