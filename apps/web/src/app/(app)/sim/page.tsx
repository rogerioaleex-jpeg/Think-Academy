'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { renderView, setSimTab } from '@/lib/proto';

export default function SimQueue() {
  const router = useRouter();
  useEffect(() => {
    (window as any).simTab = (t: string) => { setSimTab(t); router.push('/sim/run'); };
  }, [router]);
  return <div dangerouslySetInnerHTML={{ __html: renderView('sim') }} />;
}
