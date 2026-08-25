'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error Boundary caught error:', error);
  }, [error]);

  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-background text-foreground">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-3xl bg-card-bg border-2 border-border-color shadow-xl">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-incorrect/10 flex items-center justify-center border-2 border-incorrect/20 text-incorrect">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            เกิดข้อผิดพลาดในการประมวลผล
          </h1>
          <p className="text-sm text-foreground/70 leading-relaxed">
            ระบบพบข้อผิดพลาดบางประการ กรุณากดลองใหม่อีกครั้ง หรือกลับไปยังหน้าหลัก
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-foreground/40 pt-1">
              Error Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-md cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            ลองใหม่อีกครั้ง
          </button>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-background border border-border-color font-semibold text-sm hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] transition-all"
          >
            <Home className="w-4 h-4" />
            หน้าแรก
          </Link>
        </div>
      </div>
    </main>
  );
}
