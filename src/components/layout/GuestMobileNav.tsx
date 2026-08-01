"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { ThemeMenuButton } from "@/components/ui/ThemeMenuButton";
import { Logo } from "@/components/ui/Logo";

// 未ログイン時のモバイルナビ（上部バーのロゴ＝ホーム、下部の検索）。
// ログイン後と同様に、現在ページはライム背景（bg-lime-100 dark:bg-[#16a34a]/20）でアクティブ表示する。
export function GuestMobileNav() {
  const pathname = usePathname();
  const homeActive = pathname === "/";
  const searchActive = pathname.startsWith("/search");

  return (
    <>
      {/* Top bar: ロゴ・ホーム */}
      <nav className="md:hidden fixed top-0 left-0 right-0 h-14 bg-surface border-b border-surface-border z-30 flex items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-bold rounded-lg px-2 py-1 -ml-1"
        >
          <TwemojiIcon codepoint="2708" alt="✈️" className="h-5 w-5" />
          <Logo variant="guest" className="text-[1.05rem]" />
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            href="/"
            title="ホーム"
            aria-label="ホーム"
            className={`flex items-center justify-center h-9 w-9 rounded-full transition-colors ${
              homeActive ? "bg-lime-100 dark:bg-[#16a34a]/20" : "text-[#64748b] dark:text-zinc-400"
            }`}
          >
            <span className="text-lg leading-none">🏠</span>
          </Link>
          <ThemeMenuButton />
        </div>
      </nav>

      {/* Bottom nav: ホームは上部バーのロゴがリンクを兼ねるため省略 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-border z-30 flex">
        <Link href="/search" className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs text-[#64748b] dark:text-zinc-400">
          <span
            className={`flex items-center justify-center h-8 w-8 rounded-full transition-colors ${
              searchActive ? "bg-lime-100 dark:bg-[#16a34a]/20" : ""
            }`}
          >
            <TwemojiIcon codepoint="1f50d" alt="🔍" className="h-5 w-5" />
          </span>
          <span>検索</span>
        </Link>
        <Link href="/login" className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs text-[#64748b] dark:text-zinc-400">
          <span className="text-xl leading-5">🔑</span>
          <span>ログイン</span>
        </Link>
        <Link href="/signup" className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs text-[#64748b] dark:text-zinc-400">
          <span className="text-xl leading-5">🌱</span>
          <span>新規登録</span>
        </Link>
      </nav>
    </>
  );
}
