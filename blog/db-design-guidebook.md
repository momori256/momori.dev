---
title: "『達人に学ぶ DB 設計 徹底指南書』でデータベース設計の論理と物理を考える"
date: "2023-05-05"
tags: "database, sql"
imagePath: "/blog/db-design-guidebook/mia-bruning-GWzucUV7mc4-unsplash.jpg"
photoByName: "Unsplash"
photoByUrl: "https://unsplash.com/ko/%EC%82%AC%EC%A7%84/GWzucUV7mc4?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
photoOnName: "Mia Bruning"
photoOnUrl: "https://unsplash.com/ko/@miabruning16?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
---

# 『達人に学ぶ DB 設計 徹底指南書』でデータベース設計の論理と物理を考える

[『達人に学ぶ DB 設計 徹底指南書』](https://www.shoeisha.co.jp/book/detail/9784798124704) はリレーショナルデータベース (RDB) の設計についての解説書です. [『達人に学ぶ SQL 徹底指南書』](https://www.shoeisha.co.jp/book/detail/9784798157825) の続編という位置づけのようなので, 本書に登場する SQL が難しいと思ったり, より SQL のことを学びたいと思ったら前作を読むと良いでしょう.  

本書ではデータベースの設計を, エンティティの定義や正規化などを行う論理設計と, データ格納の方法や場所を考える物理設計の二段階に分けて説明します. 設計についての基本的な考え方や知識を抑えつつ, やってしまいがちなバッドノウハウや, 論理設計と物理設計のトレードオフと言った実践的な内容にも踏み込みます.

## Table of Contents

## 正規化

データベース設計は大きく論理設計と物理設計という二段階に分かれる. 最初に行う論理設計では, 特定の DBMS(Database Management System) や SQL のことは考えずに, プログラムが扱う対象となる物事の属性や物事同士の関係をモデル化する.  
論理設計をするに当たって役に立つのが, データの冗長性や非一貫性を排除するための正規化という方法だ.

正規化を理解するには正規化されていないデータを題材にすると分かりやすい. 例えば以下のテーブルは, 都道府県, 市町村, 市町村の規模を表している. このように分割しておけば先に挙げた問題は起きない.

```
+-----------+-----------+-----------+-----------+-----------+--------+
| pref_code | pref      | city_code | city      | area_code | area   |
+-----------+-----------+-----------+-----------+-----------+--------+
| 01        | Aomori    | 01        | Hirosaki  | 01        | Large  |
| 01        | Aomori    | 02        | Hatinohe  | 01        | Large  |
| 01        | Aomori    | 03        | Misawa    | 03        | Small  |
| 02        | Yamaguchi | 04        | Ube       | 01        | Large  |
| 02        | Yamaguchi | 05        | Kudamatsu | 02        | Middle |
| 02        | Yamaguchi | 06        | Mine      | 03        | Small  |
+-----------+-----------+-----------+-----------+-----------+--------+
```

このテーブルには `01 Aomori` のように何度も登場するデータがあって冗長だ. さらに, データの整合性が取れなくなる場合があるのが大きな問題だ. 例えば `02 Aomori` というレコードがあったら, 県コードと県名のどちらを信用すればよいのか.  
こういった冗長性や非一貫性を排除するためには, テーブルを分割するのが有効だ.

```
-- prefs
+-----------+-----------+
| pref_code | pref      |
+-----------+-----------+
| 01        | Aomori    |
| 02        | Yamaguchi |
+-----------+-----------+

-- cities
+-----------+-----------+-----------+-----------+
| city_code | city      | pref_code | area_code |
+-----------+-----------+-----------+-----------+
| 01        | Hirosaki  | 01        | 01        |
| 02        | Hatinohe  | 01        | 01        |
| 03        | Misawa    | 01        | 03        |
| 04        | Ube       | 02        | 01        |
| 05        | Kudamatsu | 02        | 02        |
| 06        | Mine      | 02        | 03        |
+-----------+-----------+-----------+-----------+

-- areas
+-----------+--------+
| area_code | area   |
+-----------+--------+
| 01        | Large  |
| 02        | Middle |
| 03        | Small  |
+-----------+--------+
```

元のテーブルを復元するにはテーブル結合を使う.

```sql
select
  p.pref_code, p.pref,
  c.city_code, c.city,
  a.area_code, a.area
from
  prefs as p
  inner join cities as c
    on p.pref_code = c.pref_code
  inner join areas as a
    on c.area_code = a.area_code;
```

これが正規化だが, 言われてみれば当たり前だと思う. 「正規化」という言葉を知らなくても自力でこのような設計を行うことは可能だろう.  
しかし, 当たり前を厳密に記述することに理論の意味がある. 正規化はレベルに応じて第一から第五までに分類されているが, そういう分類は理論的な考察によって生まれるものだろう.  
正規化なんて理論上だけのものだとは思わずに, 自分で設計を行うときにも考えの補助として使えそうだ. このテーブルは第三正規化を満たしているだろうか, この設計は第二正規化をしていないから違和感があるのだ, というふうに.

## 論理と物理のトレードオフ

論理設計を受けて, 実際にデータをどのように格納するかを考えるのが物理設計というフェーズだ. 具体的にはテーブル定義やインデックス定義, RAID 構成やファイルの保存場所などを考える.  
論理設計と物理設計にはトレードオフが発生することがある. 論理設計の綺麗さを優先するとパフォーマンスが落ちる, パフォーマンスを優先すると論理設計が壊れるといった具合だ.

なぜ綺麗な論理設計がパフォーマンスを落とすのかというと, 正規化をするとテーブル結合が必要になるからだ. 正規化はテーブルを分割する行為なので元に戻すには必然的にテーブル結合をしなければならない. 結合は負荷の高い処理なので, しばしばパフォーマンス上の問題となる. 論理を取るか物理を取るかというジレンマが発生する.

例えば, あえて正規化をせずに結合した状態のテーブルを保持しておく, テーブルの一部のレコードやカラムを切り出したテーブル (データマート) を作成しておく, 巨大なテーブルのレコードを分割して複数のテーブルに分散させるといったノウハウが存在する.

本書が取るのは, 論理と物理のトレードオフが発生することは承知の上で, 原則として論理を優先させるべきというものだ. 非正規化は本当の本当の最終手段としてしか認めない. 非正規化によるデメリット (データの冗長性, 非一貫性, 更新コスト増大など) を重く見るのだ.  
ではどうやってパフォーマンスを達成するかというと, 適切なインデックスを定義したり, パーティションやマテリアライズドビューといった機能を利用する方法が挙げられる.

### パーティション

テーブルを分割して別のファイルに保存する機能. 分割の方向によって水平と垂直という二種類の分割がある. 水平分割はレコードを分割する, 垂直分割はカラムを分割するということだ.

パーティションはテーブルのサイズが大きすぎてパフォーマンスが悪化している場合に利用する.  
水平分割の恩恵として [パーティションプルーニング](https://dev.mysql.com/doc/refman/8.0/ja/partitioning-pruning.html) がある. 結果に含まれるレコードが特定のパーティションのみに含まれる場合, 一部のパーティションのファイルのみを見れば良いため, テーブルフルスキャンよりファイル IO のコストを抑えられる.  
パフォーマンス外の利点として, 物理的に一つのストレージに収まらないテーブルを複数のストレージに分けて保存することができる, パーティションごとにファイルのバックアップを取ることが容易になるといったものがある.

### マテリアライズドビュー

実ファイルを持ったビュー. ビューはテーブルを増やさずに実質的に新たなテーブルを作るようなものなので便利だが, 毎回元のテーブルにアクセスするのでパフォーマンス上のデメリットがある. 特にビューからビューを参照する多段ビューはバッドノウハウとして本書で紹介されている.

マテリアライズドビューは実態を持っているので, 元のテーブルを参照する必要もないし, インデックスを付与することもできる. 欠点としてはストレージ消費や, 元のテーブルのデータを反映するために更新が必要といった特徴がある. 常に最新のデータが必要というわけではないような場合には非常に便利そうだ.

## 木構造

RDB では木構造が扱いづらいことが大きな弱点とされてきたが, 弱点を克服すべくいくつかの方法が考えられている. 代表的な 2 つのモデル, 入れ子集合モデルとパス列挙モデルを紹介しよう.

具体的な木構造としては以下のようなものを想像して欲しい.

<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAS0AAACrCAYAAAAzfcqfAAAAAXNSR0IArs4c6QAAAARzQklUCAgICHwIZIgAABk0dEVYdG14ZmlsZQAlM0NteGZpbGUlM0UlM0NkaWFncmFtJTIwbmFtZSUzRCUyMlBhZ2UtMSUyMiUyMGlkJTNEJTIyaUU0MnNmanpPNURadG5sMVFwMTYlMjIlM0UlM0NteEdyYXBoTW9kZWwlMjBkeCUzRCUyMjU4MCUyMiUyMGR5JTNEJTIyMzg3JTIyJTIwZ3JpZCUzRCUyMjElMjIlMjBncmlkU2l6ZSUzRCUyMjEwJTIyJTIwZ3VpZGVzJTNEJTIyMSUyMiUyMHRvb2x0aXBzJTNEJTIyMSUyMiUyMGNvbm5lY3QlM0QlMjIxJTIyJTIwYXJyb3dzJTNEJTIyMSUyMiUyMGZvbGQlM0QlMjIxJTIyJTIwcGFnZSUzRCUyMjElMjIlMjBwYWdlU2NhbGUlM0QlMjIxJTIyJTIwcGFnZVdpZHRoJTNEJTIyODUwJTIyJTIwcGFnZUhlaWdodCUzRCUyMjExMDAlMjIlMjBiYWNrZ3JvdW5kJTNEJTIybm9uZSUyMiUyMG1hdGglM0QlMjIwJTIyJTIwc2hhZG93JTNEJTIyMCUyMiUzRSUzQ3Jvb3QlM0UlM0NteENlbGwlMjBpZCUzRCUyMjAlMjIlMkYlM0UlM0NteENlbGwlMjBpZCUzRCUyMjElMjIlMjBwYXJlbnQlM0QlMjIwJTIyJTJGJTNFJTNDbXhDZWxsJTIwaWQlM0QlMjJmbGhjUEEySG5oam1CNmlENWRJUi0xJTIyJTIwdmFsdWUlM0QlMjIlRTQlQjglOTYlRTclOTUlOEMlMjIlMjBzdHlsZSUzRCUyMnJvdW5kZWQlM0QwJTNCd2hpdGVTcGFjZSUzRHdyYXAlM0JodG1sJTNEMSUzQiUyMiUyMHBhcmVudCUzRCUyMjElMjIlMjB2ZXJ0ZXglM0QlMjIxJTIyJTNFJTNDbXhHZW9tZXRyeSUyMHglM0QlMjI1MzQlMjIlMjB5JTNEJTIyMjIwJTIyJTIwd2lkdGglM0QlMjI2MCUyMiUyMGhlaWdodCUzRCUyMjMwJTIyJTIwYXMlM0QlMjJnZW9tZXRyeSUyMiUyRiUzRSUzQyUyRm14Q2VsbCUzRSUzQ214Q2VsbCUyMGlkJTNEJTIyZmxoY1BBMkhuaGptQjZpRDVkSVItMiUyMiUyMHZhbHVlJTNEJTIyJUU2JTk3JUE1JUU2JTlDJUFDJTIyJTIwc3R5bGUlM0QlMjJyb3VuZGVkJTNEMCUzQndoaXRlU3BhY2UlM0R3cmFwJTNCaHRtbCUzRDElM0IlMjIlMjBwYXJlbnQlM0QlMjIxJTIyJTIwdmVydGV4JTNEJTIyMSUyMiUzRSUzQ214R2VvbWV0cnklMjB4JTNEJTIyNDU2JTIyJTIweSUzRCUyMjI5MCUyMiUyMHdpZHRoJTNEJTIyNjAlMjIlMjBoZWlnaHQlM0QlMjIzMCUyMiUyMGFzJTNEJTIyZ2VvbWV0cnklMjIlMkYlM0UlM0MlMkZteENlbGwlM0UlM0NteENlbGwlMjBpZCUzRCUyMmZsaGNQQTJIbmhqbUI2aUQ1ZElSLTMlMjIlMjB2YWx1ZSUzRCUyMiUyMiUyMHN0eWxlJTNEJTIyZW5kQXJyb3clM0RjbGFzc2ljJTNCaHRtbCUzRDElM0Jyb3VuZGVkJTNEMCUzQmV4aXRYJTNEMC41JTNCZXhpdFklM0QxJTNCZXhpdER4JTNEMCUzQmV4aXREeSUzRDAlM0JlbnRyeVglM0QwLjUlM0JlbnRyeVklM0QwJTNCZW50cnlEeCUzRDAlM0JlbnRyeUR5JTNEMCUzQiUyMiUyMHBhcmVudCUzRCUyMjElMjIlMjBzb3VyY2UlM0QlMjJmbGhjUEEySG5oam1CNmlENWRJUi0xJTIyJTIwdGFyZ2V0JTNEJTIyZmxoY1BBMkhuaGptQjZpRDVkSVItMiUyMiUyMGVkZ2UlM0QlMjIxJTIyJTNFJTNDbXhHZW9tZXRyeSUyMHdpZHRoJTNEJTIyNTAlMjIlMjBoZWlnaHQlM0QlMjI1MCUyMiUyMHJlbGF0aXZlJTNEJTIyMSUyMiUyMGFzJTNEJTIyZ2VvbWV0cnklMjIlM0UlM0NteFBvaW50JTIweCUzRCUyMjUyMCUyMiUyMHklM0QlMjIyNDAlMjIlMjBhcyUzRCUyMnNvdXJjZVBvaW50JTIyJTJGJTNFJTNDbXhQb2ludCUyMHglM0QlMjI1NzAlMjIlMjB5JTNEJTIyMTkwJTIyJTIwYXMlM0QlMjJ0YXJnZXRQb2ludCUyMiUyRiUzRSUzQyUyRm14R2VvbWV0cnklM0UlM0MlMkZteENlbGwlM0UlM0NteENlbGwlMjBpZCUzRCUyMkQ5d3I2Y29HLUx2eTNsQ2NjRkdrLTElMjIlMjB2YWx1ZSUzRCUyMiVFNCVCOCVBRCVFNSU5QiVCRCUyMiUyMHN0eWxlJTNEJTIycm91bmRlZCUzRDAlM0J3aGl0ZVNwYWNlJTNEd3JhcCUzQmh0bWwlM0QxJTNCJTIyJTIwcGFyZW50JTNEJTIyMSUyMiUyMHZlcnRleCUzRCUyMjElMjIlM0UlM0NteEdlb21ldHJ5JTIweCUzRCUyMjYxMiUyMiUyMHklM0QlMjIyOTAlMjIlMjB3aWR0aCUzRCUyMjYwJTIyJTIwaGVpZ2h0JTNEJTIyMzAlMjIlMjBhcyUzRCUyMmdlb21ldHJ5JTIyJTJGJTNFJTNDJTJGbXhDZWxsJTNFJTNDbXhDZWxsJTIwaWQlM0QlMjJEOXdyNmNvRy1MdnkzbENjY0ZHay0yJTIyJTIwdmFsdWUlM0QlMjIlMjIlMjBzdHlsZSUzRCUyMmVuZEFycm93JTNEY2xhc3NpYyUzQmh0bWwlM0QxJTNCcm91bmRlZCUzRDAlM0JlbnRyeVglM0QwLjUlM0JlbnRyeVklM0QwJTNCZW50cnlEeCUzRDAlM0JlbnRyeUR5JTNEMCUzQmV4aXRYJTNEMC41JTNCZXhpdFklM0QxJTNCZXhpdER4JTNEMCUzQmV4aXREeSUzRDAlM0IlMjIlMjBwYXJlbnQlM0QlMjIxJTIyJTIwc291cmNlJTNEJTIyZmxoY1BBMkhuaGptQjZpRDVkSVItMSUyMiUyMHRhcmdldCUzRCUyMkQ5d3I2Y29HLUx2eTNsQ2NjRkdrLTElMjIlMjBlZGdlJTNEJTIyMSUyMiUzRSUzQ214R2VvbWV0cnklMjB3aWR0aCUzRCUyMjUwJTIyJTIwaGVpZ2h0JTNEJTIyNTAlMjIlMjByZWxhdGl2ZSUzRCUyMjElMjIlMjBhcyUzRCUyMmdlb21ldHJ5JTIyJTNFJTNDbXhQb2ludCUyMHglM0QlMjI1ODAlMjIlMjB5JTNEJTIyMjUwJTIyJTIwYXMlM0QlMjJzb3VyY2VQb2ludCUyMiUyRiUzRSUzQ214UG9pbnQlMjB4JTNEJTIyNjcwJTIyJTIweSUzRCUyMjE5MCUyMiUyMGFzJTNEJTIydGFyZ2V0UG9pbnQlMjIlMkYlM0UlM0MlMkZteEdlb21ldHJ5JTNFJTNDJTJGbXhDZWxsJTNFJTNDbXhDZWxsJTIwaWQlM0QlMjJEOXdyNmNvRy1MdnkzbENjY0ZHay00JTIyJTIwdmFsdWUlM0QlMjIlRTQlQjglODklRTklODclOEQlMjIlMjBzdHlsZSUzRCUyMnJvdW5kZWQlM0QwJTNCd2hpdGVTcGFjZSUzRHdyYXAlM0JodG1sJTNEMSUzQiUyMiUyMHBhcmVudCUzRCUyMjElMjIlMjB2ZXJ0ZXglM0QlMjIxJTIyJTNFJTNDbXhHZW9tZXRyeSUyMHglM0QlMjI0MjAlMjIlMjB5JTNEJTIyMzUwJTIyJTIwd2lkdGglM0QlMjI2MCUyMiUyMGhlaWdodCUzRCUyMjMwJTIyJTIwYXMlM0QlMjJnZW9tZXRyeSUyMiUyRiUzRSUzQyUyRm14Q2VsbCUzRSUzQ214Q2VsbCUyMGlkJTNEJTIyRDl3cjZjb0ctTHZ5M2xDY2NGR2stNSUyMiUyMHZhbHVlJTNEJTIyJUU5JUE2JTk5JUU1JUI3JTlEJTIyJTIwc3R5bGUlM0QlMjJyb3VuZGVkJTNEMCUzQndoaXRlU3BhY2UlM0R3cmFwJTNCaHRtbCUzRDElM0IlMjIlMjBwYXJlbnQlM0QlMjIxJTIyJTIwdmVydGV4JTNEJTIyMSUyMiUzRSUzQ214R2VvbWV0cnklMjB4JTNEJTIyNDkwJTIyJTIweSUzRCUyMjM1MCUyMiUyMHdpZHRoJTNEJTIyNjAlMjIlMjBoZWlnaHQlM0QlMjIzMCUyMiUyMGFzJTNEJTIyZ2VvbWV0cnklMjIlMkYlM0UlM0MlMkZteENlbGwlM0UlM0NteENlbGwlMjBpZCUzRCUyMkQ5d3I2Y29HLUx2eTNsQ2NjRkdrLTYlMjIlMjB2YWx1ZSUzRCUyMiUyMiUyMHN0eWxlJTNEJTIyZW5kQXJyb3clM0RjbGFzc2ljJTNCaHRtbCUzRDElM0Jyb3VuZGVkJTNEMCUzQmV4aXRYJTNEMC41JTNCZXhpdFklM0QxJTNCZXhpdER4JTNEMCUzQmV4aXREeSUzRDAlM0JlbnRyeVglM0QwLjUlM0JlbnRyeVklM0QwJTNCZW50cnlEeCUzRDAlM0JlbnRyeUR5JTNEMCUzQiUyMiUyMHBhcmVudCUzRCUyMjElMjIlMjBzb3VyY2UlM0QlMjJmbGhjUEEySG5oam1CNmlENWRJUi0yJTIyJTIwdGFyZ2V0JTNEJTIyRDl3cjZjb0ctTHZ5M2xDY2NGR2stNCUyMiUyMGVkZ2UlM0QlMjIxJTIyJTNFJTNDbXhHZW9tZXRyeSUyMHdpZHRoJTNEJTIyNTAlMjIlMjBoZWlnaHQlM0QlMjI1MCUyMiUyMHJlbGF0aXZlJTNEJTIyMSUyMiUyMGFzJTNEJTIyZ2VvbWV0cnklMjIlM0UlM0NteFBvaW50JTIweCUzRCUyMjU1MCUyMiUyMHklM0QlMjIzODAlMjIlMjBhcyUzRCUyMnNvdXJjZVBvaW50JTIyJTJGJTNFJTNDbXhQb2ludCUyMHglM0QlMjI2MDAlMjIlMjB5JTNEJTIyMzMwJTIyJTIwYXMlM0QlMjJ0YXJnZXRQb2ludCUyMiUyRiUzRSUzQyUyRm14R2VvbWV0cnklM0UlM0MlMkZteENlbGwlM0UlM0NteENlbGwlMjBpZCUzRCUyMkQ5d3I2Y29HLUx2eTNsQ2NjRkdrLTclMjIlMjB2YWx1ZSUzRCUyMiUyMiUyMHN0eWxlJTNEJTIyZW5kQXJyb3clM0RjbGFzc2ljJTNCaHRtbCUzRDElM0Jyb3VuZGVkJTNEMCUzQmVudHJ5WCUzRDAuNSUzQmVudHJ5WSUzRDAlM0JlbnRyeUR4JTNEMCUzQmVudHJ5RHklM0QwJTNCZXhpdFglM0QwLjUlM0JleGl0WSUzRDElM0JleGl0RHglM0QwJTNCZXhpdER5JTNEMCUzQiUyMiUyMHBhcmVudCUzRCUyMjElMjIlMjBzb3VyY2UlM0QlMjJmbGhjUEEySG5oam1CNmlENWRJUi0yJTIyJTIwdGFyZ2V0JTNEJTIyRDl3cjZjb0ctTHZ5M2xDY2NGR2stNSUyMiUyMGVkZ2UlM0QlMjIxJTIyJTNFJTNDbXhHZW9tZXRyeSUyMHdpZHRoJTNEJTIyNTAlMjIlMjBoZWlnaHQlM0QlMjI1MCUyMiUyMHJlbGF0aXZlJTNEJTIyMSUyMiUyMGFzJTNEJTIyZ2VvbWV0cnklMjIlM0UlM0NteFBvaW50JTIweCUzRCUyMjUyMCUyMiUyMHklM0QlMjIzMzAlMjIlMjBhcyUzRCUyMnNvdXJjZVBvaW50JTIyJTJGJTNFJTNDbXhQb2ludCUyMHglM0QlMjI2MDAlMjIlMjB5JTNEJTIyMzMwJTIyJTIwYXMlM0QlMjJ0YXJnZXRQb2ludCUyMiUyRiUzRSUzQyUyRm14R2VvbWV0cnklM0UlM0MlMkZteENlbGwlM0UlM0NteENlbGwlMjBpZCUzRCUyMkQ5d3I2Y29HLUx2eTNsQ2NjRkdrLTglMjIlMjB2YWx1ZSUzRCUyMiVFNSU4QyU5NyVFNCVCQSVBQyUyMiUyMHN0eWxlJTNEJTIycm91bmRlZCUzRDAlM0J3aGl0ZVNwYWNlJTNEd3JhcCUzQmh0bWwlM0QxJTNCJTIyJTIwcGFyZW50JTNEJTIyMSUyMiUyMHZlcnRleCUzRCUyMjElMjIlM0UlM0NteEdlb21ldHJ5JTIweCUzRCUyMjU4MCUyMiUyMHklM0QlMjIzNTAlMjIlMjB3aWR0aCUzRCUyMjYwJTIyJTIwaGVpZ2h0JTNEJTIyMzAlMjIlMjBhcyUzRCUyMmdlb21ldHJ5JTIyJTJGJTNFJTNDJTJGbXhDZWxsJTNFJTNDbXhDZWxsJTIwaWQlM0QlMjJEOXdyNmNvRy1MdnkzbENjY0ZHay05JTIyJTIwdmFsdWUlM0QlMjIlRTQlQjglOEElRTYlQjUlQjclMjIlMjBzdHlsZSUzRCUyMnJvdW5kZWQlM0QwJTNCd2hpdGVTcGFjZSUzRHdyYXAlM0JodG1sJTNEMSUzQiUyMiUyMHBhcmVudCUzRCUyMjElMjIlMjB2ZXJ0ZXglM0QlMjIxJTIyJTNFJTNDbXhHZW9tZXRyeSUyMHglM0QlMjI2NTAlMjIlMjB5JTNEJTIyMzUwJTIyJTIwd2lkdGglM0QlMjI2MCUyMiUyMGhlaWdodCUzRCUyMjMwJTIyJTIwYXMlM0QlMjJnZW9tZXRyeSUyMiUyRiUzRSUzQyUyRm14Q2VsbCUzRSUzQ214Q2VsbCUyMGlkJTNEJTIyRDl3cjZjb0ctTHZ5M2xDY2NGR2stMTAlMjIlMjB2YWx1ZSUzRCUyMiUyMiUyMHN0eWxlJTNEJTIyZW5kQXJyb3clM0RjbGFzc2ljJTNCaHRtbCUzRDElM0Jyb3VuZGVkJTNEMCUzQmV4aXRYJTNEMC41JTNCZXhpdFklM0QxJTNCZXhpdER4JTNEMCUzQmV4aXREeSUzRDAlM0JlbnRyeVglM0QwLjUlM0JlbnRyeVklM0QwJTNCZW50cnlEeCUzRDAlM0JlbnRyeUR5JTNEMCUzQiUyMiUyMHBhcmVudCUzRCUyMjElMjIlMjB0YXJnZXQlM0QlMjJEOXdyNmNvRy1MdnkzbENjY0ZHay04JTIyJTIwZWRnZSUzRCUyMjElMjIlM0UlM0NteEdlb21ldHJ5JTIwd2lkdGglM0QlMjI1MCUyMiUyMGhlaWdodCUzRCUyMjUwJTIyJTIwcmVsYXRpdmUlM0QlMjIxJTIyJTIwYXMlM0QlMjJnZW9tZXRyeSUyMiUzRSUzQ214UG9pbnQlMjB4JTNEJTIyNjQ1JTIyJTIweSUzRCUyMjMyMCUyMiUyMGFzJTNEJTIyc291cmNlUG9pbnQlMjIlMkYlM0UlM0NteFBvaW50JTIweCUzRCUyMjcyNSUyMiUyMHklM0QlMjIzMzAlMjIlMjBhcyUzRCUyMnRhcmdldFBvaW50JTIyJTJGJTNFJTNDJTJGbXhHZW9tZXRyeSUzRSUzQyUyRm14Q2VsbCUzRSUzQ214Q2VsbCUyMGlkJTNEJTIyRDl3cjZjb0ctTHZ5M2xDY2NGR2stMTElMjIlMjB2YWx1ZSUzRCUyMiUyMiUyMHN0eWxlJTNEJTIyZW5kQXJyb3clM0RjbGFzc2ljJTNCaHRtbCUzRDElM0Jyb3VuZGVkJTNEMCUzQmVudHJ5WCUzRDAuNSUzQmVudHJ5WSUzRDAlM0JlbnRyeUR4JTNEMCUzQmVudHJ5RHklM0QwJTNCZXhpdFglM0QwLjUlM0JleGl0WSUzRDElM0JleGl0RHglM0QwJTNCZXhpdER5JTNEMCUzQiUyMiUyMHBhcmVudCUzRCUyMjElMjIlMjB0YXJnZXQlM0QlMjJEOXdyNmNvRy1MdnkzbENjY0ZHay05JTIyJTIwZWRnZSUzRCUyMjElMjIlM0UlM0NteEdlb21ldHJ5JTIwd2lkdGglM0QlMjI1MCUyMiUyMGhlaWdodCUzRCUyMjUwJTIyJTIwcmVsYXRpdmUlM0QlMjIxJTIyJTIwYXMlM0QlMjJnZW9tZXRyeSUyMiUzRSUzQ214UG9pbnQlMjB4JTNEJTIyNjQ1JTIyJTIweSUzRCUyMjMyMCUyMiUyMGFzJTNEJTIyc291cmNlUG9pbnQlMjIlMkYlM0UlM0NteFBvaW50JTIweCUzRCUyMjcyNSUyMiUyMHklM0QlMjIzMzAlMjIlMjBhcyUzRCUyMnRhcmdldFBvaW50JTIyJTJGJTNFJTNDJTJGbXhHZW9tZXRyeSUzRSUzQyUyRm14Q2VsbCUzRSUzQyUyRnJvb3QlM0UlM0MlMkZteEdyYXBoTW9kZWwlM0UlM0MlMkZkaWFncmFtJTNFJTNDJTJGbXhmaWxlJTNFwPcdNwAAHKRJREFUeF7tXQfUFUWWviRFYUSBQxJGlCygiChRFFHYM4JhxVHCeEAZ9YAJFdAVA46yKMsOq5gwMoIICIiSHMBVQGUVVByQZAAByUmCSNz6mu6f97//pX6vuru631fn3PPgf1XVt757++tbt6rrFRMWIkAEiECIECgWIl2pKhEgAkRASFp0AiJABEKFAEkrVOaiskSACJC06ANEgAiECgGSVqjM5VrZY65bhL8BfTr8Nkw5Aho42gY+pkq0RxgzumLFLHemT0fc4jRwtA1M0oq2ffNydCStaJudpBVt++bl6Eha0TY7SSva9s3L0ZG0om12kla07ZuXoyNpRdvsJK1o2zcvR0fSirbZSVrRtm9ejo6kFW2zk7Sibd+8HB1JK9pm94S0du3aJdWrV5e9e/da6HXq1EnuuOMO6zPIwn1aQaLv37VJWv5hHcSVtJHWnDlzZOjQoYLPTEhr27ZtUrlyZalatao17sOHD8v27dutv6Fs3rxZli9fLrVr19aGC0lLG5RGd0TSMto8OSsXKGk1atRINm3aZA1ixYoV0qVLF1m6dKn1//r168u0adNIWjmbOP86IGlF2+ZaSKtnz54yffp02bNnj1SsWFHwatDGjRulWrVqFnqIoMqUKSOlS5eWuXPnSr169YSRVrQdK8jRkbSCRN/7a2shLaiZzfSQkZb3Bs7HK5C0om31wEhr586d0rhxYyv/dfDgQalUqZKF9KFDhwTf4f8LFiyQmjVrarMAc1raoDS6I5KW0ebJWTnPSAtTw3nz5lkK9uvXTwYOHFho9XDJkiXy+uuvy4wZM2TMmDHSvHlzqy4S8r169ZISJUpInz595KKLLhKbbHIeLEkrZwhD0QFJKxRmylpJT0hr37590r1790JKDRo0SJo1a2b9DWT2yCOPSO/evWXq1KnSrl076du3r/Xd+vXrrb8//PDDMnz4cBk2bJjUqVMn6wHGNiRpaYHR+E5IWsabKCcFPSEtNxq1bt3aisSwchhLWrNmzXLTTUZ1SVoZwRT6SiSt0Jsw5QC0ktb1118vDRo0SHrBWrVqydixYwu+nzJlijUVXLt2rZQrV46kFW1f8210JC3foA7kQlpJa/DgwTJu3LikAylVqlTB5tGtW7dKixYt5MUXX5QOHToUtHGmh4y0AvGHSFyUpBUJMyYdhDbSygamo0ePSvHixbNpmlUbTg+zgi10jUhaoTOZK4UDJS1XmmqoTNLSAGIIuiBphcBIOahI0soBPDY1EwGSlpl20aUVSUsXkuzHGARIWsaYwhNFSFqewMpOg0SApBUk+t5fm6TlPca8gs8IkLR8Btzny5G0fAacl/MeAZKW9xgHeQWSVpDo89qeIEDS8gRWYzolaRljCiqiCwGSli4kzeyHpGWmXahVDgiQtHIALwRNj4VAR90q0qd1I2pYfzSwYQYJqTqnK7372/KC+sRb0zi7po+SYbbsCunYqLZhCJC0DDNIyNQpo/R9wCarf6jP/1LyY8wYzrG/v9kmLny/L2RjpLqGIUDSMswgIVGnVAxZTbYJaWUK3evZxPbvMeR1KCRjpZqGIUDSMswgIVDnfpuA/mkT0L9c6NzYbouzajBtHO6iLasSAQsBkhYdIVME7rajq0/VJ6Z5izNtmKDehXZfre2+ns2hLzbNMwRIWnlm8CyGe4dNMEtsgvk8iz6SNWlp932+3fdLGvtmVxFFgKQVUcNqGNYtqg+sCH5vE8onGvpM1sWlNnnVVp+YNr7u4bXYdcgRIGmF3IAeqN/DJiv8nj2mgbM9uEayLq+0yauKTV5jfLw2LxUSBEhaITGUD2r+2SarvTZhzPDhmsku8Sdbl7K2LhMC1IWXNgwBkpZhBglAnWttgsDueURW7wWgQ7JLQjfsA4OfYtpokm4GwZRfqpC08svesaO9yiYEbBAFWZkczSAKBHlhYyp0nZ6/ZuPISVr55wNO3qiyTQBhyhsh3wby2mzr7me+Lf88xdARk7QMNYwHamGFDquBeLUG0UqYV+iwsgnywitDmDZ6ubLpgSnYZS4IkLRyQS8cbbEXCmR1nn2DvxwOtTPS8nZ7bN/aY9O5hywjBVjJfwRIWv5j7tcVsescZNXKvqGf8+vCAVznLnusn9ljzWW3fgDq85JuECBpuUErHHURUWHqhNwVpoH59H4f3ovE2JHrwtgRgbFEDAGSVnQMWt++Ya+zb1jkeg5HZ3gZj6SkHXWBvKbYWKzIuDUrGo8ASct4E6VV0Dmz6i8xZLU/bavoVzg1hrzesrGJPesr+ghEdIQkrfAatrp9U+KFZkyFEFnxdNCi9nROVUXkhReygdP68JqdmpO0wucDlWIiCNyAIKwt4RuG7xoDN+eUVYfkiZvvZsj9giSt3DH0q4f4c9hx4zFicI8+IlSQF8+vd4+dES1IWkaYIaUS8eewI7r6yXy1jdfwbDti5fn1xpuqsIIkLXMN5vYcdnNHYrZmPL/ebPsU0Y6kZabBMH2BZHMOu5kjMl+r2PPrMfWGsBiIAEnLLKPoPIfdrJGFRxueX2+4rUhaZhjIy3PYzRhh+LTg+fWG2oykFaxhYs9hR4J9XrDq8OoJEGhrJ+x5fr0h7kHSCsYQseewg6zmBKMGr+oCgSts8uL59S5A86IqScsLVJP3adI57P6OPDpX4/n1AduSpOWPAfASM1YDTTyH3R8EoneV2PPrsdKIl7NZfECApOUtyGE6h91bJKLbO8+v99m2JC1vAI89hx05q7HeXIa9GoRAdzvnxfPrPTYKScs9wCNVk1VKnk3QNPYcdpDVG+67Z4uQI9DLJq9U59djP15dJXeGfKyBqE/Scgd7I1V9iZIFSkBQTonyOezuEGJtB4FU59fjhzjaKDlfyVJC5g4BkpY7vL6yHQ2/vtxZSTMlSLCDtJCMjfI57O6QYm0HAZxfDx/Bj27ARxYp+UAJViHxAGxKqNwhQNLKHC8QEkJ/nLowX8kaJfl4DnvmiLFmLAKx59fjhAlEWvjx2deU3EOoMkeApJUZVjeqaq8o+YNd/Yj6/LuSh5Tk4znsmaHGWvEI4Pz6/1TST0kJ+8s96vOvSsYTrswQIGmlx6mmqrJMCc4cd8pR9Y+DSm5V8nb6LliDCFgIdFWCH8k9SUnxGExwpn9DJWuIU3oESFrpMfpZVTkzzsmcViAuvIKD/VgsRCAVAtPVl0gn4Jy0+IKH4AYlfySE6REIC2lhJ3m+lbDYJop2ob8ZbNWw3BjHVDEYRr2qFStmmSUsttE7eDN6o7+ZYYeEWoTlxqATGexEEVSN/mawUUlaBhqHkVbgRiFpBW6C5AqQtAw0DkkrcKOQtAI3AUnLYBMUVY2kFbi5SFqBm4CkZbAJSFoGGoekZaBRHJU4PTTQOIy0AjcKSStwEzDSMtgEjLQMNA5Jy0CjMNLK0ij33nuv1K5dW+6807ujkBhpZWkcfc08I60qVarI0qVLpWLFivq0zbGnsPlb3k0Pt23bJpUrV5aqVasmNPXGjRtl8+bNSZ2KpJXjHRKO5oGQ1uHDh6VUqVJy5pl4ayx5gQ8fOHBAG5IkLW1QFupImxPB4I0aNZJNmzYl1DT+SdiuXTvZuXNnQd0NGzbIySefXIjUWrRoIS+99JK2kYfNibQN3JyOtPnbjTfeKCtXriwY2bJly6R+/fpSosTxQx5KliwpixbhiC11XIgirbJly1qEtGXLFjl6FK8kniggtHLlyhXU0QVX2PwtLyMtN6S1Y8eOAufp2rWrRXa7du2Sbt26Sf/+/S2/Oemkk+S0007T5UMSNifSNnBzOtJGWk2aNJGRI0daRIXSsGFDmT9/vpQvX976Px6SIKt40mrbtq3s379f1q5da5FUhQoVpF69ejJ69GiSljl+klITbU7kNtJytFq9erV07txZOnbsKKVLl5YJEybIqlWrrHBedyFp6UbUdX/a/A2kNWbMGCu6d0gqNqeFSCsRaTka9+7dW9q0aSM9e/YsQmyuR5WkQdj8LS8jrWxyWiAsRFpffPGFlYjH0xJPw759++rynYJ+wuZE2gEIvsPASWvgwIEyd+7cQpFWnz595Oabb2akFbx/ZKSBNifKJtIaNWqUjB8/XubMmSP9+vWzSKtDhw4Wac2bN0/q1sUPq+grJC19WGbZkzZ/Q6SFlAIiKhQs9OChWbz48TMA8V26SKtly5ayePFiGTFihNXOyXtlObYizcLmb3kZabnJaU2ePFkeeOABWbhwoVSqVEliVw8nTpwoAwYMkJkzZxbkLHQ4UticSMeYDetDG2khET9kyBCpVatWwunhZZddJh9//HHSqZ8zPQTZtW/fXpo2bUrSMsxZkqmjzYncRFrvvfeeFVnNnj3bIidMDXfv3m09NcuUKSO9evWSZs2aCcL2SZMmCVYRdRSSlg4Uc+pDm7/Fa5Fqn5azejhr1izp0aNHwgHMmDFDLr74Ym55yMm8/jTW5kTOPq0aNWok1HzdunUF+7QOHjwoWD2Eozkl0T4tPAVRxyabnBEhaeUMYa4daPM3t6SFh2HsFon49keOHLFWILlPK1cTe99emxM5kdb69esTal29evWUO5a5udR7YxtwBW3+5pa0sH2mVatWKSHAvi6SlgFekkYFz5zIxKEz0grcKvS3wE2QXIG8S8QbbIsC1UhagVuJpBW4CUhaBpugqGokrcDNRdIK3AQkLYNNQNIy0DgkLQON4qjE6aGBxmGkFbhRSFqBm4CRlsEmYKRloHFIWgYahZGWyUbhj7UGbR2SVtAWSHF9Tg8NNA6nh4EbhaQVuAk4PTTYBJweGmgckpaBRuH00GSjcHoYtHVIWkFbIArTQ4Mx9Eq1sEzdvRp/kP0eC/LiAV07NP4WGkV9NuQj6nq3KBmuBP9+UslzPuvAy+UnAjjD+24lQ5U8qORZJcPyE4rEoyZpFcXlNfWns5XgbJBflDRQMl7JVJvA6D9EwCsERqiOcb5RNyU/KjlHydtKFiq516uLhq1fktYJi+F3m95S8pOSW+MMiV8hmGA70m1hMzL1NR6Bk2xygqIgrIMxGqf6zviBeaEgSes4qm2U/EPJ60owFUxWxqovyii5SYm+H57zwrLsMywIZBpNxUdhYRmfdj1JWsengYiw/qJkTAYI/7eq01LJjUp+zqA+qxCBZAhcor7A9C/TvJWT70I0Nj9fYc130kKSvZdNWJ+6cAIkSP9qR1xfumjHqkTAQaCrTVggoHEuYMm2nYtLmF01n0krPuHu1lIgO6woIuKa7rYx6+c1Ak7E1F2hMC8LJNqqNkhVZBqhZXEJc5vkI2mlSri7tdRVqgFWFrFEjXwYCxFIh4Cu3FSmubB0+oTu+3wjLSTckb9ClJUq4e7GkM1s4npFfWJvDQsRSISAF6uAXvRpvPXyibSchDs+EVrrLH+0ietz9Xmfzo7ZVyQQcKKi/1OjuceDEf2P6rO5Emd/lweXMKfLfCGtbBPubix1sk1c+9QnchUsRAAIuF0hzBa1vFlZzAfSQq7pLCXY0oAd7l6XUeoC2FGPvVzbvb4Y+zcaAb9X+vy+XiDgR5m0dCbc3Rrnb6rBNUqwsrjcbWPWjwQCua4QZgtC5FcWo0paXiTc3TrRXarBw3bE9bHbxqwfagR0rRBmC0KkVxajSFpeJtzdOtGfVQNsiUDEhXcXWaKNgEmreSbpotXqUSMtJ+EO4vpMK1LZd3aZTVw83iZ7DMPQEtENVqW/UOLFCmG2GGBl8WIlWBzCyRGhL1EiLb8T7m6Mz+Nt3KAVvrp+rRBmi0ykVhajQFpOwh1Pkd7ZWtWHdhXUNd5RgqNveLyND4D7dImwrNiFRc+0Zgs7aZmQcE8LclwFHm/jFjFz6yOCwVQQmzqzeYfQ75FhZRGnSmDKGNrTUMNMWshb4Qws7L/SvcPda2fi8TZeI+x9/0GvEGY7wtCvLIaVtExMuLt1Ih5v4xYxM+pHYVUu1GMwmbQqKR91jn6JdVcn4Y5Ia6MZfpy1FvjxDBwvEn+8DaYaOO7m6ax7ZsNcEfg31QH22uEkD6eYukKY7ViTrSxOUx2OVDIr2469bGcyaeHF4yFKLleC7QthSbi7tVf88TZnqA622aR1tdvOWF8bArih71DSWMkqJaavEGY78PiVxbqqo38peUmJSVs3CsZnMmnhPcGKSv5DCX6NBEfKvKrkqWytY3C7i5RuWFnE8Ta4Qd5UcoqSmko2GKx3VFUroQa2RwnujzuV7FeCBLbbU0bDgk/syuKpSunnlRxV8gclR0wbhKmkdb1945ZVnyuVgP3DmHB3Y2/neBsQdW0l+OEMRJp4j5HFXwRuV5f7uxI8OPAQwY+ZhGWFMFuknJVFnFKC+w2f9yt5OdsOvWpnKmlhVzGiDxSAh+nh4/anV1gE3S9IuZ+SRkpK2cogZ1ctaMXy8PrOgxJDx895favkMSUzIozFn9TYBis5TwkS9SjAob5pYzaRtHCY2VwleLo55ZDtPFvVJ0JZTBejUhCO71KCcBxncsUW/P1mJR9EZbAhGEc7pSN+mBdTo9gC8kL020QJNghHpeAYpW+UlFbikJUztl/VP65V8r8mDdZE0kJuBy8aQzfcyMgt4GbG2VRrlOCcqvUmgZijLjVUe6yEXqgEiw4lbcHUBOWfSjrmeA02zxwBEFZn2/+Qy4JgcQQPSkwVH42Y/1VX43lCCaaE+HVrPCjhe3iYHlMCPK7LHD7va5pGWpgKrbZBW6E+ZyvB8j+mh2Hf3pCpNc9XFfG0xxMOToRE6LlK1mbaAetljQBuYEyJEHUsUjJTySe2DxqXkM56lMkbYgECua1LlWC6iAcpost6SowJFJKRFhg230omBE5c/PEK4pwYZ+KicElKWseO5Q8+xYpZMGREWsTFF9ZSMNP/EiBNXEhax92CpJWYiFzgopvJeHMmibRI5oy0SFop6IakpZuLc344kMwZaTHSSnVbkrRIWv4g4I7MmdPi9DCpX5K0/LllXeDMSIuRFiMtRlr+EJMmnElaJC2SlqabSfedz5uTifikC2ScHnJ6yOmhbsp12R+nhyHPaR04cEAOHjwoR48elf3798uePXtky5YtsmHDBlm5cqU0bNhQunTp4tItUlcPymkOHTokv//+uzXG7du3y6ZNm2TNmjWybNkyqVq1qgwYMKBA8W3btkmjRo2sOonK999/L506dZIVK/AigZ7iAhc9FzzRi/ZI6/Dhw1K2bFmBf+3atUtq164twDRdGTRokNXuwQdx0Kw3xQXO2nFxRnT66adbvofP+AK8Xn75ZbnvvvukVKlS8sMPP8iIESPkuedwRqd3JRkunkdaw4YNk/Hj8Xulycvbb78tdevi1Sd1kNSbb8oLL7wgJUuWlFNOOcW6Cc877zy59NJLLUe74IILpFatWlqRCsJpfvnlF7nkkkssJzj11FNlx44dUq5cOencubPUq1fPGvP55+ONnuMlnrTQ/sorr7QIDoWkldolMiGtzZs3S/v27Qt1hAdm8eLFpWJFnBh0osydO1cqV66sxQ+D8L94xVORFnwPD8SaNWvKO++8I3379pVp06ZJu3Z426xweeWVVyyf1lECIy1EEfv24XSZ5AUOAZJav369XHstXrk7UX766SeL/c84A++sHi8A791339WBi9WHCU4zdOhQ2bt3rzz5JH7TtWiJJy1g1aZNG+vpiELSSu0OqUhr/vz50rx5c8sHQVKZlEqVKllkpqOY4H+pSAtj/O2332TVqlWydetW6dmzp7z22mtSogReVSxcLr/8cs9x8TzScmtUkNzixYsLmj311FPSsmVLARgoiL7gYDqL307z66+/yrnn4h3o4wWEhOmwU3BDOOW7776T0047rUikRdJK7wHA9aabcCiIOq5AvRb06aefFkwPa9SoIX369JGpU6fKWWedZU11nGh/4sSJ0q8fjjYrWu655x7p3x8nFOsrfvtfIs2TkRZww9S4a9eu0qRJEwunhQsXyief4D3ywuXxxx+X3r31/fRoYJGWW9MuWrRIrr76aunWDQdFqlPXZsywpoOYMuFm/+ijj6yoQmcJ0mmQK3jjjTfkiiuusJ5mn332mdx6661FjI8bsHHjxrJx4/HDLkha6T0A0ZXjK0eOHJELL7ywgLSqVKliRbXIjyJyjy1IUSxYsEBefRWne58o6aLh9BolrhGk/zkagbTKlCnjzDqsPyOHBUH+CoT0+eefS4MGDeShhx6yMEN6AoIc12233SatWrWyojBdJVDSAgl99dVXCccyevToQnkEkBaAaN26tVX/m2++EUQe1apVs27qtWvXRoK0kBMZPHiwlRdBHgDTPCTmzz77bOnevbsVYj/66KNWlImybt06K6/344/4IW2SltsbI5OcltNnvpJWskQ8cAGJg5TglyCm6667TqpXry633HKLLFmyRG644QbLb+PTO27tFFs/UNJyozhIC4N/+unjv54Flm/WrJmVv0G+4Zlnngk9aSGJOXz4cGsV6+eff7amvLEFK4oVKlSwiBrTkWuuucZKuCNE//ZbnPxL0nLjU6jrlrSQbI7No6IPpC7uuuuupHlHtzo59U2JtFKRFtIXeKh27NjRiriADTBFvhq+ilwXFpImT55s3as6SmhIC0v6eNI5BSuPCEmxmoYCsG6/Hb87oK8E5TTIt2Dai1XE2ALixpMN5OaUDz74wIrI3n//fZJWFqZ3Q1rYFoFI+KqrrrIWfCBYNUNEgbxX/EMmC3UKNQnK/2KVSJeInzRpkowZM0amTJlibb2Bb8JPgQvwadGihYwcOdIKMHSV0JDW3XffbeV1nJJo9RDRlpOY1wFQUE4D0sITLDYpj/EgD4MoLJa0HnvsMetJN2QIfqCHkVamdsdWklmzZglIHzdcon1a+BsENy72BiLPhfzOhAkTBDerQ1qYziNJj37q1KmTqQpp6wXlf25IC+kaLE4Am/Lly1sPz9mzZ8vXX38tTzzxhDU9xPam0E8P33rrLXn+efyEWvry4YcfWuFlfOnRo4e1R8RZBUrfk/saQTkNxoQcFaaBsQXTYDhGLGkh0sSTrG1bnIZL0srEyiAXROUdOnSwoqZevXpZ5LR7924rdwhCQ1m+fLm1koj9glgQwer0qFGjrC0QY8eOtewwbtw4qy6mP/fff7+1Ehlvt0x0SlTHb//DogQegLEFCxPYvB1/D5YuXdoifaQpsJINXZGucM71wjYdTJtBXpg6zpyJE6r1lEAiLQwGDpJJgQOA5OJ32SaKtNAfwvdEJJfJteLr+O00zvVBWk2bNi0SNSJnABJ3SGv16tVWwnPevHkFqzuICLCy6rwdwH1aRS2P3CCIB/uJYqeHiG7xZgWiWXwHLLFUjzwqVqedDaZYQMIeLuQfgb9T8KA555xzsnG1hG389j+sWCMqyqR8+eWXVsQJUgNZxReQOVa7QVggdHssmXSdtk4gpJVWK0Mq+O00hgw7rRoucEnbl8sKnr2u4lIPX6q7wJm4KIsYt7nUFy+JuwidJjHqLnDRbTbenIkRJS4kreOe4eLmpNPopifenPS/JD7F6WGKm42kxUjLHy7OGWc+NBlpMdJKdbO6IHPd9zxvTkagPARQ083Jm0k3PfHm5PSQ00P3d5WLiIKk5R7ebFoQZ5I5Iy1GWu65wwWZu+88dQuSFkmLpEXScs8rJC33mGXTwgXOJHMm4pmI10Tm2dyrqdrw5mSk5T7S0u2FIegv2UbbWNWPhWAculXMBBfd1yTOSUhLN9Ah6K+I/wXhkCHAiSoSASJgKgIkLVMtQ72IABFIiABJi45BBIhAqBAgaYXKXFSWCBABkhZ9gAgQgVAh8P+yarRRJyKtrAAAAABJRU5ErkJggg==" style="cursor:pointer;max-width:100%;" onclick="(function(img){if(img.wnd!=null&&!img.wnd.closed){img.wnd.focus();}else{var r=function(evt){if(evt.data=='ready'&&evt.source==img.wnd){img.wnd.postMessage(decodeURIComponent(img.getAttribute('src')),'*');window.removeEventListener('message',r);}};window.addEventListener('message',r);img.wnd=window.open('https://viewer.diagrams.net/?client=1&page=0');}})(this);"/>

### 入れ子集合モデル

ノードを点ではなく面積を持つ集合として表現するのが入れ子集合モデルのアイデアだ. 本書では「面積を持つ集合」とされているが, 個人的には「幅を持つ区間」で十分ではないかと思うので, 一次元で説明する.

```
|----------------------World---------------------------|
 |-------Japan----------||------------China-----------|
  |---Mie--||--Kagawa--|  |--Beijing--||--Shanghai--|
```

テーブルは以下のようになる. 各ノードが左端と右端を持っていて, 子ノードは親ノードに内包されている.

```
+----------+---------+---------+
| name     | l       | r       |
+----------+---------+---------+
| World    |       1 |      14 |
| Japan    |       2 |       7 |
| Mie      |       3 |       4 |
| Kagawa   |       5 |       6 |
| China    |       8 |      13 |
| Beijing  |       9 |      10 |
| Shanghai |      11 |      12 |
+----------+---------+---------+
```

このモデルを使って, いくつかの操作を考えてみよう.

- ルートノードを得る
  - 自身を内包するノードが存在しないノードを探す

```sql
select
  *
from
  nodes as n1
where
  not exists
  (
    select *
    from nodes as n2
    where n2.l < n1.l and n1.r < n2.r
  );
```

- リーフノードを得る
  - 自身が内包するノードが存在しないノードを探す

```sql
select
  *
from
  nodes as n1
where
  not exists
  (
    select *
    from nodes as n2
    where n1.l < n2.l and n2.r < n1.r
  );
```

- 深さを得る
  - 深さ = 自身を内包するノードの数

```sql
select
  n1.name, count(*)
from
  nodes as n1
  inner join nodes as n2
    on n2.l <= n1.l and n1.r <= n2.r
group by
  n1.name;
```

基本的な操作が行えることが分かったが, ノードの追加は少し難しい. 日本と中国の間に韓国を追加することを考えよう.

```
|----------------------World---------------------------|
 |-------Japan----------||------------China-----------|
```

```
+----------+---------+---------+
| name     | l       | r       |
+----------+---------+---------+
| World    |       1 |      14 |
| Japan    |       2 |       7 |
| China    |       8 |      13 |
+----------+---------+---------+
```

なんと, 日本と中国の間に隙間がないのでノードを追加できない！ように見えるが, それは整数の範囲で考えているからで, 実数にまで拡張すれば隙間はある. ちょうど日本と中国間の隙間を三等分する点を挿入する.

```sql
insert into nodes values(
  'Korea',
  ( -- 7.33...
    (select r from nodes as t where name = 'Japan') * 2
    + (select l from nodes as t where name = 'China')
  ) / 3.0,
  ( -- 7.66...
    (select r from nodes as t where name = 'Japan')
    + (select l from nodes as t where name = 'China') * 2
  ) / 3.0
);
```

ノードの追加は他のノードに影響を与えないし, 非常に簡単に実現できる. しかし, 小数を使うと範囲が実数の有効桁数に制限されてしまう.  
欠点らしい欠点がないように思える入れ子集合モデルだが, 実用するためには十分な有効桁数が必要だ.

### 経路列挙モデル

ファイルシステムは木構造を扱っている. そこから着想を得た, 階層構造をパスで表現するというコロンブスの卵的なアイデアが経路列挙モデルだ.

```
+----------+----------------------------+
| name     | path                       |
+----------+----------------------------+
| World    | /World/                    |
| Japan    | /World/China/Japan/        |
| Mie      | /World/China/Japan/Mie/    |
| Kagawa   | /World/China/Japan/Kagawa/ |
| China    | /World/China/              |
| Beijing  | /World/China/Beijing/      |
| Shanghai | /World/China/Shanghai/     |
+----------+----------------------------+
```

先ほどと同様に, いくつかの操作を実現する SQL を見てみよう.

- ルートノードを得る
  - `path` から `/` を除くと `name` と一致する

```sql
select *
from nodes
where name = replace(path, '/', '');
```

- 深さを得る
  - 区切り文字 `/` の数から計算できる

```sql
select
  name,
  length(path) - length(replace(path, '/', '')) - 1
from
  nodes;
```

- あるノードの親を列挙する
  - 子のパスは親のパスを含んでいる点を利用して LIKE 検索

```sql
select
  *
from
  nodes as n1
  inner join nodes as n2
    on n1.path like concat(n2.path, '%')
where
  n1.name = 'Beijing';
```

更新はやや複雑になる. 例えば日本を中国以下に移動させるには, 日本以下のノードのパスすべてを更新しなければならない.

```sql
update
  nodes
set
  path = replace(path, '/Japan/', '/China/Japan/')
where
  path like '%/Japan/%'
```

ファイルシステムに慣れている身からすると馴染みやすい発想の経路列挙モデルだが, 欠点を挙げると以下のものがある.

- 兄弟同士の順序関係を表現できない
- 巨大な木構造だとパス長が長くなりすぎる
  - その場合はパスに ID を振って `1.2.2.3` のようにパスを表現すればある程度対策可能
- 親の追加やノードの移動などの更新が複雑

入れ子集合モデルに比べて欠点が多いようにも見えるが, これらが大して問題にならない場合もあるだろう. 論理と物理同様, やはりトレードオフを考慮してどのモデルを採用するか決めなければならない.

## 結び

正規化, ER 図, RAID 構成といった基本的な事柄を説明しつつ, インデックスの使いどころや現場で見られるバッドノウハウとその対策などの実践的な内容も含まれていて勉強になりました. 最終章である木構造の話は全体からするとやや浮いているようにも思えましたが, 内容としては面白かったため記事でも紹介しました.

本書で繰り返し強調されていたのは論理と物理のトレードオフです. [銀の弾などない](https://ja.wikipedia.org/wiki/%E9%8A%80%E3%81%AE%E5%BC%BE%E3%81%AA%E3%81%A9%E3%81%AA%E3%81%84) と言われますが, DB 設計にもまさに当てはまる警句です.  
トレードオフを理解することが設計に立ち向かうスタート地点だと思うので, 次は物理, つまり DBMS の中身を学びたいと思いました.
