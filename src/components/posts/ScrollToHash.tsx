"use client";

import { useEffect } from "react";

// 画像の読み込み等でページ下部の高さが確定した後にもう一度スクロールし直し、
// URLのハッシュ（例: #comments）で指定した要素が画面上部付近に来るようにする
export function ScrollToHash() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;

    const scroll = () => el.scrollIntoView({ behavior: "smooth", block: "start" });
    scroll();
    const timer = setTimeout(scroll, 300);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
