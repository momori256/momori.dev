import fs from "fs";
import path from "path";
import { Options } from "rehype-pretty-code";
import shiki from "shiki";

const getShikiPath = (): string => {
  return path.join(process.cwd(), "src/lib/shiki");
};

const touched = { current: false };

const touchShikiPath = (): void => {
  if (touched.current) {
    return;
  }
  fs.readdirSync(getShikiPath());
  touched.current = true;
};

const getHighlighter: Options["getHighlighter"] = async (options) => {
  touchShikiPath();

  return await shiki.getHighlighter({
    ...(options as any),
    paths: {
      languages: `${getShikiPath()}/languages/`,
      themes: `${getShikiPath()}/themes/`,
    },
  });
};

export default getHighlighter;
