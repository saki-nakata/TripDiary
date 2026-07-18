import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { GuestSidebarNav } from "@/components/layout/GuestSidebarNav";
import { GuestMobileNav } from "@/components/layout/GuestMobileNav";
import { ToastProvider } from "@/contexts/toast-context";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (session?.user) {
    const user = {
      id: session.user.id!,
      nickname: session.user.nickname,
      email: session.user.email!,
    };
    return (
      <ToastProvider>
        <div className="min-h-screen">
          <Suspense>
            <Sidebar user={user} />
          </Suspense>
          <div className="ml-16 max-md:ml-0 sidebar:ml-60 pt-14 md:pt-0 pb-16 md:pb-0">
            <main className="px-2 md:px-10 py-6">{children}</main>
          </div>
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-white">
        <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full bg-white border-r border-[#e2e8f0] z-30 w-60">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 pt-6 mb-5 text-[#1a6b3a] font-bold hover:opacity-80 transition-opacity"
          >
            <TwemojiIcon codepoint="2708" alt="✈️" className="h-6 w-6" />
            <span className="text-[1.35rem]">TripDiary</span>
          </Link>
          <GuestSidebarNav />
          <div className="mt-auto px-4 pb-8 flex flex-col gap-3">
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#2d8a52] text-white text-[0.9rem] font-semibold hover:bg-[#1a6b3a] transition-colors"
            >
              <span className="text-lg leading-none -ml-1">🔑</span>
              ログイン
            </Link>
            <Link
              href="/signup"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-[1.5px] border-[#1a6b3a] text-[#1a6b3a] text-[0.9rem] font-semibold hover:bg-[#dcfce7] transition-colors"
            >
              <span className="text-lg leading-none -ml-1">🌱</span>
              新規登録
            </Link>
          </div>
        </aside>

        <GuestMobileNav />

        <div className="md:ml-60 pt-14 md:pt-0 pb-16 md:pb-0">
          <main className="px-2 md:px-10 py-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
