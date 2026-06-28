import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>
      <p className="mt-2 text-zinc-600">ようこそ、{session.user.name} さん</p>
      <p className="mt-1 text-sm text-zinc-400">（フロントエンド実装予定）</p>
    </main>
  );
}
