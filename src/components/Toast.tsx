"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";

export type Toast = {
  id: number;
  /** main line; kept short enough to read in a glance */
  message: React.ReactNode;
  /** optional follow-through, e.g. "View in diary" */
  action?: { label: string; href: string };
  tone?: "ok" | "warn";
};

type Ctx = { toast: (t: Omit<Toast, "id">) => void };

const ToastContext = createContext<Ctx | null>(null);

/** Confirms an action without a page refresh. Safe to call from any client component. */
export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  // A component may render outside the provider (e.g. in a test); no-op rather than throw.
  return ctx ?? { toast: () => {} };
}

const DURATION = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = nextId.current++;
    // at most three on screen; the oldest falls off rather than stacking forever
    setItems((list) => [...list, { ...t, id }].slice(-3));
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-start sm:p-6"
      >
        {items.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), DURATION);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const ok = toast.tone !== "warn";

  return (
    <div
      role="status"
      className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border border-seam bg-tray px-3.5 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,.5)]"
    >
      <span
        aria-hidden
        className={`flex size-6.5 shrink-0 items-center justify-center rounded-card text-sm ${
          ok ? "bg-[#22331f] text-good" : "bg-[#3a2422] text-warn"
        }`}
      >
        {ok ? "✓" : "!"}
      </span>
      <span className="min-w-0 flex-1 text-[13px] text-paper">{toast.message}</span>
      {toast.action && (
        <Link
          href={toast.action.href}
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 text-[13px] text-beam hover:underline"
        >
          {toast.action.label}
        </Link>
      )}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 text-dim hover:text-paper"
      >
        ×
      </button>
    </div>
  );
}
