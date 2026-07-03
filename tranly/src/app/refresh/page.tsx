'use client';

import { useRouter } from 'next/navigation';
import { useWordBank } from '@/shared/hooks/useWordBank';
import RefreshMenu from '@/features/refresh/components/RefreshMenu';

export default function RefreshPage() {
  const router = useRouter();
  const { isLoading } = useWordBank();

  function start() {
    router.push('/refresh/play');
  }

  return <RefreshMenu onStart={start} disabled={isLoading} />;
}
