+++
title = "『例解 UNIX/Linux プログラミング教室』でシステムプログラミングを学ぶ"
date = 2021-09-12
tags = ["linux"]
cover.image = "https://source.unsplash.com/dFohf_GUZJ0"
+++


## 概要

UNIX/Linux の機能を使ったシステムプログラミングを解説する本です (出版社のサイト).
副題は「システムコールを使いこなすための 12 講」であり, システムコールに焦点を当てて 幅広く UNIX の概念について解説するスタイルです. ちなみに, タイトルに UNIX と Linux の 2 つの名前がありますが本書の内容はどちらにも通用するものです.
この記事でも UNIX/Linux 両方について言及する時は省略して UNIX とだけ書きます.

0-4 章はよく使うコマンドなどの UNIX の基礎や C 言語の復習, ファイル入出力などの基本的な内容で, 5 章以降から本題に入る流れです. 5 章以降で扱われるトピックは, プロセス, ファイルシステム, ソケット, シグナル, 端末などです.

UNIX のシステムプログラミングをしたい方や, UNIX 内部の仕組みを知りたいという方におすすめです.

## 印象に残ったこと

### 調べ方を知る

本書は割と分厚い本 (約 500 ページ) ですが辞書ではありません. 大量のシステムコールや UNIX の細かい挙動について網羅的に覚えるのではなく, 必要なときに必要なものを調べられるように概念や機能を学ぶというアプローチです.
このアプローチのおかげか, 序盤に man コマンドの使い方が紹介されています. man コマンド自体はすでに知っていたのですが, 長くて分かりにくいメッセージが表示されるものという印象があってほとんど使ったことはありませんでした. しかし, どこに注目すればよいかが分かれば便利なものだと気付きました.
例えば, 今まではシステムコールやライブラリを使うのに include が必要なヘッダファイルを毎回ネットで検索していたのですが, man で見たほうが早いし正確です (環境によって微妙に必要なヘッダが違うことがあるらしいので). 例えば fork という関数を使いたい場合, 「man fork」で上の方に表示される SYNOPSIS を見ます.

```
FORK(2)

NAME
       fork - create a child process

SYNOPSIS
       #include <sys/types.h>
       #include <unistd.h>

       pid_t fork(void);
```

FORK(2) の 2 はシステムコールという意味です. 1 がシェルコマンド, 3 がライブラリで, これは「man man」の DESCRIPTION に書いてあります (4 以降もありますが, 本書の範囲内ではよく使うのは 1-3 でした). もう 1 つ知っていると便利なこととして, man コマンドでマニュアルが表示されているとき「/」の後に単語を入力すると単語で検索できます. これは man の使い方というよりは less の使い方の Tips ですが.
こんなことは知っている人にとっては常識なのだと思いますが, こういうちょっとしたことが案外大きな影響を与える気がします. 少なくとも毎回ネットで検索してたくさんタブを開きっぱなしにしておかなければならないという億劫な気持ちは薄れました. 最初に調べ方を教えてくれた本書には感謝です.

### シンプルなシェルなら簡単に作れる

5 章以降の内容が本書のメインであり, 全く知らない内容も多くありました. 最初に扱われるトピックがプロセスです. UNIX ではプログラムがプロセスという単位で実行され, fork によってプロセスを複製したり, pipe によってプロセス間通信をしたりできます.
fork, pipe, exec, ファイル入出力を知っていれば簡単なシェルを作ることができるということには感動しました. bash や zsh などのシェルはもっと複雑なのだと思いますが, fork して子プロセスでコマンドを exec するという基礎の仕組み自体はシンプルで, 最低限の機能を持つだけのものなら簡単に作ることができると紹介されていました.

私も 130 行程度の C++ で, 入出力リダイレクトやパイプの機能を持ったシンプルなシェルを作ってみました (ソースコード). 例として次のようなコマンドを実行可能です. $から始まる最初の行が普段使っているシェルで a.out を実行したという意味で,その後は自作のシェルが起動しています.

```sh
$ ./a.out
@ ls
a.out  shell.cpp
@ cat shell.cpp | wc -l > out.txt
@ cat out.txt
130
@ quit
```

ls や cat など単一のコマンドを実行したり, オプション付き (wc -l) のコマンドやパイプ, リダイレクトも可能です.
シェルというとまさにブラックボックスで内部で何を行っているかなど考えたこともなかったのですが, 未知の箱を開けられた感じがして楽しかったです.

### ファイルシステムの仕組み

1 章分がファイルシステムに当てられています. ファイルシステムとはファイルやディレクトリについての仕組み全体のことです.
ディレクトリの階層構造やファイルのアクセス権などがどういう仕組みで実現されているのだろうかと考えたことがあったのですが, まさに知りたかったことが書いてありました.

ファイル本体とは別に, ファイルのメタ情報 (所有者, アクセス権, ファイル本体の場所など) が i ノードとしてある領域に格納されていること, ディレクトリのファイル本体はファイル名と i ノード ID の対応表であるといったことなどが解説されています. たとえばディレクトリのファイルの中には次のような対応表が書かれているということです (値は適当なものです).

