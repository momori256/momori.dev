+++
title = "『Effective C#』で C# に親しむ"
date = 2022-07-10
tags = ["c#"]
cover.image = "https://source.unsplash.com/https://unsplash.com/es/fotos/o6mV3NPlmGw"
+++


様々な言語にある Effective シリーズの C# 版 [『Effective C# 6.0/7.0』](https://www.seshop.com/product/detail/22138) です.
基本的な文法の説明などはなく, 実践的な問題に対するテクニックやアプローチの仕方が 50 項目掲載されています. C# の基本的なことは分かったという状態で読むと理解が深まるでしょう.

50 項目のうち特に印象に残ったものを紹介します.


## 項目 2 const よりも readonly を使用すること

混乱しがちな const と readonly についての項目です.

両者の最も大きな違いは, const はコンパイル時, readonly は実行時に解決されるという点です. コンパイル時定数の const 変数は, コード中の使用箇所をその値で置き換えたような IL が生成されます.  
この仕組みによって const 変数が別アセンブリで参照される場合, 気づきにくいバグを生む可能性があります. const 変数の値を変更したとしても, その変数を使用しているアセンブリではリビルドするまで変更前の値のままになるのです.  
よって基本的にこの問題を回避できる readonly を使ったほうがよいという主張です.

しかし, これは const 変数を外部のアセンブリに公開した場合のみに起こる現象なので, private や internal にしておけば済む話です. ライブラリではないプログラムの場合はそもそも外部のアセンブリに使われることがないので関係ありません.  
よってスローガンは「外部アセンブリに公開する変数は const よりも readonly を使用すること」の方がより正確だと思います. もちろん const にはパフォーマンスの利点しかないので, 柔軟性を重視して常に readonly を使うという考え方もありかもしれません. しかし, コンパイル時に決まる値ならコンパイル時に決めたほうが良いですし, デメリットを理解した上で const と readonly を適切に使い分けるべきということですね.

## 項目 5 カルチャ固有の文字列よりも FormattableString を使用すること

FormattableString は補間文字列 `$""` で変数を展開して作成できる文字列を保持することができる型です.  
FormattableString というものを知らず, 一読しただけでは意味が分からなかったのですが, 補間文字列を展開結果の string ではなく全情報を持つ FormattableString として扱うことで加工ができるということのようです.

加工の例として, カルチャに合わせて文字列を変換することができます. 日付や数値など地域によって表記の仕方が異なるものを適切な表記にするということです.  
以下のコードは日付を「日本語 - 日本」「スペイン語 - スペイン」「英語 - オーストラリア」のカルチャで表示する例です. `FormattableString` の `Format` や `GetArguments()` を使用しています.

```cs
Func<FormattableString, string> toSpanishSpain = (src) =>
  string.Format(
      System.Globalization.CultureInfo.CreateSpecificCulture("es-ES"),
      src.Format,
      src.GetArguments());

Func<FormattableString, string> toEnglishAustralia = (src) =>
  string.Format(
      System.Globalization.CultureInfo.CreateSpecificCulture("en-AU"),
      src.Format,
      src.GetArguments());

// 変数の型を指定しないと string になる.
FormattableString s = $"Now = {DateTime.Now}";

// ja-JP: Now = 2022/07/10 18:39:30
Console.WriteLine($"ja-JP: {s}");

// es-ES: Now = 10/7/2022 18:39:30
Console.WriteLine($"es-ES: {toSpanishSpain(s)}");

// en-AU: Now = 10/7/2022 6:39:30 pm
Console.WriteLine($"en-AU: {toEnglishAustralia(s)}");
```

## 項目 9 ボックス化およびボックス化解除を最小限に抑える

そもそもボックス化とは何かということを知らなかったので, 特にためになった項目です.

C# では値型と参照型が区別されています. しかし, 例えば int は値型ですが, 参照型の object 型としても使えます. これを実現する仕組みがボックス化です.  
値型を object 型として使用する時, ヒープ上に object 型用のメモリ領域が確保され, そこに値がコピーされます. ヒープ上のコンテナの中に値を格納するのでボックス化 (boxing) と呼ばれます. そして, ボックス化された値を使うときは値がコピーして取り出されます. これがボックス化解除 (unboxing) です.

