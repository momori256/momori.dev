import styles from "./historyCard.module.scss";

import Tags from "@/components/molecules/tags/tags";

type Prop = {
  peirod: string;
  title: string;
  titleUrl: string;
  tags: ReadonlyArray<string>;
  children: React.ReactNode;
};

const HistoryCard: React.FC<Prop> = ({
  peirod,
  title,
  titleUrl,
  tags,
  children,
}) => {
  return (
    <div className={styles.root}>
      <p className={styles.period}>{peirod}</p>
      <div className={styles.desc}>
        <h3>
          <a target="_blank" className={styles.title} href={titleUrl}>
            {title}
          </a>
        </h3>

        {children}

        <Tags tags={tags} />
      </div>
    </div>
  );
};

export default HistoryCard;
