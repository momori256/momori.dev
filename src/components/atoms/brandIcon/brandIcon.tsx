import styles from "./brandIcon.module.scss";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-brands-svg-icons";

type Prop = {
  icon: IconDefinition;
  url: string;
};

const BrandIcon: React.FC<Prop> = ({ icon, url }) => {
  return (
    <a target="_blank" href={url} className={styles.root}>
      <FontAwesomeIcon icon={icon} />
    </a>
  );
};

export default BrandIcon;
export { type Prop };
