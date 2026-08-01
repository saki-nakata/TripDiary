import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { GuestSidebarNav } from "@/components/layout/GuestSidebarNav";
import { GuestMobileNav } from "@/components/layout/GuestMobileNav";
import { ToastProvider } from "@/contexts/toast-context";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Logo } from "@/components/ui/Logo";

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
          <div className="ml-32 max-md:ml-0 sidebar:ml-60 pt-14 md:pt-0 pb-16 md:pb-0">
            <main className="px-2 md:px-3 lg:px-10 py-6">{children}</main>
          </div>
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full bg-surface border-r border-surface-border z-30 w-60">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 pt-6 mb-5 font-bold hover:opacity-80 transition-opacity"
          >
            <TwemojiIcon codepoint="2708" alt="✈️" className="h-6 w-6" />
            <Logo variant="guest" className="text-[1.35rem]" />
          </Link>
          <GuestSidebarNav />
          <div className="mt-auto px-4 pb-8 flex flex-col gap-3">
            <ThemeToggle showLabels />
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#267a48] text-white text-[0.9rem] font-semibold hover:bg-[#1a6b3a] transition-colors"
            >
              <span className="text-lg leading-none -ml-1">🔑</span>
              ログイン
            </Link>
            <Link
              href="/signup"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-[1.5px] border-[#1a6b3a] dark:border-green-400 text-[#1a6b3a] dark:text-green-400 text-[0.9rem] font-semibold hover:bg-[#dcfce7] dark:hover:bg-[#16a34a]/20 transition-colors"
            >
              <span className="text-lg leading-none -ml-1">🌱</span>
              新規登録
            </Link>
          </div>
        </aside>

        <GuestMobileNav />

        <div className="md:ml-60 pt-14 md:pt-0 pb-16 md:pb-0">
          <main className="px-2 md:px-3 lg:px-10 py-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
