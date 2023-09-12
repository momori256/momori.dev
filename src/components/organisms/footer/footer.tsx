import styles from "./footer.module.scss";

export default function Footer() {
  return (
    <div className={styles.root}>
      <div className={styles.footer}>
        <p>&copy; Momori Nakano</p>
      </div>
    </div>
  );
}
