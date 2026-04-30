import NextLink from "next/link";

import { isApplePassEnabled, isGoogleWalletEnabled } from "@/lib/wallet-features";
import styles from "./page.module.css";

export default function HomePage() {
  const applePassEnabled = isApplePassEnabled();
  const googleWalletEnabled = isGoogleWalletEnabled();

  return (
    <div className={styles.shell}>
      <div className={styles.beans} aria-hidden="true" />
      <main className={styles.card}>
        <h1 className={styles.heading}>Wallet Pass</h1>
        <div className={styles.actions}>
          {applePassEnabled ? (
            <a href="/api/get-pass" download className={styles.appleLink}>
              <img src="/add-to-apple-wallet.svg" alt="Add to Apple Wallet" className={styles.appleBadge} />
            </a>
          ) : null}
          {googleWalletEnabled ? (
            <a href="/api/get-google-pass" className={styles.googleLink}>
              <img src="/add-to-google-wallet.svg" alt="Add to Google Wallet" className={styles.googleBadge} />
            </a>
          ) : null}
        </div>
        <div className={styles.footer}>
          <p>
            Admin console:{" "}
            <NextLink href="/admin" className={styles.adminLink}>
              /admin
            </NextLink>
          </p>
        </div>
      </main>
    </div>
  );
}
