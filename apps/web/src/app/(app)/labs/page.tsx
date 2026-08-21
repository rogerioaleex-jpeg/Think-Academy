'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, SectionHeader, Badge } from '@/components/ui';

interface Lab {
  id: string;
  title: string;
  slug: string;
  category: string;
  difficulty: string;
  durationMin: number;
  xpReward: number;
  objective: string | null;
  _count: { challenges: number };
}

export default function LabsPage() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Lab[]>('/labs').then(setLabs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted">Carregando laboratórios…</p>;

  return (
    <div>
      <SectionHeader
        kicker="Prática"
        title="Cyber Labs"
        subtitle="Ambientes deliberadamente vulneráveis e controlados, em rede isolada, para você praticar como analista."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {labs.map((l) => (
          <Link key={l.id} href={`/labs/${l.slug}`}>
            <Card className="h-full cursor-pointer transition hover:border-brand">
              <div className="flex gap-2">
                <Badge>{l.category}</Badge>
                <Badge>{l.difficulty}</Badge>
              </div>
              <b className="mt-2 block text-sm text-ink">{l.title}</b>
              {l.objective && <p className="mt-1 text-xs text-muted">{l.objective}</p>}
              <div className="mt-3 text-xs text-muted">
                +{l.xpReward} XP · {l._count.challenges} desafio{l._count.challenges === 1 ? '' : 's'} · ~{l.durationMin} min
              </div>
            </Card>
          </Link>
        ))}
        {labs.length === 0 && <p className="text-sm text-muted">Nenhum lab publicado ainda.</p>}
      </div>
    </div>
  );
}
