import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { AccountForms } from "@/components/settings/AccountForms";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

export const metadata: Metadata = { title: "アカウント設定 — TripDiary" };

export default async function AccountSettingsPage() {
  const session = await auth();

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6 -mt-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
          🔐 アカウント設定
        </h1>
        <Link
          href="/settings"
          className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <TwemojiIcon codepoint="270f" className="h-4 w-4" /> プロフィール編集へ
        </Link>
      </div>
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm px-10 pt-10 pb-20">
        <AccountForms userId={session!.user.id!} initialEmail={session!.user.email!} />
      </div>
    </div>
  );
}
