"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { ToastContainer } from "@/components/ui/toast";

export type ToastType = "success" | "error" | "info";

type Toast = { id: number; message: string; type: ToastType };
type ToastContextValue = { showToast: (message: string, type?: ToastType, duration?: number) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

// QueryClientのグローバルonError（QueryProvider）はReactツリーの外（QueryClient生成時）で
// 定義されるためuseToast()を呼べない。マウント中のToastProviderが自身のshowToastを
// ここに登録し、showGlobalToastはそれを介してトーストを表示する
let globalShowToast: ToastContextValue["showToast"] | null = null;

export function showGlobalToast(message: string, type: ToastType = "error", duration = 3000) {
  globalShowToast?.(message, type, duration);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success", duration = 3000) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  useEffect(() => {
    globalShowToast = showToast;
    return () => {
      globalShowToast = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
