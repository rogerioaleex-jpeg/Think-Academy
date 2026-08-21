'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, Badge, Button } from '@/components/ui';

export default function LabDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [lab, setLab] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api(`/labs/${slug}`).then(setLab).catch((e) => setMsg((e as Error).message));
  }, [slug]);

  async function start() {
    setBusy(true);
    setMsg('');
    try {
      const instance = await api<{ id: string }>(`/labs/${lab.id}/start`, { method: 'POST' });
      router.push(`/labs/console?instance=${instance.id}`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (msg && !lab) return <p className="text-sm text-danger">{msg}</p>;
  if (!lab) return <p className="text-sm text-muted">Carregando lab…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex gap-2">
            <Badge>{lab.category}</Badge>
            <Badge>{lab.difficulty}</Badge>
          </div>
          <h1 className="mt-2 text-xl font-bold text-ink">{lab.title}</h1>
        </div>
        <Button onClick={start} disabled={busy}>{busy ? 'Provisionando…' : 'Iniciar lab'}</Button>
      </div>

      {lab.objective && (
        <Card className="mt-4">
          <p className="text-sm text-muted">{lab.objective}</p>
        </Card>
      )}

      <Card className="mt-4">
        <h2 className="mb-2 text-sm font-bold text-ink">Desafios ({lab.challenges.length})</h2>
        {lab.challenges.map((c: any) => (
          <p key={c.id} className="text-xs text-muted">
            {c.order + 1}. {c.title} — {c.points} pts
          </p>
        ))}
        {lab.challenges.length === 0 && <p className="text-xs text-muted">Nenhum desafio cadastrado ainda.</p>}
      </Card>

      {lab.hints?.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-2 text-sm font-bold text-ink">Hints disponíveis</h2>
          <p className="text-xs text-muted">{lab.hints.length} hint(s) — revele durante o lab, cada um pode custar XP.</p>
        </Card>
      )}

      {msg && <p className="mt-3 text-xs text-brand">{msg}</p>}
    </div>
  );
}
