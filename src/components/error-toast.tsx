"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { isActionError, isRateLimitError, type ActionError } from "@/lib/errors";

interface Toast {
  id: string;
  message: string;
  type: "error" | "success" | "info";
  duration?: number; // Custom duration in ms
}

interface ErrorContextType {
  toasts: Toast[];
  addToast: (message: string, type?: "error" | "success" | "info") => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  showError: (error: unknown) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: "error" | "success" | "info" = "info", duration?: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    // Auto-remove after specified duration (default 4 seconds)
    const toastDuration = duration ?? 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toastDuration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showError = useCallback((error: unknown) => {
    if (isRateLimitError(error)) {
      // Calculate seconds until retry
      const now = Date.now();
      const retryMs = error.resetAt.getTime() - now;
      const retrySeconds = Math.max(0, Math.ceil(retryMs / 1000));

      addToast(
        `Rate limit exceeded. Try again in ${retrySeconds} seconds.`,
        "error",
        6000 // Show for longer (6 seconds)
      );
    } else if (isActionError(error)) {
      addToast(error.message, "error");
    } else if (error instanceof Error) {
      addToast(error.message, "error");
    } else {
      addToast("An unexpected error occurred", "error");
    }
  }, [addToast]);

  return (
    <ErrorContext.Provider value={{ toasts, addToast, removeToast, clearToasts, showError }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ErrorContext.Provider>
  );
}

export function useErrorToast() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useErrorToast must be used within ErrorProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right-full duration-300 ${
            toast.type === "error"
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100"
              : toast.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
                : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100"
          }`}
        >
          <span className="flex-1 text-sm">{toast.message}</span>
          <button
            onClick={() => onRemove(toast.id)}
            className="text-current opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