| ファイル名 | i ノード ID |
| -------- | ---------- |
| . | 31 |
| .. | 41 |
| shell.cpp | 59 |
| a.out | 26 |


この対応をたどることでファイルシステム全体の木構造を移動することができ, 必要なら i ノード ID によってファイルの詳細を得ることができるという仕組みです. ちなみに, エレベータの前にある案内板 (1F がロビー, B1F が駐車場などのように書いてあるもの) が英語では directory らしく, まさにディレクトリとは対応表のことなのだというのは知れて少しうれしい豆知識でした.
これでファイルやディレクトリの作成/削除/移動といった操作を実現できているのはよく練られた設計だからなのだろうなと思いますが, なぜこういう設計になっているのか納得しきれていない部分はあります. ファイルシステムの実現方法には様々なものがあると思いますが, 他の OS ではどうなっているのかも知りたくなりました.

本書を読んだ動機は, すぐにシステムプログラミングをする必要があるというわけではなく, 単に UNIX の仕組みを知りたかったからというものです. ファイルシステムの仕組みを知ったからといってすぐに使うこともないのですが, 純粋に仕組みを知れて楽しかったです.

### 「全てはファイルである」という抽象化

8 章のトピックはソケット通信です. ソケットプログラミングは以前少しやったことがあるので手を動かしてやりはしなかったのですが, ファイルでもインターネットでも入出力を統一的に扱える UNIX の仕組みには改めて感心しました. 抽象化してシンプルにするという UNIX 哲学を感じます.
パイプもソケットもデバイスも全てファイルの入出力として扱い, プログラムは入力を加工して出力するフィルタであるという考え方は, UNIX が何十年も生き残っていることからしても強力な考え方なのだろうなと思います. とは言っても UNIX を使っている人口は極少ないので, 他の OS には UNIX にはない利点があるということなのでしょうが.

## 結び

数年前からプライベートでは Linux をメインで使っているのですが, ライトに使っているだけで内部の仕組みについてはほとんど知りませんでした.
UNIX の重要な概念を理解でき, システムコールやライブラリを (調べて) 使ってプログラムを書いていくスタイルの感覚を掴むことができました. なんとなく考えていた, こんなコマンドがあったら良いなというアイデアを形にできそうな実感が湧いてきました.
中身の分からないブラックボックスという感覚から一歩進むことができたので, 気が向いたら更に勉強を深めたいと思います.
+++
title = "『例解 UNIX/Linux プログラミング教室』でシステムプログラミングを学ぶ"
date = 2021-09-12
tags = ["linux"]
cover.image = "https://source.unsplash.com/dFohf_GUZJ0"
+++



## 概要

UNIX/Linux の機能を使ったシステムプログラミングを解説する本です (出版社のサイト).
副題は「システムコールを使いこなすための 12 講」であり, システムコールに焦点を当てて 幅広く UNIX の概念について解説するスタイルです. ちなみに, タイトルに UNIX と Linux の 2 つの名前がありますが本書の内容はどちらにも通用するものです.
この記事でも UNIX/Linux 両方について言及する時は省略して UNIX とだけ書きます.

0-4 章はよく使うコマンドなどの UNIX の基礎や C 言語の復習, ファイル入出力などの基本的な内容で, 5 章以降から本題に入る流れです. 5 章以降で扱われるトピックは, プロセス, ファイルシステム, ソケット, シグナル, 端末などです.

UNIX のシステムプログラミングをしたい方や, UNIX 内部の仕組みを知りたいという方におすすめです.

## 印象に残ったこと

### 調べ方を知る

本書は割と分厚い本 (約 500 ページ) ですが辞書ではありません. 大量のシステムコールや UNIX の細かい挙動について網羅的に覚えるのではなく, 必要なときに必要なものを調べられるように概念や機能を学ぶというアプローチです.
このアプローチのおかげか, 序盤に man コマンドの使い方が紹介されています. man コマンド自体はすでに知っていたのですが, 長くて分かりにくいメッセージが表示されるものという印象があってほとんど使ったことはありませんでした. しかし, どこに注目すればよいかが分かれば便利なものだと気付きました.
例えば, 今まではシステムコールやライブラリを使うのに include が必要なヘッダファイルを毎回ネットで検索していたのですが, man で見たほうが早いし正確です (環境によって微妙に必要なヘッダが違うことがあるらしいので). 例えば fork という関数を使いたい場合, 「man fork」で上の方に表示される SYNOPSIS を見ます.

```
FORK(2)

NAME
       fork - create a child process

SYNOPSIS
       #include <sys/types.h>
       #include <unistd.h>

       pid_t fork(void);
```

