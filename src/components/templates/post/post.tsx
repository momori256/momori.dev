import styles from "./post.module.scss";

import { type Post, formatDate } from "@/lib/post";
import Tags from "@/components/molecules/tags/tags";

import Image from "next/image";
import Script from "next/script";

const Post: React.FC<{ post: Post }> = ({ post }) => {
  return (
    <div className={styles.root}>
      <div className={styles.cover}>
        <Image
          className={styles.image}
          src={post.meta.imagePath}
          width={960}
          height={400}
          alt="cover image"
          priority={true}
        />

        <p className={styles.credit}>
          Photo by{" "}
          <a target="_blank" href={post.meta.photoBy.url}>
            {post.meta.photoBy.name}
          </a>{" "}
          on{" "}
          <a target="_blank" href={post.meta.photoOn.url}>
            {post.meta.photoOn.name}
          </a>
        </p>
      </div>

      <main className={styles.main}>
        <div className={styles.info}>
          <time>{formatDate(post.meta.date)}</time>
          <Tags tags={post.meta.tags} />
        </div>

        <div
          className={styles.article}
          dangerouslySetInnerHTML={{ __html: post.html }}
        ></div>
      </main>
    </div>
  );
};

export default Post;
