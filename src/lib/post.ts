import fs from "fs";
import path from "path";

import matter from "gray-matter";
import { parseISO, format } from "date-fns";

import mdToHtml from "./mdToHtml";

type Meta = {
  title: string;
  date: Date;
  tags: ReadonlyArray<string>;
  imagePath: string;
  photoBy: {
    name: string;
    url: string;
  };
  photoOn: {
    name: string;
    url: string;
  };
};

type Post = {
  slug: string;
  html: string;
  meta: Meta;
}

/**
 * Load all markdown files in blog directory and create Post.
 * @param dir a path of directory to search for files.
 * @param ext an extension to search.
 * @returns all loaded posts.
 */
const loadAllPosts: (dir: string, ext: string) => Promise<Post[]> = async (
  dir,
  ext
) => {
  const posts = Promise.all(
    fs
      .readdirSync(dir)
      .filter((fileName) => fileName.endsWith(ext))
      .map((fileName) => loadPost(path.join(dir, fileName)))
  );

  return (await posts).sort((a, b) => {
    if (a.meta.date < b.meta.date) {
      return 1;
    }
    if (a.meta.date > b.meta.date) {
      return -1;
    }
    return 0;
  });
};

/**
 * Load a markdown file and create a Post.
 * @param filePath a full path of a post file to read.
 * @returns a loaded Post.
 */
const loadPost: (filePath: string) => Promise<Post> = async (
  filePath: string
) => {
  const mattered = matter(fs.readFileSync(filePath, "utf8"));
  const meta = dataToMeta(mattered.data);

  return {
    slug: filePathToSlug(filePath),
    html: await mdToHtml(mattered.content),
    meta,
  };
};

/**
 * Convert a file path to a slug.
 * @param filePath file path of Markdown file.
 * @returns slug.
 */
const filePathToSlug: (filePath: string) => string = (filePath) => {
  return path.parse(filePath).name;
};

/**
 * Convert date to Meta.
 * @param data date provided by matter.
 * @returns Meta.
 */
const dataToMeta: (data: { [key: string]: any }) => Meta = (data) => {
  return {
    title: data.title,
    date: parseISO(data.date),
    tags: formatTags(data.tags.split(",")),
    imagePath: data.imagePath,
    photoBy: {
      name: data.photoByName,
      url: data.photoByUrl,
    },
    photoOn: {
      name: data.photoOnName,
      url: data.photoOnUrl,
    },
  };
};

const formatDate: (date: Date) => string = (date) => {
  return format(date, "LLL. d, yyyy");
};

const formatTags: (tags: ReadonlyArray<string>) => ReadonlyArray<string> = (
  tags
) => {
  return Array.from(
    new Set(tags.map((tag: string) => tag.trim().toLocaleLowerCase()).sort())
  );
};

export {
  type Post,
  type Meta,
  loadPost,
  loadAllPosts,
  filePathToSlug,
  dataToMeta,
  formatDate,
  formatTags,
};
