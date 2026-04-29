import NextLink from "next/link";

import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <div className={styles.shell}>
      <main className={styles.card}>
        <p className={styles.code}>404</p>
        <h1 className={styles.heading}>Page not found</h1>
        <p className={styles.message}>The page you’re looking for doesn’t exist or has moved.</p>
        <div className={styles.actions}>
          <NextLink href="/" className={styles.link}>
            Home
          </NextLink>
          <NextLink href="/admin" className={styles.link}>
            Admin console
          </NextLink>
        </div>
      </main>
    </div>
  );
}
