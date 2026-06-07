'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BackofficePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/backoffice/lessons');
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-[#FFF9F0] dark:bg-[#1a1a2e] text-text-primary font-bold">
      <span>กำลังเปลี่ยนเส้นทาง...</span>
    </div>
  );
}
