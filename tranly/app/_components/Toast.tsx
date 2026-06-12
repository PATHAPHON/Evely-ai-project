'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const showToast = useCallback((message: string, type: ToastType = 'error', durationMs = 5000) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(id);
    }, durationMs);

    timersRef.current.set(id, timer);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container - fixed at bottom */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-24 left-1/2 z-[9999] flex flex-col items-center gap-2 -translate-x-1/2"
          style={{ pointerEvents: 'none' }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="alert"
              aria-live="assertive"
              onClick={() => dismiss(toast.id)}
              className="pointer-events-auto rounded-xl border-2 border-border-color px-4 py-2.5 text-sm font-bold shadow-nb-sm animate-[fadeSlideUp_0.2s_ease-out]"
              style={{
                background: toast.type === 'error'
                  ? 'var(--accent-red, #ef4444)'
                  : toast.type === 'warning'
                    ? 'var(--accent-yellow, #eab308)'
                    : 'var(--text-primary)',
                color: toast.type === 'warning' ? '#1a1a1a' : '#fff',
                cursor: 'pointer',
                maxWidth: '85vw',
              }}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
