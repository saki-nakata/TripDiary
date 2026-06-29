import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-[#e2e8f0] text-center">
        <div className="w-16 h-16 rounded-full bg-[#16a34a]/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✈️</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1e293b] mb-1">ログイン成功！</h1>
        <p className="text-[#64748b] mb-6">
          ようこそ、<span className="font-semibold text-[#1e293b]">{session.user.nickname}</span> さん
        </p>
        <p className="text-sm text-[#64748b] mb-8">
          {session.user.email}
        </p>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-xl border border-[#e2e8f0] py-2.5 text-sm font-semibold text-[#64748b] hover:bg-[#f8fafc] transition-colors"
          >
            ログアウト
          </button>
        </form>
      </div>
    </main>
  );
}
