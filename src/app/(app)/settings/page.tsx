import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { findUserByIdService } from "@/lib/services/user.service";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = { title: "プロフィール編集 — TripDiary" };

export default async function SettingsPage() {
  const session = await auth();
  const user = await findUserByIdService(session!.user.id!);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6 -mt-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-surface-foreground">
          <TwemojiIcon codepoint="270f" className="h-6 w-6" /> プロフィール編集
        </h1>
        <Link
          href="/settings/account"
          className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-surface-border text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
        >
          🔐 アカウント設定へ
        </Link>
      </div>
      <div className="bg-surface border border-surface-border rounded-2xl shadow-sm px-10 py-20">
        <SettingsForm
          userId={user!.id}
          initialNickname={user!.nickname}
          initialBio={user!.bio}
          initialImage={user!.image}
          initialVersion={user!.version}
        />
      </div>
      <div className="bg-surface border border-surface-border rounded-2xl shadow-sm px-10 py-10">
        <h2 className="text-lg font-bold text-surface-foreground mb-4">テーマ</h2>
        <ThemeToggle showLabels />
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">自動では端末の設定に合わせます</p>
      </div>
    </div>
  );
}
