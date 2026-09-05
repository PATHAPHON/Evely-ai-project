'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Error Boundary caught error:', error);
  }, [error]);

  return (
    <html lang="th">
      <body className="min-h-dvh flex items-center justify-center p-4 bg-[#f8fafc] text-[#0f172a] font-sans antialiased">
        <div className="max-w-md w-full text-center space-y-6 p-8 rounded-3xl bg-white border-2 border-[#e2e8f0] shadow-xl">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-rose-50 flex items-center justify-center border-2 border-rose-200 text-rose-600">
            <AlertTriangle className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[#0f172a]">
              เกิดข้อผิดพลาดร้ายแรงของระบบ
            </h1>
            <p className="text-sm text-[#64748b] leading-relaxed">
              ระบบพบข้อผิดพลาดที่ไม่สามารถทำงานต่อได้ กรุณากดลองใหม่อีกครั้ง หรือกลับไปยังหน้าหลัก
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-[#94a3b8] pt-1">
                Error Digest: {error.digest}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2563eb] text-white font-semibold text-sm hover:bg-[#1d4ed8] active:scale-[0.98] transition-all shadow-md cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              ลองใหม่อีกครั้ง
            </button>
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-[#cbd5e1] font-semibold text-sm text-[#334155] hover:bg-[#f1f5f9] active:scale-[0.98] transition-all"
            >
              <Home className="w-4 h-4" />
              หน้าแรก
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
