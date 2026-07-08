"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
};

// カードのタイトルが2行になる場合、そのカードだけ少し文字サイズを縮める。
// タイトル領域の高さは常に2行分を確保しておくことで、同じ行に並ぶ他のカードとも
// byline以下の縦位置が揃うようにする。
export function PostCardTitle({ title }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [small, setSmall] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const singleLineHeight = parseFloat(getComputedStyle(el).lineHeight);
    if (el.scrollHeight > singleLineHeight * 1.5) setSmall(true);
  }, [title]);

  return (
    <div className="min-h-[2.35rem]">
      <h3
        ref={ref}
        className={`font-bold text-zinc-900 line-clamp-2 leading-snug ${
          small ? "text-[0.85rem]" : "text-[0.95rem]"
        }`}
      >
        {title}
      </h3>
    </div>
  );
}
