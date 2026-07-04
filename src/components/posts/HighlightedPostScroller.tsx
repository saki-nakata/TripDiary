"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./PostCard.module.css";

export function HighlightedPostScroller() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const highlighted = searchParams.get("highlighted");

  useEffect(() => {
    if (!highlighted) return;

    const matches = document.querySelectorAll<HTMLElement>(
      `[data-post-id="${highlighted}"]`
    );
    const el = matches[matches.length - 1];
    if (!el) {
      router.replace("/", { scroll: false });
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add(styles.highlighted);
    const timer = setTimeout(() => {
      el.classList.remove(styles.highlighted);
      router.replace("/", { scroll: false });
    }, 2000);
    return () => clearTimeout(timer);
  }, [highlighted, router]);

  return null;
}
