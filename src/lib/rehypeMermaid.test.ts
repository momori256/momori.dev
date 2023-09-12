import { describe, expect, test } from "vitest";

import rehypeMermaid from "./rehypeMermaid";

import { remark } from "remark";
import remarkRehype from "remark-rehype/lib";
import rehypeStringify from "rehype-stringify";

describe("rehypeMermaid", () => {
  test("", async () => {
    const md =
      "# Mermaid with custom title/desc\n" +
      "```mermaid\n" +
      "graph LR\n" +
      "    A[Square Rect] -- Link text --> B((Circle))\n" +
      "    A --> C(Round Rect)\n" +
      "    B --> D{Rhombus}\n" +
      "    C --> D\n" +
      "```";

    const result = await remark()
      .use(remarkRehype)
      .use(rehypeMermaid)
      .use(rehypeStringify)
      .process(md);

    const expected =
      "<h1>Mermaid with custom title/desc</h1>\n" +
      '<pre class="mermaid">%%{init: {"theme":"dark"}}%%\n' +
      "graph LR\n" +
      "    A[Square Rect] -- Link text --> B((Circle))\n" +
      "    A --> C(Round Rect)\n" +
      "    B --> D{Rhombus}\n" +
      "    C --> D\n" +
      "</pre>";

    expect(result.toString()).toBe(expected);
  });
});
