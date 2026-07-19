"use client";

import { ToastType } from "@/contexts/toast-context";

type ToastItem = { id: number; message: string; type: ToastType };

const COLOR: Record<ToastType, string> = {
  success: "bg-[#dcfce7] text-cyan-600 border-2 border-green-300",
  error: "bg-red-50 text-red-700 border-2 border-red-300",
  info: "bg-[#dcfce7] text-cyan-600 border-2 border-green-300",
};

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-1/2 md:top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 items-center">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2.5 md:px-6 md:py-4 rounded-xl shadow-xl text-base font-semibold min-w-64 text-center animate-fade-in ${COLOR[t.type]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
