"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch("/api/notifications/unread-count");
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

function useUnreadCount() {
  const { data } = useQuery({
    queryKey: ["unread-count"],
    queryFn: fetchUnreadCount,
    staleTime: 60_000,
    refetchInterval: 180_000,
  });

  return { count: data ?? 0 };
}

type User = {
  id: string;
  nickname: string;
  email: string;
};

type NavLink = { href: string; icon: string; label: string; key: string; disabled?: boolean };
type NavItem = { divider: true } | NavLink;


const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: "1f3e0", label: "ホーム", key: "dashboard" },
  { href: "/search", icon: "1f50d", label: "検索", key: "search" },
  { divider: true },
  { href: "/posts/new", icon: "1f4dd", label: "新規投稿", key: "posts-new" },
  { href: "/users/[id]", icon: "1f464", label: "プロフィール", key: "profile" },
  { divider: true },
  { href: "/mypage?tab=plans", icon: "1f9ed", label: "旅行プラン", key: "plans" },
  { href: "/mypage?tab=myposts", icon: "1f4da", label: "自分の投稿", key: "myposts" },
  { href: "/mypage?tab=report", icon: "1f4cb", label: "旅行レポート", key: "report" },
  { href: "/mypage?tab=wishlist", icon: "1f516", label: "行きたい", key: "wishlist" },
  { href: "/mypage?tab=visited", icon: "1f6a9", label: "訪問済み", key: "visited" },
  { href: "/mypage?tab=follow-feed", icon: "1f465", label: "フォロー中の投稿", key: "follow-feed" },
];

