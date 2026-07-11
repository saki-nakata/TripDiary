"use client";

import { useEffect, useCallback } from "react";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

type Props = {
  images: { url: string }[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export function ImageLightbox({ images, currentIndex, onClose, onPrev, onNext }: Props) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  const total = images.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 hover:opacity-70 transition-opacity"
        onClick={onClose}
        aria-label="閉じる"
      >
        <TwemojiIcon codepoint="274c" alt="閉じる" className="h-4 w-4" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm font-medium">
        {currentIndex + 1} / {total}
      </div>

      {/* Prev */}
      {total > 1 && (
        <button
          className="absolute left-4 text-white text-4xl leading-none hover:opacity-70 transition-opacity px-2"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="前の画像"
        >
          ‹
        </button>
      )}

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[currentIndex].url}
        alt={`画像 ${currentIndex + 1}`}
        className="max-w-[90vw] max-h-[90vh] object-contain select-none"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {total > 1 && (
        <button
          className="absolute right-4 text-white text-4xl leading-none hover:opacity-70 transition-opacity px-2"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="次の画像"
        >
          ›
        </button>
      )}
    </div>
  );
}
