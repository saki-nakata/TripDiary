import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Minimal sidebar with login/signup buttons */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full bg-white border-r border-[#e2e8f0] z-30 w-60">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 pt-6 mb-5 text-[#1a6b3a] font-bold hover:opacity-80 transition-opacity"
        >
          <span className="text-2xl">✈️</span>
          <span className="text-[1.35rem]">TripDiary</span>
        </Link>
        <div className="mt-auto px-4 pb-8 flex flex-col gap-3">
          <Link
            href="/login"
            className="block text-center py-2.5 rounded-lg bg-[#2d8a52] text-white text-[0.9rem] font-semibold hover:bg-[#1a6b3a] transition-colors"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="block text-center py-2.5 rounded-lg border-[1.5px] border-[#1a6b3a] text-[#1a6b3a] text-[0.9rem] font-semibold hover:bg-[#dcfce7] transition-colors"
          >
            新規登録
          </Link>
        </div>
      </aside>

      <div className="md:ml-60">
        <main>{children}</main>
      </div>
    </div>
  );
}
