+++
title = "『SQL パズル』は楽しさと実用を兼ねた SQL 例題集"
date = 2022-05-18
tags = ["sql"]
cover.image = "https://source.unsplash.com/UOk1ghQ7juY"
+++

[『SQL パズル 第 2 版 プログラミングが変わる書き方／考え方』](https://www.seshop.com/product/detail/8321) は SQL 問題集です.  
収録数 75 問という圧巻の豊富さです. 具体的で実用的な題材によって, 問題へのアプローチの仕方や SQL の奥深さを知ることができます.

タイトルには「パズル」とありますが, 本書は決してパズルのためのパズル本ではありません.  
あくまでも実用的な SQL を学ぶことを目的としているので, 実務にも大いに役立つでしょう. 一部まさにパズル的な問題もありますが, それは SQL の幅広さを知る小休止的なものだと思いました.

本書を読まれる方には副読本として [訳者ミックさんのサポートベージ](http://mickindex.sakura.ne.jp/database/db_support_sqlpuzzle.html) をおすすめします.

以下印象に残った問題をいくつか紹介します.  


## パズル 1 「会計年度テーブル」

会計年度を持つ以下のようなテーブルがあります.

```sql
CREATE TABLE FiscalYears (
  fiscal_year INTEGER,
  start_date DATE,
  end_date DATE
);
```

このテーブルは, 各会計年度がいつ始まっていつ終わるのかを格納します. 会計年度は 10/1 から 9/30 までのアメリカ方式とします.
例えば以下のようなデータが入っています.

```
 fiscal_year | start_date |  end_date
-------------+------------+------------
        2021 | 2020-10-01 | 2021-09-30
        2022 | 2021-10-01 | 2022-09-30
```

さて, 問題は「テーブルに不正な値が入らないように制約を付ける」です.

---

できることはいくつかあります.  
まずは各カラムに `NOT NULL` を付けましょう. そして主キー(`PRIMARY KEY`) は`fiscal_year`ですね.

次に `CHECK` 制約を付けていきます.  
1. 開始日と終了日の大小関係について `CHECK (start_date < end_date)`
2. 開始日が 10 月であること `CHECK (EXTARCT(MONTH FROM start_date) = 10)`
3. 開始日が 1 日であること `CHECK (EXTARCT(DAY FROM start_date) = 1)`

という感じで, 完成形は以下のようになります.

```sql
CREATE TABLE FiscalYears
(
  fiscal_year INTEGER NOT NULL PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  CONSTRAINT is_valid_start_date CHECK (
    EXTRACT(YEAR FROM start_date) = fiscal_year - 1
    AND EXTRACT(MONTH FROM start_date) = 10
    AND EXTRACT(DAY FROM start_date) = 1),

  CONSTRAINT is_valid_end_date CHECK (
    EXTRACT(YEAR FROM end_date) = fiscal_year
    AND EXTRACT(MONTH FROM end_date) = 9
    AND EXTRACT(DAY FROM end_date) = 30)
);
```

制約を確かめるには以下のようにします.

```sql
INSERT INTO FiscalYears VALUES (2022, '2021-10-01', '2022-09-30'); -- OK
INSERT INTO FiscalYears VALUES (2021, '2020-10-22', '2021-09-30'); -- NG (invalid start_date)
```

正直なところ, 私はこの問題を見たとき何をすればいいのかさっぱり分かりませんでした.  
そして解説を読んで`PRIMARY KEY`, `NOT NULL`, `UNIQUE`, `CHECK`などの重要性を初めて理解しました. こういった制約を使ってテーブルが正しい値のみを持つようにすれば, 物事は随分簡単になります.

1 問目がこの問題であるのが本書の姿勢を象徴していると思います. パズルのためのパズルではなく, 実用を目的とした本であることが分かります.

## パズル 15「現在の給料と昇給前の給料」

従業員の昇給日と給料を管理する以下のテーブルがあります.

```sql
create table Salaries (
  emp_name varchar(10) not null,
  sal_date date not null,
  sal_amt decimal(8, 2) not null,
  primary key (emp_name, sal_date)
);
```

以下のサンプルデータを使います.

```
 emp_name |  sal_date  | sal_amt
----------+------------+---------
 Tom      | 1996-06-20 |  500.00
 Tom      | 1996-08-20 |  700.00
 Tom      | 1996-10-20 |  800.00
 Tom      | 1996-12-20 |  900.00
 Dick     | 1996-06-20 |  500.00
 Harry    | 1996-06-20 |  500.00
 Harry    | 1996-07-20 |  700.00
```

Tom は 4 回昇給していて, Dick はまだ一度も昇給したことがありません.

さて問題は「各従業員の最新の給料, 昇給日, 昇給前の給料を表示する」です. 要求は以下の出力です.

```
 emp_name | current_salary | prev_salary |  sal_date  
----------+----------------+-------------+------------
 Tom      |         900.00 |      800.00 | 1996-12-20
 Dick     |         500.00 |             | 1996-06-20
 Harry    |         700.00 |      500.00 | 1996-07-20
```

---

私がまず思いつくのは以下のようなクエリです.

```sql
select
  S0.emp_name,
  S0.sal_amt as current_salary,
  S1.sal_amt as prev_salary,
  S0.sal_date
from
  Salaries as S0
  left outer join Salaries as S1
    on S0.emp_name = S1.emp_name
      and S1.sal_date = (
        select max(S2.sal_date)
        from Salaries as S2
        where S2.sal_date < S0.sal_date
      )
where
  S0.sal_date = (
    select max(S3.sal_date)
    from Salaries as S3
    where S3.emp_name = S0.emp_name
  );
```

ポイントは, 別の行を参照するために自己結合をすることです. 順を追って説明します.  
まず愚直に Salaries と Salaries を結合すると以下のようになります.

```sql
select
  *
from
  Salaries as S0
  inner join Salaries as S1
    on S0.emp_name = S1.emp_name;

/*
 emp_name |  sal_date  | sal_amt | emp_name |  sal_date  | sal_amt
----------+------------+---------+----------+------------+---------
 Dick     | 1996-06-20 |  500.00 | Dick     | 1996-06-20 |  500.00
 Harry    | 1996-06-20 |  500.00 | Harry    | 1996-06-20 |  500.00
 Harry    | 1996-06-20 |  500.00 | Harry    | 1996-07-20 |  700.00
 Harry    | 1996-07-20 |  700.00 | Harry    | 1996-06-20 |  500.00
 Harry    | 1996-07-20 |  700.00 | Harry    | 1996-07-20 |  700.00
 Tom      | 1996-06-20 |  500.00 | Tom      | 1996-06-20 |  500.00
 Tom      | 1996-06-20 |  500.00 | Tom      | 1996-08-20 |  700.00
 Tom      | 1996-06-20 |  500.00 | Tom      | 1996-10-20 |  800.00
 (省略. 全 21 行)
*/
```

このテーブルから必要な行のみ取り出します.
まず直近の行のみと結合するようにします. 例えば`Harry - 1996-07-20 - 1996-07-20`の行は不要です.

```sql
select
  *
from
  Salaries as S0
  left outer join Salaries as S1
    on S0.emp_name = S1.emp_name
      and S1.sal_date = (
        select max(S2.sal_date)
        from Salaries as S2
        where S0.emp_name = S2.emp_name
          and S0.sal_date > S2.sal_date
      );

/*
 emp_name |  sal_date  | sal_amt | emp_name |  sal_date  | sal_amt
----------+------------+---------+----------+------------+---------
 Tom      | 1996-06-20 |  500.00 |          |            |
 Tom      | 1996-08-20 |  700.00 | Tom      | 1996-06-20 |  500.00
 Tom      | 1996-10-20 |  800.00 | Tom      | 1996-08-20 |  700.00
 Tom      | 1996-12-20 |  900.00 | Tom      | 1996-10-20 |  800.00
 Dick     | 1996-06-20 |  500.00 |          |            |
 Harry    | 1996-06-20 |  500.00 |          |            |
 Harry    | 1996-07-20 |  700.00 | Harry    | 1996-06-20 |  500.00
*/
```

「`S0.sal_date` の直近の行 = `S0.sal_date` 未満の中で最大の `sal_date`」として結合条件を加えています.

ここまでくればあと一息で, 最後に最新の sal_date を持つ行のみに絞ります.

```sql
select
  *
from
  Salaries as S0
  left outer join Salaries as S1
    on S0.emp_name = S1.emp_name
      and S1.sal_date = (
        select max(S2.sal_date)
        from Salaries as S2
        where S0.emp_name = S2.emp_name
          and S0.sal_date > S2.sal_date
      )
where
  S0.sal_date = (
    select max(S3.sal_date)
    from Salaries as S3
    where S3.emp_name = S0.emp_name
  );

/*
 emp_name |  sal_date  | sal_amt | emp_name |  sal_date  | sal_amt
----------+------------+---------+----------+------------+---------
 Tom      | 1996-12-20 |  900.00 | Tom      | 1996-10-20 |  800.00
 Dick     | 1996-06-20 |  500.00 |          |            |
 Harry    | 1996-07-20 |  700.00 | Harry    | 1996-06-20 |  500.00
*/
```

最終的な見た目は少し複雑ですが, 順を追って見ていけば理解しやすいですね. 問題が複雑になるとクエリは巨大化しがちですが, 分かりやすくする方法があるでしょうか.
普通のプログラミングなら途中の結果を変数に置いたり, ある程度の処理を関数にまとめたりすることで全体を分割して理解しやすくすることができますが, SQL は基本的にそういうことはできないので悩みどころです.

もう一つ Window 関数を使った解答も紹介します.

```sql
select
  emp_name,
  sal_amt,
  prev_sal_amt,
  sal_date
from
(
  select
    emp_name,
    sal_amt,
    sal_date,
    lag(sal_amt) over (partition by emp_name order by sal_date),
    row_number() over (partition by emp_name order by sal_date desc)
  from
    Salaries
) as T(emp_name, sal_amt, sal_date, prev_sal_amt, rn)
where
  rn = 1;
```

サブクエリの結果を見ると意味が分かりやすいです.

```sql
select
  emp_name,
  sal_amt,
  sal_date,
  lag(sal_amt) over (partition by emp_name order by sal_date),
  row_number() over (partition by emp_name order by sal_date desc)
from
  Salaries;

/*
 emp_name | sal_amt |  sal_date  |  lag   | row_number
----------+---------+------------+--------+------------
 Dick     |  500.00 | 1996-06-20 |        |          1
 Harry    |  500.00 | 1996-06-20 |        |          2
 Harry    |  700.00 | 1996-07-20 | 500.00 |          1
 Tom      |  500.00 | 1996-06-20 |        |          4
 Tom      |  700.00 | 1996-08-20 | 500.00 |          3
 Tom      |  800.00 | 1996-10-20 | 700.00 |          2
 Tom      |  900.00 | 1996-12-20 | 800.00 |          1
*/
```

Window 関数の `lag()` で直近の行を取得して, `row_number()` を使って最新のデータのみを選択します.  
ちなみに Window 関数や case 式, `NOT EXISTS`による全称量化などのテクニックは当たり前のものとして出てくるので『達人に学ぶ SQL 徹底指南書』を先に読んでおいて良かったなと思いました.

この問題, 提供者が著名なシステムコンサルタントに相談したところ「そんなクエリを書くことはできない」と言われたそうです. オリジナルの問題には SQL-89 に準拠するというルールがあるので難しくなっていますが, 闘志を燃やした著者は 9 つも解答を掲載しています.  
本書ではこの問題に限らず複数の解答が紹介されていることが多いです. 一つ解答を思いついても, 別解を考えてみるのは良い練習になりました.

## パズル 20「テスト結果」

テストの結果を保持しているテーブルがあるとします.

```sql
create table TestResults (
  test_name varchar(10) not null,
  test_step integer not null,
  comp_date date, -- NULL means not completed yet
  primary key (test_name, test_step)
);
```

テストはいくつかのステップを含んでいて, 各ステップが終了すると終了日が `comp_date` に記録されます.  
サンプルデータは以下のものを使います.

```
 test_name | test_step | comp_date
-----------+-----------+------------
 A         |         1 | 2022-01-01
 A         |         2 | 2022-01-02
 A         |         3 | 2022-01-03
 B         |         1 | 2022-01-01
 B         |         2 |
 B         |         3 | 2022-01-03
```

問題は「すべてのステップが完了しているテストを表示する」です. テスト A はすべて完了済みですが, B はステップ 2 が完了していません.

---

`NULL`を上手く扱った綺麗な解答を紹介します.

```sql
select
  test_name
from
  TestResults
group by
  test_name
having
  count(*) = count(comp_date);
```

ポイントは having 句です. `count()`は `NULL` をカウントしないことを利用して `comp_date` に `NULL` が含まれないものを抽出しています.  
`NULL`の扱いは直感的でなくて厄介なこともあるのですが, 上手く使うと良いこともあるという例です.

## パズル 61「文字列をソートする」

A, B, C, D の 4 種類の文字で構成された文字列をソートする問題です.

```sql
create table Strings (
  str char(7) not null
    check (str similar to '[ABCD]{7}')
);

insert into Strings values ('CABBDBC'), ('ABCABCA');

/* Required results.
   str
---------
 ABBBCCD
 AAABBCC
*/
```

---

解答は以下のクエリです.

```sql
select
  repeat('A', (char_length(str) - char_length(replace(str, 'A', ''))))
  || repeat('B', (char_length(str) - char_length(replace(str, 'B', ''))))
  || repeat('C', (char_length(str) - char_length(replace(str, 'C', ''))))
  || repeat('D', (char_length(str) - char_length(replace(str, 'D', ''))))
from
  Strings;
```

A, B, C, D の 4 種類の文字しか使われていないことに着目して, ソート後の文字列は AA...BB...CC...DD という形になることを利用します. つまり「A の個数分 A を並べた文字列 + B の個数分 B を並べた文字列 + ...」ということです.

では A の個数をどうやって求めるかですが, 少しトリッキーな方法を使っています. 元の文字列の A を空白に置換した文字列を用意して, いくつ長さが減少したかによって A の個数を計算します.

```sql
char_length(str) - char_length(replace(str, 'A', ''))
```

RDBMS によっては該当する関数がないかもしれませんが, パズル的な問題として面白い題材なのでお気に入りです.

## パズル 62「レポートの整形」

適当なデータを持ったテーブルを考えます.

```sql
create table Names (
  name varchar(10) not null primary key
);

insert into Names values
  ('Ai'), ('Bill'), ('Chika'),
  ('Dan'), ('Emi'), ('Fuku'),
  ('Gouto'), ('Hina'), ('Ichika'),
  ('Jun'), ('Ken'), ('Lan'),
  ('Momori'), ('Norio');
```

このテーブルのデータを 3 列で表示することができるでしょうか？

```
 name1  | name2 | name3
--------+-------+--------
 Ai     | Bill  | Chika
 Dan    | Emi   | Fuku
 Gouto  | Hina  | Ichika
 Jun    | Ken   | Lan
 Momori | Norio |
```

---

まずは 2 列から考えます.  
二列目に表示するのは, 一列目の直後の名前です.

```sql
select
  N0.name as name1, min(N1.name) as name2
from
  Names as N0
  left outer join Names as N1
    on N0.name < N1.name
group by
  N0.name
order by
  N0.name;

/*
 name1  | name2
--------+--------
 Ai     | Bill
 Bill   | Chika
 Chika  | Dan
 Dan    | Emi
 Emi    | Fuku
 Fuku   | Gouto
 Gouto  | Hina
 Hina   | Ichika
 Ichika | Jun
 Jun    | Ken
 Ken    | Lan
 Lan    | Momori
 Momori | Norio
 Norio  |
*/
```

しかしこれだと不要な行も含まれています. 偶数番目の行を除くため, 条件を追加します.

```sql
select
  N0.name as name1, min(N1.name) as name2
from
  Names as N0
  left outer join Names as N1
    on N0.name < N1.name
group by
  N0.name
having
  mod((select count(*) from Names) - (select count(*) from Names where name > N0.name), 2) = 1
order by
  N0.name;

/*
 name1  | name2
--------+-------
 Ai     | Bill
 Chika  | Dan
 Emi    | Fuku
 Gouto  | Hina
 Ichika | Jun
 Ken    | Lan
 Momori | Norio
*/
```

要は 1, 3, 5, ...番目の行だけを抽出できれば良いので, 行数を 2 で割った余りが 1 の行のみ抽出しています (`row_number()`を使っても良いですね).  
さて, ではこれを 3 列に拡張します.

```sql
select
  N0.name as name1, min(N1.name) as name2, min(N2.name) as name3
from
  Names as N0
  left outer join Names as N1
    on N0.name < N1.name
  left outer join Names as N2
    on N1.name < N2.name
group by
  N0.name
having
  mod((select count(*) from Names) - (select count(*) from Names where name > N0.name), 3) = 1
order by
  N0.name;
```

結果を整えるのは SQL の役目ではないので, そもそもこの問題のようなことは本来やるべきではありません. しかしパズルとしては面白いです（し, もしかすると SQL で整形しないといけないことがあるかもしれません）.  
結果の整形はフロントエンドでやるべきということは当然理解しているのでしょうが, なんと 6 つの解答が紹介されています. 世界中のデータベースエンジニアの無邪気な情熱が伝わってきます. よくもまあこんなに色々思いつくなぁと感心してしまいました.

## 結語

良いと思った問題は他にもたくさんあるのですが, 流石にすべて紹介することはできないのでこの辺りで終わりにしておきます.  

一問一問が濃密で, 気づいたら一問に一時間以上掛けていたことが何度もありました.  
知らないことを都度調べたり, 試行錯誤を繰り返したことで随分時間は掛かりましたが, その分得るものはあったと思います. 序盤は特に苦労していましたが, 30 問目辺りでそこそこ複雑なクエリがスムーズに書けたときは少し成長を実感しました. 初心者は脱した感がありますが、まだ理解しきれていない部分もあるので, いつかまた再読すると得るものがありそうです.

読んでいて疑問に思ったのは, 複数ある解答の良し悪しをどう判断するかということです.  
明らかにシンプルで分かりやすいクエリは良いと分かりますが, そうではない場合どう判断すればよいのか分かっていません. 例えばパズル 15「現在の給料と昇給前の給料」で紹介した 2 つの解答はどちらが良いのでしょう.

おそらく, 判断のためには SQL の内部を知る必要があるのではないかと思います（実行計画, インデックスの仕組み, 一時テーブルの扱いなど?）.
というわけで, 次は SQL の中身を知るような勉強をしたいと思いました. また, それとは別にデータベース全体の設計も学びがいがありそうです.  
書籍だと『プログラマのための SQL』『プログラマのための SQL』『達人に学ぶ DB 設計 徹底指南書』辺りかなぁと思っています.
+++
title = "『SQL パズル』は楽しさと実用を兼ねた SQL 例題集"
date = 2022-05-18
tags = ["sql"]
cover.image = "https://source.unsplash.com/UOk1ghQ7juY"
+++


[『SQL パズル 第 2 版 プログラミングが変わる書き方／考え方』](https://www.seshop.com/product/detail/8321) は SQL 問題集です.  
収録数 75 問という圧巻の豊富さです. 具体的で実用的な題材によって, 問題へのアプローチの仕方や SQL の奥深さを知ることができます.

タイトルには「パズル」とありますが, 本書は決してパズルのためのパズル本ではありません.  
あくまでも実用的な SQL を学ぶことを目的としているので, 実務にも大いに役立つでしょう. 一部まさにパズル的な問題もありますが, それは SQL の幅広さを知る小休止的なものだと思いました.

本書を読まれる方には副読本として [訳者ミックさんのサポートベージ](http://mickindex.sakura.ne.jp/database/db_support_sqlpuzzle.html) をおすすめします.

以下印象に残った問題をいくつか紹介します.  


## パズル 1 「会計年度テーブル」

会計年度を持つ以下のようなテーブルがあります.

```sql
CREATE TABLE FiscalYears (
  fiscal_year INTEGER,
  start_date DATE,
  end_date DATE
);
```

このテーブルは, 各会計年度がいつ始まっていつ終わるのかを格納します. 会計年度は 10/1 から 9/30 までのアメリカ方式とします.
例えば以下のようなデータが入っています.

```
 fiscal_year | start_date |  end_date
-------------+------------+------------
        2021 | 2020-10-01 | 2021-09-30
        2022 | 2021-10-01 | 2022-09-30
```

さて, 問題は「テーブルに不正な値が入らないように制約を付ける」です.

---

できることはいくつかあります.  
まずは各カラムに `NOT NULL` を付けましょう. そして主キー(`PRIMARY KEY`) は`fiscal_year`ですね.

次に `CHECK` 制約を付けていきます.  
1. 開始日と終了日の大小関係について `CHECK (start_date < end_date)`
2. 開始日が 10 月であること `CHECK (EXTARCT(MONTH FROM start_date) = 10)`
3. 開始日が 1 日であること `CHECK (EXTARCT(DAY FROM start_date) = 1)`

という感じで, 完成形は以下のようになります.

```sql
CREATE TABLE FiscalYears
(
  fiscal_year INTEGER NOT NULL PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  CONSTRAINT is_valid_start_date CHECK (
    EXTRACT(YEAR FROM start_date) = fiscal_year - 1
    AND EXTRACT(MONTH FROM start_date) = 10
    AND EXTRACT(DAY FROM start_date) = 1),

  CONSTRAINT is_valid_end_date CHECK (
    EXTRACT(YEAR FROM end_date) = fiscal_year
    AND EXTRACT(MONTH FROM end_date) = 9
    AND EXTRACT(DAY FROM end_date) = 30)
);
```

制約を確かめるには以下のようにします.

```sql
INSERT INTO FiscalYears VALUES (2022, '2021-10-01', '2022-09-30'); -- OK
INSERT INTO FiscalYears VALUES (2021, '2020-10-22', '2021-09-30'); -- NG (invalid start_date)
```

正直なところ, 私はこの問題を見たとき何をすればいいのかさっぱり分かりませんでした.  
そして解説を読んで`PRIMARY KEY`, `NOT NULL`, `UNIQUE`, `CHECK`などの重要性を初めて理解しました. こういった制約を使ってテーブルが正しい値のみを持つようにすれば, 物事は随分簡単になります.

1 問目がこの問題であるのが本書の姿勢を象徴していると思います. パズルのためのパズルではなく, 実用を目的とした本であることが分かります.

## パズル 15「現在の給料と昇給前の給料」

従業員の昇給日と給料を管理する以下のテーブルがあります.

```sql
create table Salaries (
  emp_name varchar(10) not null,
  sal_date date not null,
  sal_amt decimal(8, 2) not null,
  primary key (emp_name, sal_date)
);
```

以下のサンプルデータを使います.

```
 emp_name |  sal_date  | sal_amt
----------+------------+---------
 Tom      | 1996-06-20 |  500.00
 Tom      | 1996-08-20 |  700.00
 Tom      | 1996-10-20 |  800.00
 Tom      | 1996-12-20 |  900.00
 Dick     | 1996-06-20 |  500.00
 Harry    | 1996-06-20 |  500.00
 Harry    | 1996-07-20 |  700.00
```

Tom は 4 回昇給していて, Dick はまだ一度も昇給したことがありません.

さて問題は「各従業員の最新の給料, 昇給日, 昇給前の給料を表示する」です. 要求は以下の出力です.

```
 emp_name | current_salary | prev_salary |  sal_date  
----------+----------------+-------------+------------
 Tom      |         900.00 |      800.00 | 1996-12-20
 Dick     |         500.00 |             | 1996-06-20
 Harry    |         700.00 |      500.00 | 1996-07-20
```

---

私がまず思いつくのは以下のようなクエリです.

```sql
select
  S0.emp_name,
  S0.sal_amt as current_salary,
  S1.sal_amt as prev_salary,
  S0.sal_date
from
  Salaries as S0
  left outer join Salaries as S1
    on S0.emp_name = S1.emp_name
      and S1.sal_date = (
        select max(S2.sal_date)
        from Salaries as S2
        where S2.sal_date < S0.sal_date
      )
where
  S0.sal_date = (
    select max(S3.sal_date)
    from Salaries as S3
    where S3.emp_name = S0.emp_name
  );
```

ポイントは, 別の行を参照するために自己結合をすることです. 順を追って説明します.  
まず愚直に Salaries と Salaries を結合すると以下のようになります.

```sql
select
  *
from
  Salaries as S0
  inner join Salaries as S1
    on S0.emp_name = S1.emp_name;

/*
 emp_name |  sal_date  | sal_amt | emp_name |  sal_date  | sal_amt
----------+------------+---------+----------+------------+---------
 Dick     | 1996-06-20 |  500.00 | Dick     | 1996-06-20 |  500.00
 Harry    | 1996-06-20 |  500.00 | Harry    | 1996-06-20 |  500.00
 Harry    | 1996-06-20 |  500.00 | Harry    | 1996-07-20 |  700.00
 Harry    | 1996-07-20 |  700.00 | Harry    | 1996-06-20 |  500.00
 Harry    | 1996-07-20 |  700.00 | Harry    | 1996-07-20 |  700.00
 Tom      | 1996-06-20 |  500.00 | Tom      | 1996-06-20 |  500.00
 Tom      | 1996-06-20 |  500.00 | Tom      | 1996-08-20 |  700.00
 Tom      | 1996-06-20 |  500.00 | Tom      | 1996-10-20 |  800.00
 (省略. 全 21 行)
*/
```

このテーブルから必要な行のみ取り出します.
まず直近の行のみと結合するようにします. 例えば`Harry - 1996-07-20 - 1996-07-20`の行は不要です.

```sql
select
  *
from
  Salaries as S0
  left outer join Salaries as S1
    on S0.emp_name = S1.emp_name
      and S1.sal_date = (
        select max(S2.sal_date)
        from Salaries as S2
        where S0.emp_name = S2.emp_name
          and S0.sal_date > S2.sal_date
      );

/*
 emp_name |  sal_date  | sal_amt | emp_name |  sal_date  | sal_amt
----------+------------+---------+----------+------------+---------
 Tom      | 1996-06-20 |  500.00 |          |            |
 Tom      | 1996-08-20 |  700.00 | Tom      | 1996-06-20 |  500.00
 Tom      | 1996-10-20 |  800.00 | Tom      | 1996-08-20 |  700.00
 Tom      | 1996-12-20 |  900.00 | Tom      | 1996-10-20 |  800.00
 Dick     | 1996-06-20 |  500.00 |          |            |
 Harry    | 1996-06-20 |  500.00 |          |            |
 Harry    | 1996-07-20 |  700.00 | Harry    | 1996-06-20 |  500.00
*/
```

「`S0.sal_date` の直近の行 = `S0.sal_date` 未満の中で最大の `sal_date`」として結合条件を加えています.

ここまでくればあと一息で, 最後に最新の sal_date を持つ行のみに絞ります.

```sql
select
  *
from
  Salaries as S0
  left outer join Salaries as S1
    on S0.emp_name = S1.emp_name
      and S1.sal_date = (
        select max(S2.sal_date)
        from Salaries as S2
        where S0.emp_name = S2.emp_name
          and S0.sal_date > S2.sal_date
      )
where
  S0.sal_date = (
    select max(S3.sal_date)
    from Salaries as S3
    where S3.emp_name = S0.emp_name
  );

/*
 emp_name |  sal_date  | sal_amt | emp_name |  sal_date  | sal_amt
----------+------------+---------+----------+------------+---------
 Tom      | 1996-12-20 |  900.00 | Tom      | 1996-10-20 |  800.00
 Dick     | 1996-06-20 |  500.00 |          |            |
 Harry    | 1996-07-20 |  700.00 | Harry    | 1996-06-20 |  500.00
*/
```

最終的な見た目は少し複雑ですが, 順を追って見ていけば理解しやすいですね. 問題が複雑になるとクエリは巨大化しがちですが, 分かりやすくする方法があるでしょうか.
普通のプログラミングなら途中の結果を変数に置いたり, ある程度の処理を関数にまとめたりすることで全体を分割して理解しやすくすることができますが, SQL は基本的にそういうことはできないので悩みどころです.

もう一つ Window 関数を使った解答も紹介します.

```sql
select
  emp_name,
  sal_amt,
  prev_sal_amt,
  sal_date
from
(
  select
    emp_name,
    sal_amt,
    sal_date,
    lag(sal_amt) over (partition by emp_name order by sal_date),
    row_number() over (partition by emp_name order by sal_date desc)
  from
    Salaries
) as T(emp_name, sal_amt, sal_date, prev_sal_amt, rn)
where
  rn = 1;
```

サブクエリの結果を見ると意味が分かりやすいです.

```sql
select
  emp_name,
  sal_amt,
  sal_date,
  lag(sal_amt) over (partition by emp_name order by sal_date),
  row_number() over (partition by emp_name order by sal_date desc)
from
  Salaries;

/*
 emp_name | sal_amt |  sal_date  |  lag   | row_number
----------+---------+------------+--------+------------
 Dick     |  500.00 | 1996-06-20 |        |          1
 Harry    |  500.00 | 1996-06-20 |        |          2
 Harry    |  700.00 | 1996-07-20 | 500.00 |          1
 Tom      |  500.00 | 1996-06-20 |        |          4
 Tom      |  700.00 | 1996-08-20 | 500.00 |          3
 Tom      |  800.00 | 1996-10-20 | 700.00 |          2
 Tom      |  900.00 | 1996-12-20 | 800.00 |          1
*/
```

Window 関数の `lag()` で直近の行を取得して, `row_number()` を使って最新のデータのみを選択します.  
ちなみに Window 関数や case 式, `NOT EXISTS`による全称量化などのテクニックは当たり前のものとして出てくるので『達人に学ぶ SQL 徹底指南書』を先に読んでおいて良かったなと思いました.

この問題, 提供者が著名なシステムコンサルタントに相談したところ「そんなクエリを書くことはできない」と言われたそうです. オリジナルの問題には SQL-89 に準拠するというルールがあるので難しくなっていますが, 闘志を燃やした著者は 9 つも解答を掲載しています.  
本書ではこの問題に限らず複数の解答が紹介されていることが多いです. 一つ解答を思いついても, 別解を考えてみるのは良い練習になりました.

## パズル 20「テスト結果」

テストの結果を保持しているテーブルがあるとします.

```sql
create table TestResults (
  test_name varchar(10) not null,
  test_step integer not null,
  comp_date date, -- NULL means not completed yet
  primary key (test_name, test_step)
);
```

テストはいくつかのステップを含んでいて, 各ステップが終了すると終了日が `comp_date` に記録されます.  
サンプルデータは以下のものを使います.

```
 test_name | test_step | comp_date
-----------+-----------+------------
 A         |         1 | 2022-01-01
 A         |         2 | 2022-01-02
 A         |         3 | 2022-01-03
 B         |         1 | 2022-01-01
 B         |         2 |
 B         |         3 | 2022-01-03
```

問題は「すべてのステップが完了しているテストを表示する」です. テスト A はすべて完了済みですが, B はステップ 2 が完了していません.

---

`NULL`を上手く扱った綺麗な解答を紹介します.

```sql
select
  test_name
from
  TestResults
group by
  test_name
having
  count(*) = count(comp_date);
```

ポイントは having 句です. `count()`は `NULL` をカウントしないことを利用して `comp_date` に `NULL` が含まれないものを抽出しています.  
`NULL`の扱いは直感的でなくて厄介なこともあるのですが, 上手く使うと良いこともあるという例です.

## パズル 61「文字列をソートする」

A, B, C, D の 4 種類の文字で構成された文字列をソートする問題です.

```sql
create table Strings (
  str char(7) not null
    check (str similar to '[ABCD]{7}')
);

insert into Strings values ('CABBDBC'), ('ABCABCA');

/* Required results.
   str
---------
 ABBBCCD
 AAABBCC
*/
```

---

解答は以下のクエリです.

```sql
select
  repeat('A', (char_length(str) - char_length(replace(str, 'A', ''))))
  || repeat('B', (char_length(str) - char_length(replace(str, 'B', ''))))
  || repeat('C', (char_length(str) - char_length(replace(str, 'C', ''))))
  || repeat('D', (char_length(str) - char_length(replace(str, 'D', ''))))
from
  Strings;
```

A, B, C, D の 4 種類の文字しか使われていないことに着目して, ソート後の文字列は AA...BB...CC...DD という形になることを利用します. つまり「A の個数分 A を並べた文字列 + B の個数分 B を並べた文字列 + ...」ということです.

では A の個数をどうやって求めるかですが, 少しトリッキーな方法を使っています. 元の文字列の A を空白に置換した文字列を用意して, いくつ長さが減少したかによって A の個数を計算します.

```sql
char_length(str) - char_length(replace(str, 'A', ''))
```

RDBMS によっては該当する関数がないかもしれませんが, パズル的な問題として面白い題材なのでお気に入りです.

## パズル 62「レポートの整形」

適当なデータを持ったテーブルを考えます.

```sql
create table Names (
  name varchar(10) not null primary key
);

insert into Names values
  ('Ai'), ('Bill'), ('Chika'),
  ('Dan'), ('Emi'), ('Fuku'),
  ('Gouto'), ('Hina'), ('Ichika'),
  ('Jun'), ('Ken'), ('Lan'),
  ('Momori'), ('Norio');
```

このテーブルのデータを 3 列で表示することができるでしょうか？

```
 name1  | name2 | name3
--------+-------+--------
 Ai     | Bill  | Chika
 Dan    | Emi   | Fuku
 Gouto  | Hina  | Ichika
 Jun    | Ken   | Lan
 Momori | Norio |
```

---

まずは 2 列から考えます.  
二列目に表示するのは, 一列目の直後の名前です.

```sql
select
  N0.name as name1, min(N1.name) as name2
from
  Names as N0
  left outer join Names as N1
    on N0.name < N1.name
group by
  N0.name
order by
  N0.name;

/*
 name1  | name2
--------+--------
 Ai     | Bill
 Bill   | Chika
 Chika  | Dan
 Dan    | Emi
 Emi    | Fuku
 Fuku   | Gouto
 Gouto  | Hina
 Hina   | Ichika
 Ichika | Jun
 Jun    | Ken
 Ken    | Lan
 Lan    | Momori
 Momori | Norio
 Norio  |
*/
```

しかしこれだと不要な行も含まれています. 偶数番目の行を除くため, 条件を追加します.

```sql
select
  N0.name as name1, min(N1.name) as name2
from
  Names as N0
  left outer join Names as N1
    on N0.name < N1.name
group by
  N0.name
having
  mod((select count(*) from Names) - (select count(*) from Names where name > N0.name), 2) = 1
order by
  N0.name;

/*
 name1  | name2
--------+-------
 Ai     | Bill
 Chika  | Dan
 Emi    | Fuku
 Gouto  | Hina
 Ichika | Jun
 Ken    | Lan
 Momori | Norio
*/
```

要は 1, 3, 5, ...番目の行だけを抽出できれば良いので, 行数を 2 で割った余りが 1 の行のみ抽出しています (`row_number()`を使っても良いですね).  
さて, ではこれを 3 列に拡張します.

```sql
select
  N0.name as name1, min(N1.name) as name2, min(N2.name) as name3
from
  Names as N0
  left outer join Names as N1
    on N0.name < N1.name
  left outer join Names as N2
    on N1.name < N2.name
group by
  N0.name
having
  mod((select count(*) from Names) - (select count(*) from Names where name > N0.name), 3) = 1
order by
  N0.name;
```

結果を整えるのは SQL の役目ではないので, そもそもこの問題のようなことは本来やるべきではありません. しかしパズルとしては面白いです（し, もしかすると SQL で整形しないといけないことがあるかもしれません）.  
結果の整形はフロントエンドでやるべきということは当然理解しているのでしょうが, なんと 6 つの解答が紹介されています. 世界中のデータベースエンジニアの無邪気な情熱が伝わってきます. よくもまあこんなに色々思いつくなぁと感心してしまいました.

## 結語

良いと思った問題は他にもたくさんあるのですが, 流石にすべて紹介することはできないのでこの辺りで終わりにしておきます.  

一問一問が濃密で, 気づいたら一問に一時間以上掛けていたことが何度もありました.  
知らないことを都度調べたり, 試行錯誤を繰り返したことで随分時間は掛かりましたが, その分得るものはあったと思います. 序盤は特に苦労していましたが, 30 問目辺りでそこそこ複雑なクエリがスムーズに書けたときは少し成長を実感しました. 初心者は脱した感がありますが、まだ理解しきれていない部分もあるので, いつかまた再読すると得るものがありそうです.

読んでいて疑問に思ったのは, 複数ある解答の良し悪しをどう判断するかということです.  
明らかにシンプルで分かりやすいクエリは良いと分かりますが, そうではない場合どう判断すればよいのか分かっていません. 例えばパズル 15「現在の給料と昇給前の給料」で紹介した 2 つの解答はどちらが良いのでしょう.

おそらく, 判断のためには SQL の内部を知る必要があるのではないかと思います（実行計画, インデックスの仕組み, 一時テーブルの扱いなど?）.
というわけで, 次は SQL の中身を知るような勉強をしたいと思いました. また, それとは別にデータベース全体の設計も学びがいがありそうです.  
書籍だと『プログラマのための SQL』『プログラマのための SQL』『達人に学ぶ DB 設計 徹底指南書』辺りかなぁと思っています.
