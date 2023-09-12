import styles from "./globalNavigation.module.scss";

import { siteName, Routes } from "@/app/layout";
import LabelIcon from "@/components/atoms/labelIcon/labelIcon";

import { faHouse, faPenNib } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

const GlobalNavigation: React.FC = () => {
  return (
    <div className={styles.root}>
      <Link className={styles.site} href={Routes.Home}>
        {siteName}
      </Link>
      <ul className={styles.icons}>
        <li>
          <LabelIcon icon={faHouse} label="Home" href={Routes.Home} />
        </li>
        <li>
          <LabelIcon icon={faPenNib} label="Blog" href={Routes.Blog} />
        </li>
      </ul>
    </div>
  );
};

export default GlobalNavigation;
