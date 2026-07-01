import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-[#16a34a]/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">✈️</span>
      </div>
      <h1 className="text-2xl font-bold text-[#1e293b] mb-1">ようこそ！</h1>
      <p className="text-[#64748b]">
        <span className="font-semibold text-[#1e293b]">{session?.user.nickname}</span> さん
      </p>
    </div>
  );
}
