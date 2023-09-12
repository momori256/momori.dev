import styles from "./tag.module.scss";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHashtag } from "@fortawesome/free-solid-svg-icons";

const Tag: React.FC<{ tag: string }> = ({ tag }) => {
  return (
    <>
      <FontAwesomeIcon icon={faHashtag} className={styles.hash} />
      <span className={styles.tag}>{`${tag}`}</span>
    </>
  );
};

export default Tag;
