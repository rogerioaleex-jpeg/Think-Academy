'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/api';
import { Icon } from '@/components/icon';

type Item = { href: string; label: string; icon: string };
type Section = { title: string; items: Item[] };

const NAV: Section[] = [
  { title: 'Aprender', items: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/courses', label: 'Cursos & Trilhas', icon: 'menu_book' },
    { href: '/labs', label: 'Cyber Labs', icon: 'terminal' },
    { href: '/soc-live', label: 'SOC Live', icon: 'monitor_heart' },
    { href: '/exams', label: 'Avaliações', icon: 'quiz' },
  ]},
  { title: 'Progresso', items: [
    { href: '/leaderboard', label: 'Ranking', icon: 'leaderboard' },
    { href: '/achievements', label: 'Conquistas', icon: 'military_tech' },
    { href: '/competencies', label: 'Competências', icon: 'radar' },
    { href: '/certificates', label: 'Certificados', icon: 'workspace_premium' },
    { href: '/notifications', label: 'Notificações', icon: 'notifications' },
  ]},
  { title: 'Gestão', items: [
    { href: '/manager', label: 'Gestor', icon: 'groups' },
    { href: '/talent', label: 'Gestão de Talentos', icon: 'insights' },
    { href: '/roi', label: 'ROI & Custos', icon: 'payments' },
    { href: '/assign', label: 'Atribuição em massa', icon: 'group_add' },
  ]},
  { title: 'Admin', items: [
    { href: '/admin', label: 'Administração', icon: 'settings' },
    { href: '/admin/security', label: 'Segurança', icon: 'security' },
  ]},
];

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <g stroke="#C8D541" strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" />
      </g>
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-dark px-3.5 py-5 text-white">
      <div className="flex items-center gap-2.5 px-2">
        <Mark />
        <div>
          <div className="text-lg font-extrabold leading-none">Think</div>
          <div className="mt-0.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-lime">Cyber Academy</div>
        </div>
      </div>

      <nav className="mt-5 flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {NAV.map((section) => (
          <div key={section.title}>
            <div className="mono px-3 pb-1.5 pt-3.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#6b727a]">
              {section.title}
            </div>
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-sm transition ${
                    active
                      ? 'border-lime bg-[#2b2f37] text-white'
                      : 'border-transparent text-[#c7ccd2] hover:bg-[#2b2f37] hover:text-white'
                  }`}
                >
                  <Icon name={item.icon} size={19} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-2 border-t border-[#2b2f37] px-3 pt-2.5 font-mono text-[11px] text-[#6b727a]">grupothink.com.br</div>
      <button
        onClick={() => { void logout().finally(() => router.push('/login')); }}
        className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#c7ccd2] hover:bg-[#2b2f37] hover:text-white"
      >
        <Icon name="logout" size={19} /> Sair
      </button>
    </aside>
  );
}
