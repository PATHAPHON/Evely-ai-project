'use client';

import { useRouter } from 'next/navigation';
import { useWordBank } from '@/app/_lib/hooks/useWordBank';
import RefreshMenu from './_components/RefreshMenu';

export default function RefreshPage() {
  const router = useRouter();
  const { isLoading } = useWordBank();

  function start() {
    router.push('/refresh/play');
  }

  return <RefreshMenu onStart={start} disabled={isLoading} />;
}
