import styles from "./brandIcons.module.scss";

import BrandIcon, {
  type Prop,
} from "@/components/atoms/brandIcon/brandIcon";

const BrandIcons: React.FC<{ icons: ReadonlyArray<Prop> }> = ({ icons }) => {
  return (
    <ul className={styles.root}>
      {icons.map(({ icon, url }) => (
        <li key={url}>
          <BrandIcon icon={icon} url={url} />
        </li>
      ))}
    </ul>
  );
};

export default BrandIcons;
