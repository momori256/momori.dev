import getHighlighter from "./shikiHilighter";

import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkToc from "remark-toc";
import remarkMath from "remark-math";
import remarkGemoji from "remark-gemoji";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";

/**
 * Convert Markdown to HTML.
 * @param md Markdown string.
 * @returns HTML string.
 */
const mdToHtml: (md: string) => Promise<string> = async (md) => {
  const result = await remark()
    .use(remarkGfm)
    .use(remarkToc, { maxDepth: 3, tight: true })
    .use(remarkMath)
    .use(remarkGemoji)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(rehypePrettyCode, { getHighlighter })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);
  return result.toString();
};

export default mdToHtml;
