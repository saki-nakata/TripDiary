"use client";

import { ToastType } from "@/contexts/toast-context";

type ToastItem = { id: number; message: string; type: ToastType };

const COLOR: Record<ToastType, string> = {
  success: "bg-[#16a34a] text-white",
  error: "bg-red-50 text-red-700 border-2 border-red-300",
  info: "bg-[#1e293b] text-white",
};

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-6 py-4 rounded-xl shadow-xl text-base font-semibold min-w-64 text-center animate-fade-in ${COLOR[t.type]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
