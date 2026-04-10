"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteNav.module.css";

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.wrap} aria-label="站内导航">
      <div className={styles.inner}>
        <span className={styles.brand}>For 秋玲</span>
        <div className={styles.links}>
          <Link
            href="/"
            className={`${styles.link} ${pathname === "/" ? styles.linkActive : ""}`}
          >
            <span className={styles.icon} aria-hidden>
              ✉
            </span>
            信笺
          </Link>
          <Link
            href="/chat"
            className={`${styles.link} ${pathname === "/chat" ? styles.linkActive : ""}`}
          >
            <span className={styles.icon} aria-hidden>
              ◎
            </span>
            对话
          </Link>
        </div>
      </div>
    </nav>
  );
}
