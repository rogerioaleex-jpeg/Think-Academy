'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtoShell } from '@/components/ProtoShell';
import { getMe } from '@/lib/api';

// Guarda de rota no cliente. Como o token vive em cookie httpOnly (não é
// legível pelo JS), validamos a sessão perguntando ao backend (/auth/me).
// O próprio api() tenta um refresh transparente antes de desistir.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getMe().then((user) => {
      if (!alive) return;
      if (user) setReady(true);
      else router.replace('/login');
    });
    return () => {
      alive = false;
    };
  }, [router]);

  if (!ready) return null;
  return <ProtoShell>{children}</ProtoShell>;
}
