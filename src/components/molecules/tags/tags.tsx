import styles from "./tags.module.scss";

import { formatTags } from "@/lib/post";
import Tag from "@/components/atoms/tag/tag";

const Tags: React.FC<{ tags: ReadonlyArray<string> }> = ({ tags }) => {
  return (
    <ul className={styles.root}>
      {formatTags(tags).map((tag) => (
        <li key={tag}>
          <Tag tag={tag} />
        </li>
      ))}
    </ul>
  );
};

export default Tags;
