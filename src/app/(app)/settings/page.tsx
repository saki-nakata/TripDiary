import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { findUserById } from "@/lib/repositories/user.repository";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

export const metadata: Metadata = { title: "プロフィール編集 — TripDiary" };

export default async function SettingsPage() {
  const session = await auth();
  const user = await findUserById(session!.user.id!);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
          <TwemojiIcon codepoint="270f" className="h-6 w-6" /> プロフィール編集
        </h1>
        <Link
          href="/settings/account"
          className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          🔐 アカウント設定へ
        </Link>
      </div>
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm px-10 py-20">
        <SettingsForm
          userId={user!.id}
          initialNickname={user!.nickname}
          initialBio={user!.bio}
          initialImage={user!.image}
        />
      </div>
    </div>
  );
}
