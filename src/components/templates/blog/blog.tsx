import styles from "./blog.module.scss";

import { type Post } from "@/lib/post";
import PostCard from "@/components/atoms/postCard/postCard";

const Blog: React.FC<{ posts: ReadonlyArray<Post> }> = async ({ posts }) => {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1>Blog</h1>
      </header>

      <main className={styles.main}>
        <ul>
          {posts.map((post) => {
            return (
              <li key={post.slug}>
                <PostCard post={post} />
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
};

export default Blog;
