"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";

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
    refetchInterval: 60_000,
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
  { href: "/", icon: "🏠", label: "ホーム", key: "dashboard" },
  { href: "/search", icon: "🔍", label: "検索", key: "search" },
  { divider: true },
  { href: "/posts/new", icon: "✏️", label: "新規投稿", key: "posts-new" },
  { href: "/users/[id]", icon: "👤", label: "プロフィール", key: "profile" },
  { divider: true },
  { href: "/mypage?tab=plans", icon: "🗺️", label: "旅行プラン", key: "plans", disabled: true },
  { href: "/mypage?tab=myposts", icon: "✈️", label: "自分の投稿", key: "myposts" },
  { href: "/mypage?tab=report", icon: "📋", label: "旅行レポート", key: "report", disabled: true },
  { href: "/mypage?tab=wishlist", icon: "🔖", label: "行きたい", key: "wishlist" },
  { href: "/mypage?tab=visited", icon: "✅", label: "訪問済み", key: "visited" },
  { href: "/mypage?tab=follow-feed", icon: "👥", label: "フォロー中の投稿", key: "follow-feed" },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/", icon: "🏠", label: "ホーム" },
  { href: "/search", icon: "🔍", label: "検索" },
  { href: "/posts/new", icon: "✏️", label: "新規投稿" },
  { href: "/mypage", icon: "👤", label: "マイページ" },
];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { count: unreadCount } = useUnreadCount();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
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
          <span className="text-2xl shrink-0">✈️</span>
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
                  <span className="text-[1.1rem] w-6 text-center shrink-0">{item.icon}</span>
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
                <span className="text-[1.1rem] w-6 text-center shrink-0">{item.icon}</span>
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
            <span className="relative text-[1.1rem] w-6 text-center shrink-0">
              🔔
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

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] z-30 flex">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const active = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors
                ${active ? "text-[#16a34a]" : "text-[#64748b]"}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
