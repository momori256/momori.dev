+++
title = "『仕組みと使い方がわかる Docker＆Kubernetes のきほんのきほん』でようやく Docker の基本を理解する"
date = 2023-05-06
tags = ["docker", "k8s"]
cover.image = "https://source.unsplash.com/4aOhA4ptIY4"
+++


[仕組みと使い方がわかる Docker＆Kubernetes のきほんのきほん](https://book.mynavi.jp/ec/products/detail/id=120304) は Docker の入門書です. イラストやハンズオンが豊富で, サーバや Linux の知識が豊富ではない人にも Docker の基本が分かるように書かれた本です.

ネット上のコマンドを見様見真似でなんとなく Docker を使うことは難しくありませんが, 結局そのコマンドはどういう意味なのか, どういう仕組みで Docker が成り立っているのかを知らないと応用できません. これまで `docker run` や `docker-compose up` などのコマンドを使ってきたのに, その実何が起きているのか理解していなかったのですが, 本書の説明でようやく基本が理解できました.


## Docker コマンドのフォーマット

Docker コマンドを使う上で最も重要だと感じたのがコマンドのフォーマットです.

```
docker <上位コマンド> <下位コマンド> [オプション]
```

`<上位コマンド>` は基本的に操作対象を, `<下位コマンド>` は操作を表しています. 例えば `docker container start` だと, コンテナを開始するという意味です.

これがなぜ重要なのかと言うと, 操作対象を明確に意識できるからです. 自分が操作しようとしているのはコンテナなのかイメージなのかはっきりと分かります.  
これまで, Docker には, 隔離されたプログラムの実行環境であるコンテナと, コンテナの設計図であるイメージがあるというような説明を目にしたことがあったにも拘らず, それを各コマンドと結び付けられていなかったのですが, このフォーマットを知ることで疑問が氷解しました. コンテナ, イメージ, ネットワーク, ボリュームなど, 扱いたい対象が上位コマンドに来るというただそれだけなのです.

混乱の原因となっていたのは, 上位コマンドは省略可能な場合があることです. 例えば `docker ps` はコンテナの状態を表示するコマンドですが `container` の文字がありません. 実はこれは `docker container ps` と同じ意味なのですが, 歴史的な経緯により `ps` でも `container ps` と同じことができます. ちなみに別名もあって, `docker container ls` も同じです.  
さらにややこしいのは `docker run` です. これはコンテナを起動するコマンドなので `docker container run` と同じ意味なのですが, `image pull`, `container create`, `container start` という 3 つのコマンドの複合です. 操作対象が省略されることがあることに加え, 一つのコマンドが複数の意味を持つ場合があることで混乱が生じていました.

Docker のバージョン 1.13 以降でコマンドが整理されて, `docker <上位コマンド> <下位コマンド>` というフォーマットになったようです. 上位コマンドを書いた方が初心者には分かりやすいですが, 旧コマンドも残されているので省略形は今でも良く使われます. 省略形を含めたコマンドのエイリアスは `--help` オプションで確認することができます.

```sh
> docker container ls --help

Usage:  docker container ls [OPTIONS]

List containers

Aliases:
  docker container ls, docker container list, docker container ps, docker ps

Options:
  (省略)
```

`container ls`/`container list`/`container ps`/`ps` という 4 つのエイリアスがあることが分かります. なぜこんなにあるのか少し不思議です. 利便性を追求した結果でしょうか.

## コンテナのライフサイクル

コンテナは作成, 開始, 停止, 破棄というサイクルで運用します. それぞれに `docker container create/start/stop/rm` というコマンドがあります. 非常に基本的な操作でありコマンドも分かりやすいですが, `docker run` でまとめて実行したり `docker stop` という省略形を使ったりしていたので, これらのコマンドを入力したことはなかったかもしれません.

HTTP サーバである Apache を起動する `docker run httpd` を分解して見てみましょう.

まずイメージを [Docker Hub](https://hub.docker.com) というレジストリからダウンロードします. Apache のイメージ名は apache ではなくて httpd です.

```sh
docker image pull httpd
```

このコマンド自体はシンプルですが, レジストリとレポジトリという用語を説明しておきます. レジストリはイメージの配布場所で, Docker Hub は Docker 公式が運営するレジストリです. レポジトリはレジストリ内の各イメージごとの単位です. 例えば [httpd](https://hub.docker.com/_/httpd) レポジトリでは httpd のバージョン 2.4.57, 2.4, 2 などの複数のイメージが管理されています.  
ちなみに Docker Hub 以外に自分でレジストリサーバを立てることもできます. [registry](https://hub.docker.com/_/registry) のコンテナを使うのですが, 意外に簡単です.

イメージを調達したらコンテナを作成します. httpd はポート 80 を使うので, `-p` オプションでローカルの 8080 をコンテナの 80 にマッピングします. 8080 は他のプログラムと被らなければ何でも良いです.

```sh
docker container create -p 8080:80 httpd
```

作成したコンテナを確認します.

```sh
> docker container ls -a
CONTAINER ID   IMAGE     COMMAND              CREATED         STATUS    PORTS     NAMES
1d3bd0c914ba   httpd     "httpd-foreground"   6 seconds ago   Created             blissful_elbakyan
```

`STATUS` が `Created` となっているコンテナが確認できます. `--name` でコンテナの名前を指定しなかったので, ランダムな名前が割り当てられています. `-a` を付けないと起動中のコンテナのみを表示するので, `container create` 後のコンテナを見るには `-a` が必須です.

ちなみに httpd がポート 80 を使うというのはイメージ作成者によって決められています. Docker Hub から辿れる [イメージ作成の元となる Dockerfile](https://github.com/docker-library/httpd/blob/7d6139b45f2e9a3146c2062894aca949cba91bba/2.4/Dockerfile) を見ると `EXPOSE 80` という記述があります. これは, このイメージではポート 80 を使うようにというガイドラインです. `EXPOSE` だけでは意味はないので, `container create` や `container run` の `-p` オプションでコンテナのポートを公開してホストのポートに割り当てる必要があります.  
`-p` は port の p だと思っていたのですが `publish` の p でした. `--publish-all` というオプションを使うと, `EXPOSE` されているポートに自動的に適当なポートを割り当てることもできます.

作成したコンテナを起動します.

```sh
docker container start blissful_elbakyan
```

開始したコンテナを確認してみます.

```sh
> docker container ls
CONTAINER ID   IMAGE     COMMAND              CREATED          STATUS         PORTS                                   NAMES
1d3bd0c914ba   httpd     "httpd-foreground"   14 minutes ago   Up 2 seconds   0.0.0.0:8080->80/tcp, :::8080->80/tcp   blissful_elbakyan
```

これで http://localhost:8080 にブラウザなどでアクセスすると Apache が立ち上がっていて `It works!` と表示されます.

コンテナの停止と削除は簡単です. 停止してから削除する必要があります.

```sh
docker container stop blissful_elbakyan
docker container rm blissful_elbakyan
```

作成から破棄までの一連の流れがコンテナのライフサイクルです.


## 二種類のデータ永続化

コンテナは用が済んだらすぐに破棄するという思想らしいので, 作成から破棄までのライフサイクルを頻繁に繰り返すことになります. コンテナを破棄するとコンテナ内のデータも消えてしまうので, データを残しておきたい場合はバインドマウント, またはボリュームマウントという二つの方法によってデータを永続化する必要があります.

バインドマウントはホスト上のディレクトリをコンテナにマウントする方法です. 例えば以下のコマンドでカレントディレクトリにある `htdocs` ディレクトリをコンテナ内の `/usr/local/apache2/htdocs` にマウントできます.

```sh
docker container create -p 8080:80 -v `pwd`/htdocs:/usr/local/apache2/htdocs httpd
```

Apache は `/usr/local/apache2/htdocs/index.html` ファイルがあれば表示するので, ホスト側で `htdocs/index.html` を作っておけば表示されます.

ボリュームマウントは Docker が管理する領域にデータを保存する方法です. ボリュームを作成してから使用します.

```sh
docker volume create --name my-volume
```

```sh
> docker volume ls
DRIVER    VOLUME NAME
local     my-volume
```

```sh
docker container create -p 8080:80 -v my-volume:/usr/local/apache2/htdocs httpd
```

ボリュームがマウントされているかどうかは `docker container inspect` コマンドで確認できます.

```json
"Mounts": [
    {
        "Type": "volume",
        "Name": "my-volume",
        "Source": "/var/lib/docker/volumes/my-volume/_data",
        "Destination": "/usr/local/apache2/htdocs",
        "Driver": "local",
        "Mode": "z",
        "RW": true,
        "Propagation": ""
    }
],
```

ボリュームは Docker が内部的に保存場所を確保するのですが, Linux だと `/var/lib/docker/volumes/my-volume/_data` にあるようですね. ただ, ここをホストから操作することは想定されていないのでコンテナ外から触ってはいけません. ホストからもファイルを操作したい場合はバインドマウントが適しています. 一方で, ボリュームはホストに依存しないので, Linux から Windows へ移行する場合などにはパスの形式などを気にしなくて良い分簡単です.

二種類のマウントの他に tmpfs マウントという方法もあります. これはホストのメモリにデータを保存する方法で, コンテナを停止するとデータは削除されます. バインドマウントもボリュームマウントも明示的に削除しなければデータは消えないので, 一時的に利用したい場合は tmpfs マウントが便利かもしれませんが, 今は用途が思いつきません.

ちなみに, マウントするほどではないけどホストとコンテナ間でファイルやフォルダをやり取りしたい場合には `docker container cp` というコマンドが便利です.

## docker-compose

複数のコンテナを立ち上げてコンテナ間で通信するような場合, いくつもコマンドを実行しないといけないので管理が煩雑になります. 複数のコンテナとその周辺環境 (ネットワークやボリューム) を管理するのが `docker-compose` というツールです.

例として WordPress を考えます. WordPress サーバと DB サーバの二つのコンテナがあって, それらが通信するので題材として適しています.  
WordPress を立ち上げるには以下のような手順を取ります. 最初に必要なパラメータをまとめておきます.

| parameter | value  |
| --------- | ------ |
| network   | wpnet  |
| database  | wpdb   |
| user      | wpuser |
| password  | wppass |

- ネットワーク作成

```sh
docker network create wpnet
```

- MySQL 用ボリューム作成

```sh
docker volume create --name wp-mysql-volume
```
- MySQL コンテナ起動

`-d` はコンテナをバックグラウンドで起動するオプションです. `-e` で必要な環境変数を設定しています.

```sh
docker container run -d --name wp-mysql -v wp-mysql-volume:/var/lib/mysql/ --network wpnet -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=wpdb -e MYSQL_USER=wpuser -e MYSQL_PASSWORD=wppass mysql:5.7
```

- WordPress コンテナ起動

```sh
docker container run -d --name wp-wordpress -p 8080:80 -v `pwd`/html:/var/www/html --network wpnet -e WORDPRESS_DB_HOST=wp-mysql -e WORDPRESS_DB_NAME=wpdb -e WORDPRESS_DB_USER=wpuser -e WORDPRESS_DB_PASSWORD=wppass wordpress
```

これで http://localhost:8080/ にアクセスすると WordPress の画面が表示されます. コマンドを一つずつ実行するのは面倒で, 何か良い方法は無いかと思ったところで `docker-compose` の登場です.

docker-compose.yml というファイルにコンテナの作成方法やネットワーク, ボリュームなどの周辺環境の設定を記載しておいて, コンテナ群の開始と停止を簡単に行えるようにします. 少し長いですが, 上記のコマンドと対応しているので意味は分かると思います.

```yml
version: "3"

services:
  wp-mysql:
    image: mysql:5.7
    networks:
      - wpnet
    volumes:
      - wp-mysql-volume:/var/lib/mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: wpdb
      MYSQL_USER: wpuser
      MYSQL_PASSWORD: wppass
  wp-wordpress:
    depends_on:
      - wp-mysql
    image: wordpress
    networks:
      - wpnet
    volumes:
      - ./html:/var/www/html
    ports:
      - 8080:80
    restart: always
    environment:
      WORDPRESS_DB_HOST: wp-mysql
      WORDPRESS_DB_NAME: wpdb
      WORDPRESS_DB_USER: wpuser
      WORDPRESS_DB_PASSWORD: wppass
networks:
  wpnet:
volumes:
  wp-mysql-volume:
```

`docker-compose up -d` で開始, `docker-compose down` で停止です. 停止するとコンテナは削除されます. 毎回コマンドを入力する手間が省けました.

`docker-compose` のような複数のコンテナを管理するツールをオーケストレーションツールと言うのですが, 他にも kubernetes というツールがあります. kubernetes は複数のコンテナが複数のマシンに存在する状況を想定しています. 例えば Apache コンテナを複数立ち上げて複数マシンでロードバランスするというような状況です. コンテナの数を変更したり, 複数のコンテナを一括で操作したりするときに便利なツールです.  
本書の最後は kubernetes についての章なのですが, 大規模なシステムで利用されてこそ価値を発揮するツールなので, 自分のマシン一台で動かすのだと面倒なだけでいまいちピンときませんでした. 物理マシンの数を簡単に変更できて面倒なセットアップも不要なクラウドと組み合わせて kubernetes を使うといかにもモダンな感じがしますが, 必要が出てきたらまた改めて勉強します.

ちなみに kubernetes は省略して k8s と書かれることがあります. これは k と s の間に 8 文字あることから来ている表記です. 他にもベンチャーキャピタルの [Andreessen Horowitz](https://a16z.com) が a16z だったり, localization が l10n とされているのを見たこともあります. 初見では何を意味しているか推測するのが難しいですが, 短く書けるので知っていると便利かもしれません.

## 結語

最初に書いた通り, コマンドのフォーマットを知って操作対象を意識できるようになったことが最大の学びでした. むしろ今まで知らずに何となく Docker を使っていたことにぞっととしました (本を読むといつも自分の無知を実感します).  
その他に, Docker コンテナが軽量な理由は Linux カーネルを持っていないからだということも初めて知りました. カーネルはホストの OS のものを使うので軽量だが, その代わりにホストには Linux が必要になるということで, Windows や Mac では Docker を使うために特別な工夫が必要だということも納得できました.

きほんのきほんは分かったので, Dockerfile の書き方や docker-compose, k8s の使い方など, より実践的な部分は都度調べながら対応していけそうです.
