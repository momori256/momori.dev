import { visit } from "unist-util-visit";
import { type Root, type Element, type Text } from "hast";
import { type Node } from "unist";
import { type Data } from "vfile";

const typeElement = "element";
const typeCode = "code";

const extractMermaid: (pre: Element) => string = (pre) => {
  const texts = pre.children
    .filter((child) => {
      if (child.type !== typeElement) {
        return false;
      }

      const e = child as Element;
      if (e.tagName !== typeCode) {
        return false;
      }

      const className = e.properties?.className;
      if (typeof className === "undefined") {
        return false;
      }
      return (className as string[]).includes("language-mermaid");
    })
    .map((child) => {
      const text = (child as Element).children[0] as Text;
      return text.value;
    });

  return texts.length > 0 ? texts[0] : "";
};

/**
 * Process hast for Mermaid.js.
 */
export default function rehypeMermaid(): (tree: Root) => undefined {
  return (tree: Node<Data>) => {
    visit(tree, typeElement, (node: Element) => {
      if (node.tagName !== "pre") {
        return;
      }

      const mermaid = extractMermaid(node);
      if (mermaid === "") {
        return;
      }

      if (node.properties) {
        // assume className is empty.
        node.properties["className"] = "mermaid";
      }

      const theme = '%%{init: {"theme":"dark"}}%%';
      node.children.splice(0, 1, {
        type: "text",
        value: `${theme}\n${mermaid}`,
      });
    });
  };
}
