import styles from "./postCard.module.scss";

import { Routes } from "@/app/layout";
import { type Post, formatDate } from "@/lib/post";
import Tags from "@/components/molecules/tags/tags";

import Link from "next/link";
import Image from "next/image";

const PostCard: React.FC<{ post: Post }> = ({ post }) => {
  return (
    <Link href={`${Routes.Blog}/${post.slug}`} className={styles.root}>
      <div className={styles.container}>
        <Image
          className={styles.image}
          src={post.meta.imagePath}
          width={300}
          height={200}
          alt="image"
          quality={20}
        ></Image>
      </div>
      <div className={styles.text}>
        <div>
          <h3>{post.meta.title}</h3>
          <p>{formatDate(post.meta.date)}</p>
        </div>
        <Tags tags={post.meta.tags} />
      </div>
    </Link>
  );
};

export default PostCard;
