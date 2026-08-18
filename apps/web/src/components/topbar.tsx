'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Notif { id: string; type: string; title: string; body?: string; readAt?: string | null; createdAt: string; }

export function Topbar() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);

  function refreshCount() {
    api<{ count: number }>('/notifications/unread-count').then((r) => setUnread(r.count)).catch(() => {});
  }
  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 30000);
    return () => clearInterval(t);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) setNotifs(await api<Notif[]>('/notifications').catch(() => []));
  }
  async function markAll() {
    await api('/notifications/read-all', { method: 'POST' });
    setNotifs((n) => n.map((x) => ({ ...x, readAt: new Date().toISOString() })));
    setUnread(0);
  }
  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length >= 2) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="flex items-center gap-4 border-b border-border bg-surface px-6 py-3">
      <form onSubmit={submitSearch} className="flex-1">
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cursos, aulas, labs, questões…"
          className="w-full max-w-md rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-brand"
        />
      </form>
      <div className="relative">
        <button onClick={toggle} className="relative rounded-lg border border-border bg-bg px-3 py-2 text-sm">
          🔔
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
        {open && (
          <div className="absolute right-0 top-12 z-20 w-80 rounded-xl border border-border bg-surface p-3 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Notificações</span>
              <button onClick={markAll} className="text-xs font-semibold text-brand">Marcar todas</button>
            </div>
            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {notifs.length === 0 && <li className="py-4 text-center text-xs text-muted">Sem notificações.</li>}
              {notifs.map((n) => (
                <li key={n.id} className={`rounded-lg p-2 text-xs ${n.readAt ? 'bg-surface2 text-muted' : 'bg-[#EFF6F5] text-ink'}`}>
                  <div className="font-semibold">{n.title}</div>
                  {n.body && <div className="mt-0.5 text-gray">{n.body}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
