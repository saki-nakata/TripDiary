"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

/**
 * カード用のサムネイル画像。
 * 写真の縦横比が枠に近ければ cover（切り取り）で枠いっぱいに表示し、
 * 縦長・パノラマなど枠から大きく外れる写真だけ blur fill（全体表示＋同じ写真のぼかし背景）に切り替える。
 *
 * 画像の実寸はDBに保存していないため、読み込み時（onLoad）にブラウザ側で naturalWidth/Height を測って判定する。
 * 判定前の初期表示は cover（最も一般的なケース）とし、極端な写真のみ読み込み後に blur fill へ切り替わる。
 *
 * S3側で画像実体が失われている場合（実装計画書/phase8.md 指摘①）に壊れた画像枠のまま
 * 表示され続けないよう、読み込み失敗時はプレースホルダへフォールバックする。
 */
export function CardImage({
  src,
  alt,
  sizes,
  imgClassName = "",
  containerRatio = 4 / 3,
  /** 枠比率からのズレ（相対値）がこれを超えたら blur fill に切り替える */
  threshold = 0.44,
  /** 読み込み失敗時の表示。未指定時は汎用のプレースホルダアイコンを表示する */
  fallback,
}: {
  src: string;
  alt: string;
  sizes: string;
  imgClassName?: string;
  containerRatio?: number;
  threshold?: number;
  fallback?: ReactNode;
}) {
  const [fill, setFill] = useState(false);
  const [error, setError] = useState(false);
  // srcが差し替わった際（一覧の再取得で同じキーのまま参照先の画像だけ変わる場合等）に
  // 前の画像の失敗状態を引き継がないようリセットする。effectではなくレンダー中に検知することで
  // 余計な再レンダーを避ける（React公式が推奨する「propの変化に応じてstateを補正する」パターン）。
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setFill(false);
    setError(false);
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-4xl text-zinc-300 dark:text-zinc-600">
        {fallback ?? <TwemojiIcon codepoint="1f4f7" alt="" className="h-[1em] w-[1em]" />}
      </div>
    );
  }

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
        onError={() => setError(true)}
      />
    </>
  );
}
