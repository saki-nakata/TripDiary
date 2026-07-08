import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { findUserById } from "@/lib/repositories/user.repository";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata: Metadata = { title: "プロフィール編集 — TripDiary" };

export default async function SettingsPage() {
  const session = await auth();
  const user = await findUserById(session!.user.id!);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">✏️ プロフィール編集</h1>
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm px-10 py-20">
        <SettingsForm
          userId={user!.id}
          initialNickname={user!.nickname}
          initialBio={user!.bio}
          initialImage={user!.image}
          email={session!.user.email!}
        />
      </div>
    </div>
  );
}