// モバイルのボトムナビは画面が狭くラベル込みでは全項目を収められないため、
// NAV_ITEMS のうち「ホーム・検索」（上部バーへ移動）を除いた残りをアイコンのみで並べる
const MOBILE_BOTTOM_KEYS = ["posts-new", "profile", "plans", "myposts", "report", "wishlist", "visited", "follow-feed"];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const { count: unreadCount } = useUnreadCount();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(e.target as Node)) {
        setMobileDropdownOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const profileHref = `/users/${user.id}`;

  function resolveHref(item: NavLink) {
    return item.key === "profile" ? profileHref : item.href;
  }

  function isActive(item: NavLink) {
    const href = resolveHref(item);
    if (href === "/") return pathname === "/";

    const [path, query] = href.split("?");
    if (!pathname.startsWith(path)) return false;

    const itemTab = new URLSearchParams(query).get("tab");
    if (itemTab === null) return true;
    return (searchParams.get("tab") ?? "myposts") === itemTab;
  }

  return (
    <>
      {/* Sidebar (desktop / tablet) */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full bg-white border-r border-[#e2e8f0] z-30
        w-16 sidebar:w-60 transition-all overflow-y-auto">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 px-3 sidebar:px-5 pt-6 mb-5 text-[#1e8449] font-bold hover:opacity-80 transition-opacity shrink-0 justify-start"
        >
          <TwemojiIcon codepoint="2708" className="h-6 w-6 shrink-0" />
          <span className="hidden sidebar:inline text-[1.35rem]">TripDiary</span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-2 sidebar:px-5 flex flex-col gap-[4px]">
          {NAV_ITEMS.map((item, i) => {
            if ("divider" in item) {
              return <div key={i} className="border-t border-[#e2e8f0] my-2" />;
            }
            if (item.disabled) {
              return (
                <span
                  key={item.key}
                  title="Phase 4 実装後に有効化"
                  className="flex items-center gap-3 px-3 py-[7px] rounded-lg text-[0.95rem] text-zinc-300 cursor-not-allowed justify-start"
                >
                  <TwemojiIcon codepoint={item.icon} className="h-[1.1rem] w-6 shrink-0" />
                  <span className="hidden sidebar:block">{item.label}</span>
                </span>
              );
            }
            const href = resolveHref(item);
            const active = isActive(item);
            return (
              <Link
                key={item.key}
                href={href}
                title={item.label}
                className={`flex items-center gap-3 px-3 py-[7px] rounded-lg text-[0.95rem] transition-colors justify-start
                  ${active
                    ? "bg-[#dcfce7] text-[#16a34a] font-semibold"
                    : "text-[#1e293b] hover:bg-[#f8fafc]"
                  }`}
              >
                {item.key === "dashboard" ? (
                  <span className="w-6 shrink-0 text-center text-[1.1rem]">🏠</span>
                ) : (
                  <TwemojiIcon codepoint={item.icon} className="h-[1.1rem] w-6 shrink-0" />
                )}
                <span className="hidden sidebar:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section — プロトタイプ準拠: divider → 通知 → ユーザー */}
        <div className="px-2 sidebar:px-5 mt-auto pb-6">
          <div className="border-t border-[#e2e8f0] my-2" />
          {/* Notification */}
          <Link
            href="/notification"
            title="通知"
            className={`flex items-center gap-3 px-3 py-[7px] rounded-lg text-[0.95rem] transition-colors justify-start
              ${pathname === "/notification"
                ? "bg-[#dcfce7] text-[#16a34a] font-semibold"
                : "text-[#1e293b] hover:bg-[#f8fafc]"
              }`}
          >
            <span className="relative flex h-[1.1rem] w-6 shrink-0 items-center justify-center">
              <TwemojiIcon codepoint="1f514" className="h-[1.1rem] w-[1.1rem]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-[3px] leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            <span className="hidden sidebar:block">通知</span>
          </Link>

          <div className="h-1" />

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setDropdownOpen((o) => !o); }}
              className="w-full flex items-center gap-[10px] px-2 py-[6px] rounded-[10px] hover:bg-[#f8fafc] transition-colors justify-start"
            >
              <div className="w-8 h-8 rounded-full bg-[#16a34a]/10 flex items-center justify-center shrink-0 text-sm font-semibold text-[#16a34a]">
                {user.nickname[0]}
              </div>
              <span className="hidden sidebar:block text-[0.9rem] font-semibold text-[#1e293b] truncate">
                {user.nickname}
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[#e2e8f0] overflow-hidden z-50">
                <Link
                  href="/settings"
                  className="block px-4 py-[11px] text-[0.9rem] text-[#1e293b] hover:bg-[#f8fafc] transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  プロフィール編集
                </Link>
                <Link
                  href="/settings/account"
                  className="block px-4 py-[11px] text-[0.9rem] text-[#1e293b] hover:bg-[#f8fafc] transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  アカウント設定
                </Link>
                <button
                  onClick={() => { setDropdownOpen(false); signOut({ callbackUrl: "/" }); }}
                  className="w-full text-left px-4 py-[11px] text-[0.9rem] text-red-500 hover:bg-[#fff5f5] border-t border-[#e2e8f0] transition-colors"
                >
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Top bar (mobile): ホーム・検索・通知・アバター */}
      <nav className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#e2e8f0] z-30 flex items-center justify-around px-2">
        <Link href="/" className={`flex items-center justify-center h-9 w-9 rounded-full transition-colors ${pathname === "/" ? "text-[#16a34a] bg-[#dcfce7]" : "text-[#64748b]"}`}>
          <span className="text-lg leading-none">🏠</span>
        </Link>
        <Link href="/search" className={`flex items-center justify-center h-9 w-9 rounded-full transition-colors ${pathname.startsWith("/search") ? "text-[#16a34a] bg-[#dcfce7]" : "text-[#64748b]"}`}>
          <TwemojiIcon codepoint="1f50d" className="h-5 w-5" />
        </Link>
        <Link href="/notification" className={`relative flex items-center justify-center h-9 w-9 rounded-full transition-colors ${pathname === "/notification" ? "text-[#16a34a] bg-[#dcfce7]" : "text-[#64748b]"}`}>
          <TwemojiIcon codepoint="1f514" className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-[3px] leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
        <div className="relative" ref={mobileDropdownRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMobileDropdownOpen((o) => !o); }}
            className="flex items-center justify-center h-9 w-9 rounded-full bg-[#16a34a]/10 text-sm font-semibold text-[#16a34a]"
          >
            {user.nickname[0]}
          </button>
          {mobileDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[#e2e8f0] overflow-hidden z-50">
              <Link
                href="/settings"
                className="block px-4 py-[11px] text-[0.9rem] text-[#1e293b] hover:bg-[#f8fafc] transition-colors"
                onClick={() => setMobileDropdownOpen(false)}
              >
                プロフィール編集
              </Link>
              <Link
                href="/settings/account"
                className="block px-4 py-[11px] text-[0.9rem] text-[#1e293b] hover:bg-[#f8fafc] transition-colors"
                onClick={() => setMobileDropdownOpen(false)}
              >
                アカウント設定
              </Link>
              <button
                onClick={() => { setMobileDropdownOpen(false); signOut({ callbackUrl: "/" }); }}
                className="w-full text-left px-4 py-[11px] text-[0.9rem] text-red-500 hover:bg-[#fff5f5] border-t border-[#e2e8f0] transition-colors"
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom nav (mobile): 新規投稿・プロフィール・マイページ内各タブへの直接リンク（アイコンのみ） */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] z-30 flex overflow-x-auto">
        {NAV_ITEMS.filter((item): item is NavLink => !("divider" in item) && MOBILE_BOTTOM_KEYS.includes(item.key)).map((item) => {
          const href = resolveHref(item);
          const active = isActive(item);
          return (
            <Link
              key={item.key}
              href={href}
              title={item.label}
              aria-label={item.label}
              className={`flex-1 flex items-center justify-center py-3 min-w-[44px] transition-colors
                ${active ? "text-[#16a34a]" : "text-[#64748b]"}`}
            >
              <TwemojiIcon codepoint={item.icon} className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
