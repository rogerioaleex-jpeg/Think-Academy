'use client';
import { useEffect, useState } from 'react';
import { renderView, setSimTab } from '@/lib/proto';

export default function SimRun() {
  const [tab, setTab] = useState('investigar');
  useEffect(() => {
    (window as any).simTab = (t: string) => setTab(t);
  }, []);
  setSimTab(tab);
  const html = renderView('sim-run');
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
