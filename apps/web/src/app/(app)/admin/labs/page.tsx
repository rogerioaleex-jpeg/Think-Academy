'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, Button, Badge } from '@/components/ui';

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const CATEGORIES = ['SOC', 'NETWORK', 'WINDOWS', 'LINUX', 'CLOUD', 'DFIR', 'THREAT_INTEL', 'DETECTION_ENGINEERING', 'WEB', 'CTF'];

export default function AdminLabsPage() {
  const [labs, setLabs] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', category: 'SOC', objective: '', difficulty: 'MEDIUM', xpReward: 100, dockerImage: 'tica/lab-soc-synthetic:latest' });
  const [msg, setMsg] = useState('');

  function load() { api<any[]>('/admin/labs').then(setLabs).catch(() => {}); }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/labs', { method: 'POST', body: JSON.stringify({ ...form, slug: slugify(form.title) }) });
      setMsg('Lab criado.'); setForm({ ...form, title: '', objective: '' }); load();
    } catch (err) { setMsg((err as Error).message); }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold text-ink">Admin · Cyber Labs</h1>
      <p className="mb-6 text-xs text-muted">Criar labs isolados, desafios (flag vira hash) e hints.</p>
      {msg && <p className="mb-4 rounded-lg bg-surface2 px-3 py-2 text-xs text-brand">{msg}</p>}

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Novo lab</h2>
        <form onSubmit={create} className="grid gap-3 md:grid-cols-2 text-xs text-muted">
          <label className="md:col-span-2">Título
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
              className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
          </label>
          <label className="md:col-span-2">Objetivo
            <input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
          </label>
          <label>Categoria
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Dificuldade
            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink">
              {['EASY', 'MEDIUM', 'HARD', 'EXPERT'].map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label>XP
            <input type="number" value={form.xpReward} onChange={(e) => setForm({ ...form, xpReward: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
          </label>
          <label>Imagem Docker
            <input value={form.dockerImage} onChange={(e) => setForm({ ...form, dockerImage: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
          </label>
          <div className="flex items-end md:col-span-2"><Button type="submit" className="w-full">Criar lab</Button></div>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {labs.map((l) => (
          <Card key={l.id}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-ink">{l.title}</span>
                <span className="ml-2"><Badge>{l.category}</Badge></span>
                <span className="ml-2 text-xs text-muted">{l._count?.challenges ?? 0} desafios · {l._count?.hints ?? 0} hints</span>
              </div>
              <button onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                className="rounded-lg bg-surface2 px-3 py-1.5 text-xs text-muted">Desafios & hints</button>
            </div>
            {expanded === l.id && <LabItems labId={l.id} onChange={load} />}
          </Card>
        ))}
      </div>
    </div>
  );
}

function LabItems({ labId, onChange }: { labId: string; onChange: () => void }) {
  const [ch, setCh] = useState({ title: '', flag: '', points: 50 });
  const [hint, setHint] = useState({ text: '', costXp: 10 });
  const [msg, setMsg] = useState('');

  async function addChallenge() {
    if (!ch.title || !ch.flag) return;
    await api(`/admin/labs/${labId}/challenges`, { method: 'POST', body: JSON.stringify(ch) });
    setMsg('Desafio adicionado (flag armazenada como hash).'); setCh({ title: '', flag: '', points: 50 }); onChange();
  }
  async function addHint() {
    if (!hint.text) return;
    await api(`/admin/labs/${labId}/hints`, { method: 'POST', body: JSON.stringify(hint) });
    setMsg('Hint adicionado.'); setHint({ text: '', costXp: 10 }); onChange();
  }

  return (
    <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2 text-xs text-muted">
      <div>
        <p className="mb-2 font-semibold text-ink">Novo desafio</p>
        <input value={ch.title} onChange={(e) => setCh({ ...ch, title: e.target.value })} placeholder="Título"
          className="mb-2 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
        <input value={ch.flag} onChange={(e) => setCh({ ...ch, flag: e.target.value })} placeholder="Flag/resposta (vira hash)"
          className="mb-2 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
        <div className="flex gap-2">
          <input type="number" value={ch.points} onChange={(e) => setCh({ ...ch, points: Number(e.target.value) })}
            className="w-24 rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
          <Button onClick={addChallenge} className="flex-1">Adicionar desafio</Button>
        </div>
      </div>
      <div>
        <p className="mb-2 font-semibold text-ink">Novo hint</p>
        <input value={hint.text} onChange={(e) => setHint({ ...hint, text: e.target.value })} placeholder="Texto do hint"
          className="mb-2 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
        <div className="flex gap-2">
          <input type="number" value={hint.costXp} onChange={(e) => setHint({ ...hint, costXp: Number(e.target.value) })}
            className="w-24 rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
          <Button onClick={addHint} className="flex-1">Adicionar hint</Button>
        </div>
      </div>
      {msg && <p className="text-brand md:col-span-2">{msg}</p>}
    </div>
  );
}
