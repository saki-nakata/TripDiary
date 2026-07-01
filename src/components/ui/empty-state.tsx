"use client";

import Link from "next/link";

type Props = {
  emoji: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function EmptyState({ emoji, message, ctaLabel, ctaHref }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <span className="text-5xl">{emoji}</span>
      <p className="text-[#64748b] text-sm">{message}</p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-2 px-5 py-2.5 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
