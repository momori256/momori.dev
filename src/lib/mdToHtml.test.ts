import { describe, expect, test } from "vitest";

import mdToHtml from "./mdToHtml";

describe("mdToHtml", () => {
  test("empty", async () => {
    const result = await mdToHtml("");
    expect(result).toBe("");
  });

  test("gfm", async () => {
    const input =
      "http://example.com\n" +
      "| foo | bar |\n" +
      "| --- | --- |\n" +
      "| baz | bim |\n";

    const expected =
      '<p><a href="http://example.com">http://example.com</a></p>\n' +
      "<table>\n" +
      "<thead>\n" +
      "<tr>\n" +
      "<th>foo</th>\n" +
      "<th>bar</th>\n" +
      "</tr>\n" +
      "</thead>\n" +
      "<tbody>\n" +
      "<tr>\n" +
      "<td>baz</td>\n" +
      "<td>bim</td>\n" +
      "</tr>\n" +
      "</tbody>\n" +
      "</table>";

    const result = await mdToHtml(input);
    expect(result).toBe(expected);
  });

  test("slug & autolink-headings", async () => {
    const input = "# Header1\n" + "## Header😀👺2\n" + "### 日本語🤖\n";

    const expected =
      '<h1 id="header1"><a href="#header1">Header1</a></h1>\n' +
      '<h2 id="header2"><a href="#header2">Header😀👺2</a></h2>\n' +
      '<h3 id="日本語"><a href="#日本語">日本語🤖</a></h3>';

    const result = await mdToHtml(input);
    expect(result).toBe(expected);
  });

  test("toc", async () => {
    const input =
      "# Header1\n" +
      "## Table of Contents\n" +
      "## Header😀👺2\n" +
      "### 日本語🤖\n" +
      "## Header3\n";

    const expected =
      '<h1 id="header1"><a aria-hidden="true" tabindex="-1" href="#header1"><span class="icon icon-link"></span></a>Header1</h1>\n' +
      '<h2 id="table-of-contents"><a aria-hidden="true" tabindex="-1" href="#table-of-contents"><span class="icon icon-link"></span></a>Table of Contents</h2>\n' +
      "<ul>\n" +
      '<li><a href="#header2">Header😀👺2</a></li>\n' +
      '<li><a href="#header3">Header3</a></li>\n' +
      "</ul>\n" +
      '<h2 id="header2"><a aria-hidden="true" tabindex="-1" href="#header2"><span class="icon icon-link"></span></a>Header😀👺2</h2>\n' +
      '<h3 id="日本語"><a aria-hidden="true" tabindex="-1" href="#日本語"><span class="icon icon-link"></span></a>日本語🤖</h3>\n' +
      '<h2 id="header3"><a aria-hidden="true" tabindex="-1" href="#header3"><span class="icon icon-link"></span></a>Header3</h2>';

    const result = await mdToHtml(expected);
    expect(result).toBe("");
  });

  test("gemoji", async () => {
    const input = ":v: :+1: :dog:";

    const expected = "<p>✌️ 👍 🐶</p>";

    const result = await mdToHtml(input);
    expect(result).toBe(expected);
  });

  test("math & katex", async () => {
    const input =
      "$$\n" + "f(x)=sum^{infty}_{k=0}f^{(k)}(0)\\frac{x^k}{k!}\n" + "$$";

    const expected =
      '<div class="math math-display"><span class="katex-display"><span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><semantics><mrow><mi>f</mi><mo stretchy="false">(</mo><mi>x</mi><mo stretchy="false">)</mo><mo>=</mo><mi>s</mi><mi>u</mi><msubsup><mi>m</mi><mrow><mi>k</mi><mo>=</mo><mn>0</mn></mrow><mrow><mi>i</mi><mi>n</mi><mi>f</mi><mi>t</mi><mi>y</mi></mrow></msubsup><msup><mi>f</mi><mrow><mo stretchy="false">(</mo><mi>k</mi><mo stretchy="false">)</mo></mrow></msup><mo stretchy="false">(</mo><mn>0</mn><mo stretchy="false">)</mo><mfrac><msup><mi>x</mi><mi>k</mi></msup><mrow><mi>k</mi><mo stretchy="false">!</mo></mrow></mfrac></mrow><annotation encoding="application/x-tex">f(x)=sum^{infty}_{k=0}f^{(k)}(0)\\frac{x^k}{k!}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:1em;vertical-align:-0.25em;"></span><span class="mord mathnormal" style="margin-right:0.10764em;">f</span><span class="mopen">(</span><span class="mord mathnormal">x</span><span class="mclose">)</span><span class="mspace" style="margin-right:0.2778em;"></span><span class="mrel">=</span><span class="mspace" style="margin-right:0.2778em;"></span></span><span class="base"><span class="strut" style="height:2.2121em;vertical-align:-0.686em;"></span><span class="mord mathnormal">s</span><span class="mord mathnormal">u</span><span class="mord"><span class="mord mathnormal">m</span><span class="msupsub"><span class="vlist-t vlist-t2"><span class="vlist-r"><span class="vlist" style="height:0.967em;"><span style="top:-2.3987em;margin-left:0em;margin-right:0.05em;"><span class="pstrut" style="height:2.7em;"></span><span class="sizing reset-size6 size3 mtight"><span class="mord mtight"><span class="mord mathnormal mtight" style="margin-right:0.03148em;">k</span><span class="mrel mtight">=</span><span class="mord mtight">0</span></span></span></span><span style="top:-3.1809em;margin-right:0.05em;"><span class="pstrut" style="height:2.7em;"></span><span class="sizing reset-size6 size3 mtight"><span class="mord mtight"><span class="mord mathnormal mtight">in</span><span class="mord mathnormal mtight" style="margin-right:0.10764em;">f</span><span class="mord mathnormal mtight">t</span><span class="mord mathnormal mtight" style="margin-right:0.03588em;">y</span></span></span></span></span><span class="vlist-s">​</span></span><span class="vlist-r"><span class="vlist" style="height:0.3013em;"><span></span></span></span></span></span></span><span class="mord"><span class="mord mathnormal" style="margin-right:0.10764em;">f</span><span class="msupsub"><span class="vlist-t"><span class="vlist-r"><span class="vlist" style="height:0.938em;"><span style="top:-3.113em;margin-right:0.05em;"><span class="pstrut" style="height:2.7em;"></span><span class="sizing reset-size6 size3 mtight"><span class="mord mtight"><span class="mopen mtight">(</span><span class="mord mathnormal mtight" style="margin-right:0.03148em;">k</span><span class="mclose mtight">)</span></span></span></span></span></span></span></span></span><span class="mopen">(</span><span class="mord">0</span><span class="mclose">)</span><span class="mord"><span class="mopen nulldelimiter"></span><span class="mfrac"><span class="vlist-t vlist-t2"><span class="vlist-r"><span class="vlist" style="height:1.5261em;"><span style="top:-2.314em;"><span class="pstrut" style="height:3em;"></span><span class="mord"><span class="mord mathnormal" style="margin-right:0.03148em;">k</span><span class="mclose">!</span></span></span><span style="top:-3.23em;"><span class="pstrut" style="height:3em;"></span><span class="frac-line" style="border-bottom-width:0.04em;"></span></span><span style="top:-3.677em;"><span class="pstrut" style="height:3em;"></span><span class="mord"><span class="mord"><span class="mord mathnormal">x</span><span class="msupsub"><span class="vlist-t"><span class="vlist-r"><span class="vlist" style="height:0.8491em;"><span style="top:-3.063em;margin-right:0.05em;"><span class="pstrut" style="height:2.7em;"></span><span class="sizing reset-size6 size3 mtight"><span class="mord mathnormal mtight" style="margin-right:0.03148em;">k</span></span></span></span></span></span></span></span></span></span></span><span class="vlist-s">​</span></span><span class="vlist-r"><span class="vlist" style="height:0.686em;"><span></span></span></span></span></span><span class="mclose nulldelimiter"></span></span></span></span></span></span></div>';

    const result = await mdToHtml(input);
    expect(result).toBe(expected);
  });

  test("prettyCode", async () => {
    const input =
      "```js\n" +
      "const x = 3;\n" +
      "const y = 1.4;\n" +
      "console.log(x + y);\n" +
      "```";

    const expected =
      '<div data-rehype-pretty-code-fragment=""><pre style="background-color: #22272e" tabindex="0" data-language="js" data-theme="default"><code data-language="js" data-theme="default" style="display: grid;"><span data-line=""><span style="color: #F47067">const</span><span style="color: #ADBAC7"> </span><span style="color: #6CB6FF">x</span><span style="color: #ADBAC7"> </span><span style="color: #F47067">=</span><span style="color: #ADBAC7"> </span><span style="color: #6CB6FF">3</span><span style="color: #ADBAC7">;</span></span>\n' +
      '<span data-line=""><span style="color: #F47067">const</span><span style="color: #ADBAC7"> </span><span style="color: #6CB6FF">y</span><span style="color: #ADBAC7"> </span><span style="color: #F47067">=</span><span style="color: #ADBAC7"> </span><span style="color: #6CB6FF">1.4</span><span style="color: #ADBAC7">;</span></span>\n' +
      '<span data-line=""><span style="color: #ADBAC7">console.</span><span style="color: #DCBDFB">log</span><span style="color: #ADBAC7">(x </span><span style="color: #F47067">+</span><span style="color: #ADBAC7"> y);</span></span></code></pre></div>';

    const result = await mdToHtml(input);
    expect(result).toBe(expected);
  });
});
