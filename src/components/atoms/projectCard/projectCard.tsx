import styles from "./projectCard.module.scss";

import Tags from "@/components/molecules/tags/tags";

type Project = {
  title: string;
  url: string;
  description: string;
  tags: ReadonlyArray<string>;
};

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
  return (
    <a target="_blank" href={project.url} className={styles.root}>
      <div className={styles.text}>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
      </div>
      <Tags tags={project.tags} />
    </a>
  );
};

export default ProjectCard;
export { type Project };
