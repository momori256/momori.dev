import path from "path";

import { type Post, loadPost as pLoadPost, loadAllPosts as pLoadAllPost } from "./post";

const blogDir = path.join(process.cwd(), "blog");
const extension = ".md";

/**
 * Load all markdown files in blog directory and create Post.
 * @returns all loaded posts.
 */
const loadAllPosts = async () => {
  return pLoadAllPost(blogDir, extension);
};

const loadPost: (slug: string) => Promise<Post> = async (slug) => {
  const filePath = path.join(blogDir, `${slug}${extension}`);
  return await pLoadPost(filePath);
};

export { loadAllPosts, loadPost };
