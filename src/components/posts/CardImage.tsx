"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * カード用のサムネイル画像。
 * 写真の縦横比が枠に近ければ cover（切り取り）で枠いっぱいに表示し、
 * 縦長・パノラマなど枠から大きく外れる写真だけ blur fill（全体表示＋同じ写真のぼかし背景）に切り替える。
 *
 * 画像の実寸はDBに保存していないため、読み込み時（onLoad）にブラウザ側で naturalWidth/Height を測って判定する。
 * 判定前の初期表示は cover（最も一般的なケース）とし、極端な写真のみ読み込み後に blur fill へ切り替わる。
 */
export function CardImage({
  src,
  alt,
  sizes,
  imgClassName = "",
  containerRatio = 4 / 3,
  /** 枠比率からのズレ（相対値）がこれを超えたら blur fill に切り替える */
  threshold = 0.44,
}: {
  src: string;
  alt: string;
  sizes: string;
  imgClassName?: string;
  containerRatio?: number;
  threshold?: number;
}) {
  const [fill, setFill] = useState(false);

  return (
    <>
      {fill && (
        <Image
          src={src}
          alt=""
          aria-hidden
          fill
          sizes={sizes}
          className="object-cover scale-110 blur-xs opacity-10"
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={`${fill ? "object-contain" : "object-cover"} ${imgClassName}`}
        onLoad={(e) => {
          const el = e.currentTarget;
          if (!el.naturalWidth || !el.naturalHeight) return;
          const ratio = el.naturalWidth / el.naturalHeight;
          const diff = Math.abs(ratio - containerRatio) / containerRatio;
          setFill(diff > threshold);
        }}
      />
    </>
  );
}