FORK(2) の 2 はシステムコールという意味です. 1 がシェルコマンド, 3 がライブラリで, これは「man man」の DESCRIPTION に書いてあります (4 以降もありますが, 本書の範囲内ではよく使うのは 1-3 でした). もう 1 つ知っていると便利なこととして, man コマンドでマニュアルが表示されているとき「/」の後に単語を入力すると単語で検索できます. これは man の使い方というよりは less の使い方の Tips ですが.
こんなことは知っている人にとっては常識なのだと思いますが, こういうちょっとしたことが案外大きな影響を与える気がします. 少なくとも毎回ネットで検索してたくさんタブを開きっぱなしにしておかなければならないという億劫な気持ちは薄れました. 最初に調べ方を教えてくれた本書には感謝です.

### シンプルなシェルなら簡単に作れる

5 章以降の内容が本書のメインであり, 全く知らない内容も多くありました. 最初に扱われるトピックがプロセスです. UNIX ではプログラムがプロセスという単位で実行され, fork によってプロセスを複製したり, pipe によってプロセス間通信をしたりできます.
fork, pipe, exec, ファイル入出力を知っていれば簡単なシェルを作ることができるということには感動しました. bash や zsh などのシェルはもっと複雑なのだと思いますが, fork して子プロセスでコマンドを exec するという基礎の仕組み自体はシンプルで, 最低限の機能を持つだけのものなら簡単に作ることができると紹介されていました.

私も 130 行程度の C++ で, 入出力リダイレクトやパイプの機能を持ったシンプルなシェルを作ってみました (ソースコード). 例として次のようなコマンドを実行可能です. $から始まる最初の行が普段使っているシェルで a.out を実行したという意味で,その後は自作のシェルが起動しています.

```sh
$ ./a.out
@ ls
a.out  shell.cpp
@ cat shell.cpp | wc -l > out.txt
@ cat out.txt
130
@ quit
```

ls や cat など単一のコマンドを実行したり, オプション付き (wc -l) のコマンドやパイプ, リダイレクトも可能です.
シェルというとまさにブラックボックスで内部で何を行っているかなど考えたこともなかったのですが, 未知の箱を開けられた感じがして楽しかったです.

### ファイルシステムの仕組み

1 章分がファイルシステムに当てられています. ファイルシステムとはファイルやディレクトリについての仕組み全体のことです.
ディレクトリの階層構造やファイルのアクセス権などがどういう仕組みで実現されているのだろうかと考えたことがあったのですが, まさに知りたかったことが書いてありました.

ファイル本体とは別に, ファイルのメタ情報 (所有者, アクセス権, ファイル本体の場所など) が i ノードとしてある領域に格納されていること, ディレクトリのファイル本体はファイル名と i ノード ID の対応表であるといったことなどが解説されています. たとえばディレクトリのファイルの中には次のような対応表が書かれているということです (値は適当なものです).

| ファイル名 | i ノード ID |
| -------- | ---------- |
| . | 31 |
| .. | 41 |
| shell.cpp | 59 |
| a.out | 26 |


この対応をたどることでファイルシステム全体の木構造を移動することができ, 必要なら i ノード ID によってファイルの詳細を得ることができるという仕組みです. ちなみに, エレベータの前にある案内板 (1F がロビー, B1F が駐車場などのように書いてあるもの) が英語では directory らしく, まさにディレクトリとは対応表のことなのだというのは知れて少しうれしい豆知識でした.
これでファイルやディレクトリの作成/削除/移動といった操作を実現できているのはよく練られた設計だからなのだろうなと思いますが, なぜこういう設計になっているのか納得しきれていない部分はあります. ファイルシステムの実現方法には様々なものがあると思いますが, 他の OS ではどうなっているのかも知りたくなりました.

本書を読んだ動機は, すぐにシステムプログラミングをする必要があるというわけではなく, 単に UNIX の仕組みを知りたかったからというものです. ファイルシステムの仕組みを知ったからといってすぐに使うこともないのですが, 純粋に仕組みを知れて楽しかったです.

### 「全てはファイルである」という抽象化

8 章のトピックはソケット通信です. ソケットプログラミングは以前少しやったことがあるので手を動かしてやりはしなかったのですが, ファイルでもインターネットでも入出力を統一的に扱える UNIX の仕組みには改めて感心しました. 抽象化してシンプルにするという UNIX 哲学を感じます.
パイプもソケットもデバイスも全てファイルの入出力として扱い, プログラムは入力を加工して出力するフィルタであるという考え方は, UNIX が何十年も生き残っていることからしても強力な考え方なのだろうなと思います. とは言っても UNIX を使っている人口は極少ないので, 他の OS には UNIX にはない利点があるということなのでしょうが.

## 結び

数年前からプライベートでは Linux をメインで使っているのですが, ライトに使っているだけで内部の仕組みについてはほとんど知りませんでした.
UNIX の重要な概念を理解でき, システムコールやライブラリを (調べて) 使ってプログラムを書いていくスタイルの感覚を掴むことができました. なんとなく考えていた, こんなコマンドがあったら良いなというアイデアを形にできそうな実感が湧いてきました.
中身の分からないブラックボックスという感覚から一歩進むことができたので, 気が向いたら更に勉強を深めたいと思います.