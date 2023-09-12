---
title: "Apache Bench でベンチマークできるミニマルな C 言語製 HTTP サーバ"
date: "2023-02-24"
tags: "c, network"
imagePath: "/blog/c-server-for-apache-bench/doug-kelley-2YtdyCXjOuU-unsplash.jpg"
photoByName: "Doug Kelley"
photoByUrl: "https://unsplash.com/@dkphotos?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
photoOnName: "Unsplash"
photoOnUrl: "https://unsplash.com/photos/2YtdyCXjOuU?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
---

# Apache Bench でベンチマークできるミニマルな C 言語製 HTTP サーバ

`ab` コマンド, つまり [Apache HTTP server benchmarking tool](https://httpd.apache.org/docs/2.4/programs/ab.html) をつかってベンチマークできる状態の HTTP サーバを C 言語で作る. なるべくシンプルに必要最小限の要素のみを持ったコードを目指す.

手堅いエンジニアは高速化のために, いきなりコードを書いたりしない. 計測できる環境を整えておかないと, 高速化をしてもその効果を測ることができない.  
このサーバを出発点として手を加えて (例えばマルチスレッド化したり IO 多重化をしたりして) サーバのパフォーマンスがどのように変化するかを確かめるために使うことを想定している. ソースコード全体は https://github.com/momori256/cs2 にある.

## Table of Contents

## ソケット

`ab` を使うには HTTP を解すサーバでなければならないため, まずは TCP での通信を実装する.  
ソケットプログラミングはお決まりのコードなので説明は省く. いつもお決まりを忘れてしまうので, `man getaddrinfo` の EXAMPLE をいつも参照している.

`socket`, `bind`, `listen` をして `accept` できるソケットを作成する部分は以下の関数だ.

```c
int sock_create(const char* const port, int backlog) {
  typedef struct addrinfo addrinfo;

  addrinfo hints = {0};
  {
    hints.ai_family = AF_INET; // IPv4.
    hints.ai_socktype = SOCK_STREAM; // TCP.
    hints.ai_flags = AI_PASSIVE; // Server.
  }

  addrinfo* head;
  {
    const int result = getaddrinfo(NULL, port, &hints, &head);
    if (result) {
      fprintf(stderr, "getaddrinfo. err[%s]\n", gai_strerror(result));
      exit(1);
    }
  }

  int sfd = 0;
  for (addrinfo* p = head; p != NULL; p = p->ai_next) {
    sfd = socket(p->ai_family, p->ai_socktype, p->ai_protocol);
    if (sfd == -1) {
      continue;
    }

    int val = 1;
    if (setsockopt(sfd, SOL_SOCKET, SO_REUSEADDR, &val, sizeof(val)) == -1) {
      error("setsockopt");
    }

    if (bind(sfd, p->ai_addr, p->ai_addrlen) == -1) {
      close(sfd);
      continue;
    }
    break;
  }
  freeaddrinfo(head);

  if (!sfd) {
    error("socket, bind");
  }

  if (listen(sfd, backlog) == -1) {
    error("listen");
  }
  return sfd;
}
```

## HTTP リクエストとレスポンス

`accept` して `read` すればメッセージを受信できる. 動作の確認には `telnet` のようなプリミティブなツールが役に立つ.

メッセージの受信ができるようになったので, 後は適切なレスポンスを返すだけだ. HTTP の仕様は MDN のページをいつも参考にしている. [HTTP Messages](https://developer.mozilla.org/en-US/docs/Web/HTTP/Messages) によると, 例えば以下のようなレスポンスを返せば良さそうだ.

```
HTTP/1.0 200 OK
Content-Length: 5

hello
```

今回は受け取ったリクエストをそのまま body として返すことにする. 実際には例えば DB サーバなら, 典型的には SQL を実行してその結果を返すことになるだろう.

```c
const int BACKLOG = 10;
const int NBUF = 256;

#define CRLF "\r\n"

static void handle_request(int fd);

int main(int argc, char *argv[]) {
  if (argc < 2) {
    fprintf(stderr, "%s <PORT>\n", argv[0]);
    return 0;
  }
  const char* const port = argv[1];
  const int lfd = sock_create(port, BACKLOG);
  while (1) {
    const int pfd = sock_accept(lfd, NULL);
    handle_request(pfd);
  }
  return 0;
}

static void handle_request(int fd) {
  char request[NBUF];
  const size_t nread = read(fd, request, sizeof(request));
  if (nread == -1) {
    error("read");
  }

  char response[NBUF];
  const int nres = snprintf(
    response,
    sizeof(response),
    "HTTP/1.0 200 OK" CRLF
    "Content-Length: %lu" CRLF
    CRLF
    "%s",
    nread,
    request);
  const size_t nwrite = write(fd, response, nres);
  if (nwrite == -1) {
    error("write");
  }
  if (close(fd) == -1) {
    error("close");
  }
}
```


早速 `ab` を使ってみる. まずはクライアント数 1, リクエスト数 1 とする.

```sh
ab -c 1 -n 1 localhost:22421/
```

リクエストは以下のような形式で body はなかった.

```
GET / HTTP/1.0
Host: localhost:22421
User-Agent: ApacheBench/2.3
Accept: */*

```

サーバが正常に動作していればベンチマークは一瞬で終わり, 以下のような結果が表示される.

```
> ab -c 1 -n 1 localhost:22421/

This is ApacheBench, Version 2.3 <$Revision: 1903618 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking localhost (be patient).....done


Server Software:
Server Hostname:        localhost
Server Port:            22421

Document Path:          /
Document Length:        83 bytes

Concurrency Level:      1
Time taken for tests:   0.000 seconds
Complete requests:      1
Failed requests:        0
Total transferred:      122 bytes
HTML transferred:       83 bytes
Requests per second:    5952.38 [#/sec] (mean)
Time per request:       0.168 [ms] (mean)
Time per request:       0.168 [ms] (mean, across all concurrent requests)
Transfer rate:          709.17 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    0   0.0      0       0
Processing:     0    0   0.0      0       0
Waiting:        0    0   0.0      0       0
Total:          0    0   0.0      0       0
```

83 bytes の HTML が 0.168 ms で返ってきたことが分かる. `ab` の引数を変えて様々な値のクライアント数, リクエスト数で試してみて, サーバのパフォーマンスを測る.  
ベンチマークとしては `Requests per second`, つまり 1 秒間に何個のリクエストを処理できたかという指標がよく利用される ([Performance metrics](https://en.wikipedia.org/wiki/Web_server#Performances)).

## 結語

なるべくシンプルに, 最小限 HTTP をやり取りできるサーバを書いた. サーバのベンチマークは初めてだったが, `ab` のおかげで意外と簡単にできた.  
マルチスレッド, マルチプロセス, スレッドプール, IO 多重化といった物事を試すのに, やはり定量的な指標があると良い指針となる. 実際に動かして簡単に実験できる環境を作ることがプログラミングでは重要だと思う.
