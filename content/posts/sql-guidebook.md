+++
title = "『達人に学ぶ SQL 徹底指南書』で SQL の可能性を知る"
date = 2022-03-12
tags = ["sql"]
cover.image = "https://source.unsplash.com/so8R5rTDTXM"
+++


本書は SQL 初心者から中級者への架け橋となる本です ([達人に学ぶ SQL 徹底指南書 第 2 版 初級者で終わりたくないあなたへ (翔泳社)](https://www.seshop.com/product/detail/22009)).  
本書の目玉となる case 式やウィンドウ関数を始めとした便利な道具を使いこなすための説明 + 練習問題に加え, SQL の理論的なバックグラウンドや歴史的経緯にも触れて, SQL がなぜそうなっているのかの疑問にも答えます (なぜループや変数がないのか, なぜ NULL 関係の動作が非直感的で複雑なのかなど).  
基本的な構文は一通り分かったけど, 更に脱初心者を目指して学びを深めたい方におすすめです.

本記事では本書で挙げられた便利な道具について触れていきます.


## case 式

case 式は条件分岐を記述するための構文です.  

```sql
CASE
  WHEN [predicate] THEN [value]
  WHEN [predicate] THEN [value]
  ELSE [value] END
```

例を見ると分かりやすいです.  
テスト用にテーブルを作ります. ヤギのデータです.

```sql
create table goats (
  id int PRIMARY KEY,
  weight INT UNSIGNED,
  birthday DATE,
  color VARCHAR(1),
  name VARCHAR(10));

insert into goats values(1, 63, '2016-03-02', 'W', 'Alice');
insert into goats values(2, 79, '2012-06-25', 'W', 'Bob');
insert into goats values(3, 76, '2020-02-01', 'W', 'Carl');
insert into goats values(4, 75, '2022-11-27', 'W', 'Dan');
insert into goats values(5, 70, '2014-08-29', 'B', 'Elie');
insert into goats values(6, 69, '2013-06-07', 'B', 'Fai');
insert into goats values(7, 67, '2013-01-16', 'B', 'Gabi');
insert into goats values(8, 63, '2014-05-14', 'B', 'Helen');
```

```sql
select * from goats;
+----+--------+------------+-------+-------+
| id | weight | birthday   | color | name  |
+----+--------+------------+-------+-------+
|  1 |     63 | 2016-03-02 | W     | Alice |
|  2 |     79 | 2012-06-25 | W     | Bob   |
|  3 |     76 | 2020-02-01 | W     | Carl  |
|  4 |     75 | 2022-11-27 | W     | Dan   |
|  5 |     70 | 2014-08-29 | B     | Elie  |
|  6 |     69 | 2013-06-07 | B     | Fai   |
|  7 |     67 | 2013-01-16 | B     | Gabi  |
|  8 |     63 | 2014-05-14 | B     | Helen |
+----+--------+------------+-------+-------+
```

ヤギの体重が基準値に収まっているかどうかを調べることを考えます.  
以下の基準を満たしている場合は 'OK', 満たしていない場合は 'NG' と表示することにします.
- 白ヤギ (W): 65kg 以上 75kg 以下
- 黒ヤギ (B): 68kg 以上 72kg 以下

SQL で条件分岐をするとなると Where を使うことを考えるかもしれませんが, case 式を使うと次のように書けます.
```sql
SELECT
  id,
  weight,
  color,
  CASE
    WHEN (color = 'W') AND (weight BETWEEN 65 AND 75) THEN 'OK'
    WHEN (color = 'B') AND (weight BETWEEN 68 AND 72) THEN 'OK'
    ELSE 'NG' END as status
FROM
  goats;

+----+--------+-------+--------+
| id | weight | color | status |
+----+--------+-------+--------+
|  1 |     63 | W     | NG     |
|  2 |     79 | W     | NG     |
|  3 |     76 | W     | NG     |
|  4 |     75 | W     | OK     |
|  5 |     70 | B     | OK     |
|  6 |     69 | B     | OK     |
|  7 |     67 | B     | NG     |
|  8 |     63 | B     | NG     |
+----+--------+-------+--------+
```

この case 式の値によってグループ化することも可能です. 例えば OK/NG の個体数を調べるには以下のようにします.

```sql
SELECT
  CASE
    WHEN (color = 'W') AND (weight BETWEEN 65 AND 75) THEN 'OK'
    WHEN (color = 'B') AND (weight BETWEEN 68 AND 72) THEN 'OK'
    ELSE 'NG' END as status,
  count(*)
FROM
  goats
GROUP BY
  status;

+--------+----------+
| status | count(*) |
+--------+----------+
| NG     |        5 |
| OK     |        3 |
+--------+----------+
```

case**式**というのがポイントで, 式を書けるところにはどこにでも書けます. 例えば SELECT 句以外にも, UPDATE で `SET col = CASE WHEN ...` なども可です.
case 式は汎用性, 利便性の高さから本書では 1 章で紹介され, その後随所に登場します.

## ウィンドウ関数

ウィンドウ関数は特定の範囲から複数の列を取り出して処理をするときに便利な道具です. 応用の幅は広いですが, 例えば異なる行同士を比較したり, 集計した値と行を同じ階層で比較したりすることができます.

### 行間比較

まず異なる行同士を比較する例を考えます.  
先程のヤギのテーブルで, 1 つ前の id のヤギより若いヤギを取り出します. このテーブルだと, id が 3, 4, 8 の行が求める結果です.

```sql
select * from goats;
+----+--------+------------+-------+-------+
| id | weight | birthday   | color | name  |
+----+--------+------------+-------+-------+
|  1 |     63 | 2016-03-02 | W     | Alice |
|  2 |     79 | 2012-06-25 | W     | Bob   |
|  3 |     76 | 2020-02-01 | W     | Carl  |
|  4 |     75 | 2022-11-27 | W     | Dan   |
|  5 |     70 | 2014-08-29 | B     | Elie  |
|  6 |     69 | 2013-06-07 | B     | Fai   |
|  7 |     67 | 2013-01-16 | B     | Gabi  |
|  8 |     63 | 2014-05-14 | B     | Helen |
+----+--------+------------+-------+-------+
```

まずはウィンドウ関数を使って, 1 つ前の行を自分の行に持ってきましょう.

```sql
SELECT
  id,
  birthday,
  MAX(birthday) OVER(
    ORDER BY id
    ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING) as prev_birthday
FROM
  goats;

+----+------------+---------------+
| id | birthday   | prev_birthday |
+----+------------+---------------+
|  1 | 2016-03-02 | NULL          |
|  2 | 2012-06-25 | 2016-03-02    |
|  3 | 2020-02-01 | 2012-06-25    |
|  4 | 2022-11-27 | 2020-02-01    |
|  5 | 2014-08-29 | 2022-11-27    |
|  6 | 2013-06-07 | 2014-08-29    |
|  7 | 2013-01-16 | 2013-06-07    |
|  8 | 2014-05-14 | 2013-01-16    |
+----+------------+---------------+
```

上記のクエリの以下の部分がウィンドウ関数です.

```sql
MAX(birthday) OVER(
  ORDER BY id
  ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING)
```

処理は以下のような段階を踏みます.
1. id でソート
2. 1 つ前の行から 1 つ前の行までの行 (=1 つ前の行だけ) を取ってくる
3. 取ってきた範囲の行から, birthday の最大値を求める

今回は直前の 1 行のみを取り出せば良いので, 2 で指定する範囲は, 要は直前の 1 行のみです. 1 行しかないので MAX しなくてもよいはずですが, 構文の制限上集約しなければならないので MAX を使っています. MIN でも構いません.

さて, ここまで来ればあとは簡単です. 上記のテーブルを一時テーブルに置いて, 比較をします.

```sql
SELECT
  id,
  birthday,
  prev_birthday
FROM
  (SELECT
    id,
    birthday,
    MAX(birthday) OVER(
      ORDER BY id
      ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING) as prev_birthday
  FROM
    goats) as TMP
WHERE birthday > prev_birthday;
```

ちなみに, わざわざ一時テーブルに置くのが煩わしいので以下のように書けて欲しいですが, これは構文エラーです.

```sql
SELECT
  id,
  birthday,
  MAX(birthday) OVER(
    ORDER BY id
    ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING) as prev_birthday
FROM
  goats
WHERE
  birthday > prev_birthday; -- WHERE の中で prev_birthday は参照できない.
```

なぜ SELECT で付けた名前を WHERE の中で参照できないのかというと, SQL は
1. FROM
2. WHERE
3. SELECT

の順番で処理されるからです. SELECT は見た目上は一番最初に来ますが, 処理順序は一番最後なのです.  
という説明が本書に書いてあり, なるほどと思いました. とはいえ, 少し気を利かせて SELECT の中で定義された名前を先に見てくれてもいいんじゃないかとは思いますが (ちなみに, case 式の例で紹介した `GROUP BY status` という書き方は例外で, 一部 DBMS でのみ許されます).

今回の例だと, 例えば以下のようにしてウィンドウ関数を使わなくともできますが, 行間比較を行う際に便利なテクニックであることは間違いありません.

```sql
SELECT
  g1.id,
  g1.birthday
FROM
  goats g1
INNER JOIN
  goats g2
  ON g2.id = g1.id - 1
WHERE
  g1.birthday > g2.birthday;
```

### 集約結果とカラムの比較

ではウィンドウ関数 2 つめの利用例, 集約した値を列に持ってくる例を考えます.  
ヤギを白ヤギ/黒ヤギに分けて, それぞれの体重の平均値より軽いか重いかを表示します. このテーブルだと, 平均体重は白ヤギが 73.25kg, 黒ヤギが 67.25kg なので, id が 1, 7, 8 は軽い='Light', 他は重い='Heavy' と表示することにします.

```sql
select * from goats;
+----+--------+------------+-------+-------+
| id | weight | birthday   | color | name  |
+----+--------+------------+-------+-------+
|  1 |     63 | 2016-03-02 | W     | Alice |
|  2 |     79 | 2012-06-25 | W     | Bob   |
|  3 |     76 | 2020-02-01 | W     | Carl  |
|  4 |     75 | 2022-11-27 | W     | Dan   |
|  5 |     70 | 2014-08-29 | B     | Elie  |
|  6 |     69 | 2013-06-07 | B     | Fai   |
|  7 |     67 | 2013-01-16 | B     | Gabi  |
|  8 |     63 | 2014-05-14 | B     | Helen |
+----+--------+------------+-------+-------+
```

まずは白黒ヤギグループの平均を自分の列に持ってきましょう.

```sql
SELECT
  id,
  color,
  weight,
  AVG(weight) OVER(PARTITION BY color) as average
FROM
  goats;

+----+-------+--------+---------+
| id | color | weight | average |
+----+-------+--------+---------+
|  5 | B     |     70 | 67.2500 |
|  6 | B     |     69 | 67.2500 |
|  7 | B     |     67 | 67.2500 |
|  8 | B     |     63 | 67.2500 |
|  1 | W     |     63 | 73.2500 |
|  2 | W     |     79 | 73.2500 |
|  3 | W     |     76 | 73.2500 |
|  4 | W     |     75 | 73.2500 |
+----+-------+--------+---------+
```

`AVG(weight) OVER(PARTITION BY color)` で
1. color によるグループ分け
2. weight の平均値計算

を行っています. 先の例のウィンドウ関数と見た目は異なりますが, ウィンドウ関数には 3 つの領域があり, それらは省略可能です.

```sql
MAX(col) OVER(
     ORDER BY [col]
     PARTITION BY [col]
     ROW/RANGE BETWEEN [start] AND [end])
```

さて, 最後の仕上げとして結果を表示するために case 式を使ってみます.

```sql
SELECT
  id,
  weight,
  color,
  CASE
    WHEN weight < AVG(weight) OVER(PARTITION BY color) THEN 'Light'
    ELSE 'Heavy' END as compare
FROM
  goats;

+----+--------+-------+---------+
| id | weight | color | compare |
+----+--------+-------+---------+
|  5 |     70 | B     | Heavy   |
|  6 |     69 | B     | Heavy   |
|  7 |     67 | B     | Light   |
|  8 |     63 | B     | Light   |
|  1 |     63 | W     | Light   |
|  2 |     79 | W     | Heavy   |
|  3 |     76 | W     | Heavy   |
|  4 |     75 | W     | Heavy   |
+----+--------+-------+---------+
```

### ウィンドウ関数まとめ

本書で紹介されていたウィンドウ関数の主な使いみちは以下の 2 点です.
- 行間比較を簡単にできる
- 集約した結果とカラムという, 階層の異なる値を同時に扱える

従来は相関サブクエリを使ったり, GROUP BY で一時テーブルを作ったりしていた処理を, ウィンドウ関数だとシンプルに書けることも多いでしょう.

## Exists による量化

白黒ヤギのそれぞれで, 最も体重が重いヤギのデータを取得したいとします.  
素直に考えると「他の全てのヤギよりも体重が大きい」データを取ってくれば良いわけですが, 「全ての」をどう SQL で表現するのでしょうか.

条件を「自分より体重が大きいヤギは存在しない」というふうに言い換えることで, 条件を `NOT EXISTS` で表現できます.

```sql
SELECT *
FROM goats g1
WHERE
  NOT EXISTS (
    SELECT * FROM goats g2
    WHERE g2.color = g1.color AND g2.weight > g1.weight);

+----+--------+------------+-------+------+
| id | weight | birthday   | color | name |
+----+--------+------------+-------+------+
|  2 |     79 | 2012-06-25 | W     | Bob  |
|  5 |     70 | 2014-08-29 | B     | Elie |
+----+--------+------------+-------+------+
```

この条件のように, 「全ての〇〇が条件を満たす」や「条件を満たす〇〇が少なくとも 1 つ存在する」というような, 条件を満たすデータの数を指定することを量化といいます.  
SQL には「全ての」に当たる条件を表す構文がないので, 二重否定「条件を**満たさない**ものが 1 つも**存在しない**」に言い換えることになります. 片方だけあればもう片方も表現できるので, SQL には EXISTS しかないのかなと思います.

ちなみにウィンドウ関数を使って以下のようにも書けます.

```sql
SELECT * FROM
  (SELECT
    *,
    MAX(weight) OVER(PARTITION BY color) as max_weight
  FROM goats) as TMP
WHERE weight = max_weight;

+----+--------+------------+-------+------+------------+
| id | weight | birthday   | color | name | max_weight |
+----+--------+------------+-------+------+------------+
|  5 |     70 | 2014-08-29 | B     | Elie |         70 |
|  2 |     79 | 2012-06-25 | W     | Bob  |         79 |
+----+--------+------------+-------+------+------------+
```

## 集合演算

SQL の背後には数学の集合論があります. テーブルを 1 つの集合とみなして, 和差積などの集合演算を行ってみます.

例として以下の 2 つのテーブルを使います.

```
-- A { 1, 2, 3, 4 }, B { 3, 4, 5, 6 }

CREATE TABLE A (value int);
INSERT INTO A values(1);
INSERT INTO A values(2);
INSERT INTO A values(3);
INSERT INTO A values(4);

CREATE TABLE B (value int);
INSERT INTO B values(3);
INSERT INTO B values(4);
INSERT INTO B values(5);
INSERT INTO B values(6);
```

それぞれ演算が用意されているので, それを使うだけです.

```sql
-- A + B { 1, 2, 3, 4, 5, 6 }
SELECT * FROM A
UNION
SELECT * FROM B;

-- A - B { 1, 2 }
SELECT * FROM A
EXCEPT
SELECT * FROM B;

-- A ∧ B { 3, 4 }
SELECT * FROM A
INTERSECT
SELECT * FROM B;
```

ちょっとした応用例として, 抜け番を探すというのをやってみます.  
例えば `{ 1, 3, 4, 7, 9 }` とあったら, 抜け番は `{ 2, 5, 6, 8 }` です.

やり方は色々あると思いますが, 差集合を使って解いてみます. つまり, 1-9 までを全て含んだ集合をまず作成して, そこから引き算するということです.  
連番の作り方ですが, 本書に CROSS JOIN を使った面白い方法が紹介されていました. まず以下のような 0-9 を持つテーブルを用意します.

```sql
select * from digits;
+------+
| n    |
+------+
|    0 |
|    1 |
|    2 |
|    3 |
|    4 |
|    5 |
|    6 |
|    7 |
|    8 |
|    9 |
+------+
```

以下のようにすると 00-99 が作れます.

```sql
SELECT
  d1.n * 10 + d2.n as value
FROM
  digits d1 CROSS JOIN digits d2
ORDER BY
  value;
```

ビューを作っておくと連番をシンプルに記述できて便利です.

```sql
CREATE VIEW Sequence(seq) AS
SELECT
  d1.n * 10 + d2.n as value
FROM
  digits d1 CROSS JOIN digits d2;

-- 15 - 51
SELECT * FROM Sequence
WHERE seq BETWEEN 15 AND 51;
```

ここまでくれば後は簡単ですが, 元の問題に戻って抜け版を探します.

```sql
SELECT seq FROM Sequence
WHERE seq BETWEEN (SELECT MIN(n) FROM X) AND (SELECT MAX(n) FROM X)
EXCEPT
SELECT * FROM X;
```

このように集合演算は時として便利なのですが, 残念ながら DBMS によって実装状況にかなり差があるようで, MySQL には EXCEPT はありませんでした.  
集合論を基礎としてながら基本な集合演算をサポートしていないとはどういうことだと思いますが, 実用上はほとんどの場合必要ないというのも事実かもしれません.

## 結び

本書の目玉である case 式とウィンドウ関数を中心に内容を紹介しました.  
個人的にはそもそも case 式もウィンドウ関数も知らなかったので, どの箇所も非常に勉強になりました.

本記事では紹介しませんでしたが,
- SQL のプログラミング作法についての提言
- RDB の歴史
- NoSQL は破壊的イノベーションになりうるか
- なぜ「関係」データベースなのか, 関係とは何なのか
- 手続き型から集合思考に頭を切り替えるには

といったトピックスが語られていて, これらも興味深く思いました.

SQL は関数型言語と似ていると思っていたのですが, 本書にも同様のことが書いてありました. 関数型の, 入出力の両方ともがリストである関数 (=受け取ったリストを加工してリストを返す関数) と, 入出力が両方とも関係である SQL には似た思想を感じます. 両者とも理論的なバックグラウンドを持っていて, 理論と実践が近い位置にあるのも似ていると思います.

次は実践をするという意味で, 本書でも度々言及されていた『SQL パズル』をやりたいです.  
また, SQL の効率を考えるためには SQL の実装を知らないわけには行かないと感じました. 同じ結果を得るのに複数のクエリの書き方があるとき, どれが一番良いかを判断するには, 結局 SQL を実行するとき内部で何が起きているのかを知っていなければいけないと思うからです.  
本書でも少しパフォーマンスチューニングに触れられていたのですが, できれば自身の手で DBMS を実装して, もっと内部を理解したいところです.
