"use client";

import { ToastType } from "@/hooks/use-toast";

type ToastItem = { id: number; message: string; type: ToastType };

const COLOR: Record<ToastType, string> = {
  success: "bg-[#16a34a] text-white",
  error: "bg-red-500 text-white",
  info: "bg-[#1e293b] text-white",
};

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs animate-fade-in ${COLOR[t.type]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
