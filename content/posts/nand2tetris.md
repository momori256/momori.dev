+++
title = "『コンピュータシステムの理論と実装』でハードとソフトをまたいでコンピュータを理解する"
date = 2021-07-18
tags = ["cs"]
cover.image = "https://source.unsplash.com/mSS2r9_RGgA"
+++


コンピュータを 0 から自分の手で作り上げるという意欲的な内容です.
論理ゲートから始まって高水準言語を実装し,その言語で OS を作成するという過程は旅という言葉がしっくりくるほど濃密なものでした.


## 内容

コンピュータの構築を通じてコンピュータ・サイエンスにおける重要なテーマを学びます ( [出版社のサイト](https://www.oreilly.co.jp/books/9784873117126/) ).

- ハードウェア (論理演算, CPU, メモリ)
- ハードとソフト全体が協調するシステムのアーキテクチャ
- プログラミング言語 (コンパイラ, オブジェクト指向)
- OS (メモリ管理, 数学/幾何アルゴリズム, I/O など)
- ソフトウェアエンジニアリング (モジュール化, テスト, API デザインなど)

ハードウェア → ソフトウェアとボトムアップにコンピュータ構築を進めていきます.
ハードウェア編では論理ゲートから始まって CPU とメモリを実装し, 最終的にノイマン型アーキテクチャのコンピュータを作り上げます.
ソフトウェア編ではアセンブラ, バーチャルマシン, コンパイラと進んで高級言語を実装する過程がメインです. 最後に実装した高級言語で OS を作成します.

自分の手で作るということが本書のテーマであり, 各章には説明と仕様だけがあり答えはありません.
ハードウェアの設計にはハードウェア記述言語 (HDL) を用い, シミュレータで実行するので実際に電子部品を組み立てる必要はありません. ソフトウェア編で作成するコンパイラは自分の好みの言語で実装します.

## 感想

ハードウェアの設計は初体験だったのですが, パズルを解くような感覚で楽しめました. 多少苦労した箇所もありましたが, ハードウェア編でかかった時間は各章 2 時間程度でした.

それよりも遥かに苦戦したのはコンパイラの実装です. 今でこそ各章の内容が秩序立って理解できますが, 当初はそもそも何をすれば良いのかわからず, 何度も説明を読んだり試しに実装をしたりしてなんとか進めてきました. ソフトウェア編全体でかかった時間は 100 時間近いと思います. 本書に取り組んでいて迷ったときのコツですが, アセンブラとコンパイラは完成品が提供されているのでその挙動を見ると良いと思います. 私は最初コンパイラが何をすればよいのかさっぱりつかめなかったのですが, 提供されているコンパイラを実行して理解できました.

大変な苦労はしましたが, 全体を通じて有意義な学びが多く取り組んで良かったと思っています. コンピュータの仕組みを実際に作りながら学びたいという方には非常におすすめです.

## 印象に残ったこと

特に印象に残ったこと, 考えたことをまとめます.

## コンピュータの全体を概観する

>"森全体"の美しさを立ち止まって味わう (まえがき xi)

とあるように, ハードウェアとソフトウェアが連携する世界全体を学ぶというテーマに惹かれました.
私はコンピュータ・サイエンスを体系的に学んだことがなく, コンピュータがどのように動いているのか理解していないことに漠然とした居心地の悪さを感じていました. 0 からコンピュータを構築する過程を振り返って, ようやくコンピュータ・サイエンスに入門できたような気分になりました.

自身の手で作っただけあって, 本書のコンピュータのことは全てを把握できます. 実装した高級言語の Jack がどのようにコンパイルされ, どのようにマシンによって実行されるのか, 完全に理解できるのは気分のいいものでした.
おそらく優れたプログラマはコードがどのように実行されるかという低レイヤーの仕組みを意識的/無意識的に理解しているのではないでしょうか. 何事においても基礎を理解することが上達の要だと思っています.

## 複雑なものを分割する

本書では, 複雑なものを分割する, あるいは逆に単純なものを組み合わせて複雑なものを作るという過程が何度も登場します. 論理ゲートから ALU ができるところなどはそのアイデアに感動しましたし, コンパイラをトークナイザ, 構文解析機, バーチャルマシンという複数の部品に分割することで見通しよく実装を進めることができました.

プログラミングでも同様の手法は頻繁に見られます. 一定の処理を関数やクラスにまとめたり, アルゴリズムにも分割統治という考え方があったりします. 同じアプローチがハードとソフト, ミクロとマクロで随所に見られることは興味深い事実だと思いました.
個人的に, この単純なものの組み合わせで複雑なものができるということに美しさを感じます. プログラミングが好きな理由の一つです.

## コンピュータにできること

CPU は意外なほど単純な仕組みなのだと知って驚きました. これまで CPU というのは「魔法の箱」で, 創造もつかない複雑な処理を行っているのだろうと思っていました. しかし, 実際にはデータを移動したり簡単な加工をしたりしているだけの単純なものでした. プログラミング言語のほとんどの機能は標準ライブラリや OS によって実現されているもので, CPU にできることはそれほど多くないということです.
CPU が行うデータの入力, 加工, 出力という流れはプログラムにも当てはまると, ふと気付きました. プログラムには様々なバリエーションがありますが, 入出力や加工の仕方が異なるだけで, 大まかな流れは CPU と同じで, それ以上のことはできません. 要は, あるものの機能はそれが依拠しているものの能力によって規定されるのではないかということです. 物作りが上手く行かないときは, 道具や素材を見直すことも必要かもしれません.

## シンプルさを保つ設計

コンピュータを 0 から作り上げるという本書の内容には嘘がないものの, 最適化とエラー処理は基本的に省略されています. 実用的なものを作るにはこれらの要素は欠かせないものなので, あくまでも本書のコンピュータはおもちゃの域を出ません.
しかし一方で, 枝葉末節にとらわれると本来の目的が希薄化します. その点本書は重要なもののみを注意深く選択することで全体をシンプルに保っており, 設計の妙を感じます.

あとがき的な立ち位置の最終章で, 筆者は本書の執筆を大いに楽しんだと述べています. 『結局のところ, 設計することが最も楽しい作業のひとつ』(p. 315) という一文には多くのエンジニアが共感できるのではないでしょうか.

## 結び

本書で取り扱われるテーマは幅広く, コンピュータ・サイエンスの全体を眺めるには適した本だったと思います. もともと本書を手に取った理由は, コンピュータの仕組みを学べそう, 自力でやるのが楽しそう, というものでしたが, どちらの動機も満足です. 自作するのは苦労した分, 完成したときの感動もひとしおでした. 最後に OS を実装したときには, 思わず Pong ゲームが動作するところを動画にとってしまうほど嬉しかったです.
本書のおかげでソフトウェアの低レイヤーに興味を持てました. 今後はコンパイラや OS について学びを深めて行きたいと思います.
