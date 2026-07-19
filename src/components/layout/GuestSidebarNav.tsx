"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

// 未ログイン時サイドバーのホーム・検索リンク。
// ログイン後サイドバーと同様に現在ページをアクティブ表示するが、
// 配色は未ログインのロゴ色（#1a6b3a）に合わせた深緑系にする。
export function GuestSidebarNav() {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "ホーム", active: pathname === "/" },
    { href: "/search", label: "検索", active: pathname.startsWith("/search") },
  ];

  return (
    <nav className="px-4 flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 px-3 py-[7px] rounded-lg text-[0.95rem] transition-colors ${
            item.active
              ? "bg-[#bbf7d0] text-[#1a6b3a] font-semibold"
              : "text-[#1e293b] hover:bg-[#f8fafc]"
          }`}
        >
          {item.href === "/" ? (
            <span className="w-6 flex justify-center text-[1.1rem] leading-none">🏠</span>
          ) : (
            <span className="w-6 flex justify-center">
              <TwemojiIcon codepoint="1f50d" alt="🔍" className="h-[1.1rem] w-[1.1rem]" />
            </span>
          )}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
