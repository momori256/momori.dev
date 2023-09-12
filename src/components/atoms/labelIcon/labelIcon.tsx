import styles from "./labelIcon.module.scss";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";

type Prop = {
  icon: IconDefinition;
  label: string;
  href: string;
};

const LabelIcon: React.FC<Prop> = ({ icon, label, href }) => {
  return (
    <Link className={styles.root} href={href}>
      <div>
        <FontAwesomeIcon icon={icon} className={styles.faicon} />
        <p>{label}</p>
      </div>
    </Link>
  );
};

export default LabelIcon;
export { type Prop };