ボックス化/ボックス化解除には, ヒープ上のメモリ確保, 値のコピーのコストが掛かります. 場合によってはこれがパフォーマンスを落とす大きな要因となるので, なるべくボックス化が発生しないように気をつけようという趣旨の項目です.  
ボックス化については以下の記事が分かりやすかったので引用させていただきます.
- [Boxing and Unboxing (C# Programming Guide)](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing)
- [ボックス化 (++C++; // 未確認飛行 C)](https://ufcpp.net/study/csharp/RmBoxing.html)

ボックス化は object が要求されているところに値型を渡したときに発生します. 例を 2 つ紹介します.

```cs
Console.WriteLine($"number: {256}");
```

この補間文字列は`string.Format`に展開され, `string.Format`は引数として object を要求します (`string Format (string format, params object?[] args)`).  
よって, このコードによって int 型の 256 のボックス化が行われます. 最終的には `int.ToString()` メソッドが呼ばれるので, このボックス化は全くの無駄です.

```cs
object o = 256; // boxing.
int i = (int)o; // unboxing.
i.ToString();
```
ボックス化を避けるには以下のように予め `int.ToString()` を呼んでおきます.

```cs
Console.WriteLine($"number: {256.ToString()}");
```

もう 1 つの例は非ジェネリック版のコレクションです. `List<T>` などのジェネリックのコレクションクラスは .NET 2.0 以降に追加されたものらしく, それ以前にはデータを object 型で保持するコレクションクラスが使用されていました. 例えば ArrayList クラスです. 新しい .NET を使えるなら非ジェネリック版のコレクションクラスは無用ですが, 古い API に合わせるために要求されるかもしれません. 例えば struct を保持する ArrayList を使用すると, ボックス化とボックス化解除によって著しくパフォーマンスが低下する可能性があります.

パフォーマンスについての記事 [.NET Performance Tips](https://docs.microsoft.com/en-us/dotnet/framework/performance/performance-tips) によると, 単純な値の代入と比較してボックス化には最大 20 倍, ボックス化解除のキャスト (上記の例だと `int i = (int)o` のこと) には最大 4 倍もの時間が掛かることがあるそうです.

## 項目 12 メンバには割り当て演算子よりもオブジェクト初期化子を使用すること

タイトルの意味が分かりにくいと感じますが, 内容はシンプルです. クラスのフィールドを初期化するとき, コンストラクタでの初期化よりも宣言と同時に初期化する方法 (=オブジェクト初期化子) を使うべきということです.

宣言と同時に初期化した方がコードが見やすいので当たり前な項目だと思いましたが, コードの実行順序を意識していなかったので勉強になりました.  
インスタンスが作成される時, 実行は以下の順序です.
1. オブジェクト初期化子
2. 基底クラスのオブジェクト初期化子
3. 基底クラスのコンストラクタ
4. コンストラクタ

```cs
public class C
{
  public C(string s)
  {
    Console.WriteLine(s);
  }
}

public class Base
{
  public Base()
  {
    Console.WriteLine("Base");
  }

  private C _c3 = new C("c3");
  private C _c4 = new C("c4");
}

public class Derived : Base
{
  public Derived()
  {
    Console.WriteLine("Derived");
  }

  private C _c1 = new C("c1");
  private C _c2 = new C("c2");
}

var d = new Derived();
/*
c1
c2
c3
c4
Base
Derived
*/
```

次の項目 13 で触れられている static コンストラクタ/フィールド初期化子は非 static フィールドの初期化子よりも先に実行されます.

ちなみにコンストラクタ関連の項目 14 で, 以下のように別のコンストラクタを呼び出すことで初期化のロジック重複を避けるテクニックが紹介されています. これは便利ですし, readonly なフィールドはコンストラクタでしか初期化できず初期化用の関数を用いることはできないので, ロジックの重複を排除するには必須の方法です.

```cs
public C()
  : this(0, 1)
{
}

public C(int x)
  : this(x, 1)
{
}

public C(int x, int y)
{
  this.X = x;
  this.Y = y;
}

public readonly int X;
public readonly int Y;
```

## 項目 20 `IComparable<T>` と `IComparer<T>` により順序関係を実装する

`IComparable` `IComparer` `Comparison` `IEquatable` あたりが整理できておらず毎回ネットを検索していましたが, ようやく理解しました.

- `IComparable`: 順序関係を持つクラスに実装する
- `IComparer`: `IComparable` の順序関係とは異なる順序を定義する
- `Comparison`: T 型の引数を 2 つとって `CompareTo` の結果を返す `(T, T) -> int` のデリゲート
- `IEquatable`: 同値性を判定できるクラスに実装する

例えば名簿を考えます. 名簿は以下の `Person` クラスのリストとします.

```cs
class Person
{
  public string Name { get; set; } = string.Empty;
  public int Age { get; set; }
}
```

`IComparable<T>` では一般的な順序関係を定義します. 例えば基本的に名前順で並べるならば `Name` で順序関係を決めます.

```cs
class Person : IComparable<Person>
{
  public int CompareTo(Person? other)
  {
    return this.Name.CompareTo(other);
  }
}

// List.Sort() によって名前順でソートされる.
```

名前だけではなく年齢でもソートしたい場合は, 年齢で順序関係を決める `IComparer<T>` を実装するクラスを作成します.

```cs
class AgeComparer : IComparer<Person>
{
  public int Compare(Person? x, Person? y)
  {
    return x.Age.CompareTo(y.Age);
  }
}

// List.Sort(new AgeComparer()) で年齢順にソートされる.
```

List.Sort() でのソートの仕方はもう 1 つあります. この引数が `Comparison` です.

```cs
var l = new List<Person>();
l.Sort((x, y) => x.Age.CompareTo(y.Age));
```

`IEquable` は同値性についてのインターフェースですが, 実は同値性は順序関係とは別物です. 順序が同じでも同値ではない, 同値だけど順序は異なるといった状態が自然である場合はありえます. 例えば参照型の `object.Equals` はフィールドの値が同じかどうかではなくメモリの参照先が同じかどうかで同値性を判定します.

ついでに, インターフェースの明示的実装をするテクニックも紹介されていました.  
非ジェネリック版の `ICompable` も実装しなければならないとします. このとき `IComparable.CompareTo` のように関数名の前にインターフェース名を付けるとインターフェースを明示的に実装したことになります.  
こうすると `IComparable` 型にキャストして `CompareTo` を呼び出さない限りジェネリック版の `CompareTo<T>` を呼び出すようにすることができます. 非ジェネリック版は実行時に型チェックが必要でパフォーマンスが良くないので基本的にジェネリック版の関数を使いたいというような場合に利用できるテクニックです.

```cs
class Person : IComparable<T>, IComparable
{
  int IComparable.CompareTo(object? obj)
  {
    var p = obj as Person;
    if (p == null)
    {
      throw new ArgumentException();
    }
    return this.CompareTo(p);
  }
}
```

## 項目 27 最小限に制限されたインターフェースを拡張メソッドにより機能拡張する

インターフェースに機能を追加するとき, API として追加するとインターフェースを実装しているクラス全てに変更を強いられますが, 拡張メソッドを利用することで利用者の変更は不要になるという内容です.  
拡張メソッドは濫用するとコードが分かりにくくなるので基本的に使わない方が良いと思っていたので, 拡張メソッドの利用例を紹介する内容は新鮮でした.

拡張メソッドの危険性は, 結局どの関数が実行されるのか分かりにくくなるという点だと思います. 任意の場所に関数を定義できて定義場所が分散すると可読性が下がりますし, 項目 35 で指摘されているように, 拡張メソッドをオーバロードすると `using` している名前空間によって呼ばれる関数が変わるので混乱は更に深まります.

本書では次の項目 28 でも拡張メソッドを利用して既存の型に対する機能追加の例を紹介していますが, 要はインターフェースの関数にデフォルト実装を与えるという目的で拡張メソッドを使用しているふうに見えます. 濫用は危険だが, 実装先で挙動を変える必要がない, インターフェース自体に共通の挙動は拡張メソッドとしてデフォルト実装を与えると便利ということです.  
これは理に適った用途だと思います. 実際 LINQ の関数は `Enumerable` に拡張メソッドとして実装されていますが, 非常に便利ですし何の問題もありません.

しかし C#8 以降ではインターフェースがメソッドやプロパティなどの実装を持てるようになったので, デフォルト実装という意味ではこれを利用するほうが自然でしょう. 本書は C#6.0/7.0 を対象としているのですが, この新機能に対する意見も聞いてみたいところです.

ちなみに, C#8 より前でもデフォルト実装を持ちたいならインターフェースではなくクラスにして継承すればいいのではないかと思い, そもそも抽象クラスとインターフェースの違いについて悩みました.  
私の結論としてはクラスは is-a 関係を表すもの, インターフェースはできること (契約や仕様) を表すものだという考えです. おそらく C# では抽象クラス, インターフェースともにできることはそれほど変わらないと思います. できることではなくそもそもの役割に立ち返ることで区別するスタンスで個人的には納得なのですが, これは妥当なのでしょうか.

## 項目 45 契約違反を例外として報告すること

最終章の 6 項目は例外についてです. 個人的に例外は厄介なものだと常々思っており, 使いどころが分からないでいるので, 本書の内容を踏まえて考えてみます.

例外はエラーを表現するものですが, 他にも真偽値や整数のエラーコードを返す方法があります. 例外がこれらの伝統的な方法よりも優れている点は多くの情報を持たせることができるという点です. 例外はクラスなので, エラーメッセージ, スタックトレースはもちろん, 独自の例外クラスを作成することで自由に情報を持たせられます. 例えば `HttpException` は HTTP のエラーコードを持っています.

しかし, 本書は全てのエラーを例外にすべきと主張しているのではありません. 返り値で十分な場合はそれでよく, あくまでも重大なエラーのみに例外を使うべきということです.

> 明確なガイドラインはないのですが, 発生したエラーが即座に処理あるいは報告されないのであれば, 長期に渡って問題を引き起こすような場合にのみ例外を使用することを推奨します (p.210)

例外は「情報量が多い」「無視しづらい (catch しなければ強制終了する)」という点で, たしかに重大なエラーには例外を用いるのも一理あります.  
それは理解できるのですが, 私が例外の問題点だと思っているのは, どの関数が例外を投げるか分かりにくいということに尽きます. 使った関数が実は例外を投げるもので, ある時突然アプリが落ちてしまったというようなことになるのが嫌だと言うことです. 例外を投げるかどうかすぐに分かればよいのですが, 分からない場合は毎度毎度ドキュメントを読んだりソースコードを読んだりしないといけないとすると非常に手間が掛かります. その点, 例えば返り値が bool なら失敗することもある関数だと一目瞭然です.

例外は無視しづらいという点については try-catch で囲みさえすれば無視できるのでそれほど大きな利点ではないと思います. 情報量が多いという点についても, 真偽値を返しつつ失敗したときは out 引数などでエラーの詳細を渡すこともできるので, 大した差ではないと思います. 以下のようなイメージです.

```cs
// 成否を返す関数. 失敗したら err にエラーの詳細を入れる.
bool TryDoSomething(out ErrorData err) {}

if (!TryDoSomething(out ErrorData err)) {
  ReportErrorToUser(err); // エラー情報を利用する.
}
```

例外にせよ返り値でのエラー判定にせよエラーは無視するべきではないので, 無視できないように型システムなどで強制するのが静的型付け言語では良い気がします. 個人的には, 今のところ関数型の optional 型のやり方がエラーを表すのに一番良いのではないかと思っていますが, 例外って実際のところどう思われているのでしょう. 他の方の意見を聞いてみたいところです.

## 項目 50 例外フィルタの副作用を活用する

例外フィルタとは catch に when を続けて書くことで例外を catch する条件を記述できる機能です.

```cs
try
{
  // do something.
}
catch (HttpException e) when (retryCount > 0)
{
  Console.WriteLine("Retry.");
  --retryCount;
}
```

この例外フィルタの面白い使い方が 2 つ紹介されていました. 1 つ目は常に false を返すフィルタです.  
false を返すと catch されないので無意味ではないかと思うかもしれませんが, 以下のようにして全ての例外のログを取ることができます.

```cs
try
{
  // do something.
}
 // ↓ add this line to the top of the catches.
catch (Exception e) when (WriteLogException(e)) {}
catch (HttpException e) {}
catch (ArgumentException e) {}
```

既存のフローを変更せずに実現できる点が実用的ですね.

もう 1 つはデバッグ実行時に catch 句を無効化するテクニックです. このフィルタを全ての catch 句に追加した上で, 未処理の例外が投げられたときに break するオプションを有効にしてデバッグ実行すれば, まさに例外が起きた瞬間に止めることができます.

```cs
catch (Exception ) when (!System.Diagnostics.Debugger.IsAttached)
```

どちらも限定的ではありますが面白いテクニックだと思います.

## 結語

[『Effective C++』を読んだときに感動した](https://momori-nakano.hashnode.dev/effective-c) ので, C# もいずれは読もうと思っていました. 大まかな体感としては知っていることと知らなかったことが半々くらいだったと感じました.

いくつか当たり前に思う項目もありました. 例えば C 言語スタイルのキャストより as によるキャストを使うべき, `IDisposable`は using で使う, LINQ は遅延評価されるといったことです.  
その他, LINQ についての項目に LINQ to SQL を念頭においたものがあったのですが, 個人的に LINQ to SQL はほとんど使ったことがないのでいまいちピンと来ませんでした.

純粋に知らなかったことやためになったこともありましたし, 拡張メソッドや例外についての項目など, 自分なりに考えるきっかけを与えてくれる項目もあったのが良かったと思います. 個人的に C# は書く機会がそれなりにあるので, もっと知識や経験を深めて行きたいと思います.
