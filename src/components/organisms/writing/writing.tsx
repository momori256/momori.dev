import styles from "./writing.module.scss";

import { Routes } from "@/app/layout";
import { loadAllPosts } from "@/lib/blog";
import Section from "@/components/organisms/section/section";
import PostCard from "@/components/atoms/postCard/postCard";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

const Writing: React.FC = async () => {
  const posts = (await loadAllPosts()).slice(0, 3);

  return (
    <Section title={"Writing"}>
      <>
        <p>
          This is my blog. I have written articles about my career, my life, and
          what I learned from tech books.
        </p>

        <ul>
          {posts.map((post) => (
            <li key={post.slug} className={styles.item}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>

        <p>
          <Link href={Routes.Blog}>
            View All <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </p>
      </>
    </Section>
  );
};

export default Writing;
