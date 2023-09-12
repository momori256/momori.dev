import styles from "./header.module.scss";

import { type Prop } from "@/components/atoms/brandIcon/brandIcon";
import BrandIcons from "@/components/molecules/brandIcons/brandIcons";

import { faLinkedin, faGithub } from "@fortawesome/free-brands-svg-icons";
import Link from "next/link";
import Image from "next/image";

const Header: React.FC = () => {
  const icons: Prop[] = [
    {
      icon: faLinkedin,
      url: "https://www.linkedin.com/in/momori-nakano/",
    },
    {
      icon: faGithub,
      url: "https://github.com/momori256",
    },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.flex}>
        <div>
          <h1>
            <Link href="/">Momori Nakano</Link>
          </h1>
          <p>
            Software Engineer
            <br />
            Based in Vancouver, Canada
          </p>
        </div>
        <Image
          className={styles.profile}
          src="/profile_circle_150x150.png"
          width={150}
          height={150}
          alt="profile"
          priority
        />
      </div>

      <div className={styles.icons}>
        <BrandIcons icons={icons} />
      </div>
    </div>
  );
};

export default Header;
