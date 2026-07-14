"use client";

import { useState } from "react";
import Image from "next/image";
import type { PostImage } from "@/types/post";
import { ImageLightbox } from "./ImageLightbox";

type Props = {
  images: PostImage[];
  title: string;
};

export function ImageCarousel({ images, title }: Props) {
  const [current, setCurrent] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);
  const next = () => setCurrent((c) => (c + 1) % images.length);

  return (
    <>
      <div className="relative rounded-xl overflow-hidden bg-zinc-100">
        <div className="relative h-72 md:h-[28rem]">
          <Image
            src={images[current].url}
            alt={title}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-contain cursor-pointer"
            onClick={() => setLightboxIndex(current)}
            priority={current === 0}
          />
        </div>
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/45 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-black/65"
            >
              ‹
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/45 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-black/65"
            >
              ›
            </button>
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === current ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto overflow-y-hidden pb-0.5">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setCurrent(i)}
              className={`relative flex-none w-[72px] h-[72px] rounded-md overflow-hidden border-2 transition-colors ${
                i === current ? "border-green-500" : "border-transparent opacity-85 hover:opacity-100"
              }`}
            >
              <Image src={img.url} alt="" fill sizes="72px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => (i! - 1 + images.length) % images.length)}
          onNext={() => setLightboxIndex((i) => (i! + 1) % images.length)}
        />
      )}
    </>
  );
}
