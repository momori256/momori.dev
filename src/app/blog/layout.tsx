import styles from "./layout.module.scss"

import GlobalNavigation from "@/components/molecules/globalNavigation/globalNavigation";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav className={styles.nav}>
        <GlobalNavigation />
      </nav>
      {children}
    </>
  );
}
