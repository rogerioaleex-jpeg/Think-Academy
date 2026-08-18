'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ROUTE, buildSidebar, setSimTab } from '@/lib/proto';
import { logout } from '@/lib/api';

// Casca da aplicação usando a sidebar/tema do Stitch (proto.js + tailwind-stitch.css).
export function ProtoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // id ativo a partir da rota atual
  const active = (Object.entries(ROUTE as Record<string, string>)
    .find(([, r]) => r === pathname || (r !== '/' && pathname.startsWith(r + '/')))?.[0]) || 'dashboard';

  useEffect(() => {
    (window as any).go = (id: string) => router.push((ROUTE as any)[id] || '/dashboard');
    (window as any).simTab = (t: string) => { setSimTab(t); router.push('/sim/run'); };
    (window as any).__logout = () => { void logout().finally(() => router.push('/login')); };
  }, [router]);

  return (
    <div className="app flex h-screen overflow-hidden bg-surface-background font-body-md text-on-surface antialiased">
      <div dangerouslySetInnerHTML={{ __html: buildSidebar(active) }} />
      <div className="flex-1 md:ml-[96px] h-full overflow-y-auto bg-surface-background relative">
        {children}
      </div>
    </div>
  );
}
