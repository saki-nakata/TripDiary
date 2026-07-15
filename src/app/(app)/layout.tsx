import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/contexts/toast-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

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
        {/* Offset for sidebar / mobile top bar & bottom nav */}
        <div className="ml-16 max-md:ml-0 sidebar:ml-60 pt-14 md:pt-0 pb-16 md:pb-0">
          <main className="px-10 py-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
