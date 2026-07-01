import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = {
    id: session.user.id!,
    nickname: session.user.nickname,
    email: session.user.email!,
  };

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Sidebar user={user} onSignOut={handleSignOut} />
      {/* Offset for sidebar */}
      <div className="md:ml-16 lg:ml-60 pb-16 md:pb-0">
        <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
