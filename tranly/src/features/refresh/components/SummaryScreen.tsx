'use client';

import { useRouter } from 'next/navigation';
import AdSlot from '@/shared/components/AdSlot';

interface Props {
  total: number;
  improved: number;
  isPractice: boolean;
  isPremium?: boolean;
}

export default function SummaryScreen({ total, improved, isPractice, isPremium = false }: Props) {
  const router = useRouter();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background text-foreground px-6">
      <div className="text-6xl mb-6">🎉</div>
      <h2 className="text-2xl font-bold mb-2">รอบนี้เสร็จแล้ว!</h2>
      <p className="text-foreground/60 mb-8 text-center">
        {isPractice
          ? `ฝึกซ้อม ${total} คำ`
          : `ทบทวนแล้ว ${total} คำ · กลับเป็นเขียว ${improved} คำ`}
      </p>

      {!isPremium && (
        <div className="mb-8 w-full max-w-xs">
          <AdSlot isPremium={isPremium} />
        </div>
      )}

      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={() => router.push('/refresh')}
          className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white dark:text-gray-900 font-bold text-lg active:scale-95 transition-all shadow-soft-sm cursor-pointer"
        >
          เล่นอีกรอบ
        </button>
        <button
          onClick={() => router.push('/')}
          className="w-full py-4 rounded-2xl bg-card-bg border border-border-color text-foreground font-semibold active:scale-95 transition-all cursor-pointer"
        >
          กลับหน้าหลัก
        </button>
      </div>
    </div>
  );
}

