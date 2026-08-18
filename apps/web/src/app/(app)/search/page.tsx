'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, Badge } from '@/components/ui';

interface Results {
  query: string;
  courses: { id: string; title: string; difficulty: string }[];
  learningPaths: { id: string; title: string; slug: string }[];
  lessons: { id: string; title: string; courseId: string }[];
  labs: { id: string; title: string; slug: string; category: string }[];
  questions: { id: string; prompt: string; category?: string }[];
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-muted">Carregando…</p>}>
      <SearchResults />
    </Suspense>
  );
}

function SearchResults() {
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const [res, setRes] = useState<Results | null>(null);

  useEffect(() => {
    if (q.length >= 2) api<Results>(`/search?q=${encodeURIComponent(q)}`).then(setRes).catch(() => {});
  }, [q]);

  if (q.length < 2) return <p className="text-muted">Digite ao menos 2 caracteres para buscar.</p>;
  if (!res) return <p className="text-muted">Buscando…</p>;

  const empty = !res.courses.length && !res.learningPaths.length && !res.lessons.length && !res.labs.length && !res.questions.length;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-ink">Resultados para “{res.query}”</h1>
      {empty && <p className="text-sm text-muted">Nada encontrado.</p>}

      <Section title="Cursos" show={res.courses.length > 0}>
        {res.courses.map((c) => (
          <Link key={c.id} href={`/courses/${c.id}`} className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2 text-sm text-ink hover:text-ink">
            {c.title} <Badge>{c.difficulty}</Badge>
          </Link>
        ))}
      </Section>

      <Section title="Trilhas" show={res.learningPaths.length > 0}>
        {res.learningPaths.map((p) => (
          <div key={p.id} className="rounded-lg bg-surface2 px-3 py-2 text-sm text-ink">{p.title}</div>
        ))}
      </Section>

      <Section title="Aulas" show={res.lessons.length > 0}>
        {res.lessons.map((l) => (
          <Link key={l.id} href={`/courses/${l.courseId}`} className="block rounded-lg bg-surface2 px-3 py-2 text-sm text-ink hover:text-ink">{l.title}</Link>
        ))}
      </Section>

      <Section title="Labs" show={res.labs.length > 0}>
        {res.labs.map((l) => (
          <Link key={l.id} href={`/labs/${l.slug}`} className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2 text-sm text-ink hover:text-ink">
            {l.title} <Badge>{l.category}</Badge>
          </Link>
        ))}
      </Section>

      <Section title="Questões" show={res.questions.length > 0}>
        {res.questions.map((qq) => (
          <div key={qq.id} className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2 text-sm text-ink">
            <span className="line-clamp-1">{qq.prompt}</span> {qq.category && <Badge>{qq.category}</Badge>}
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, show, children }: { title: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <Card className="mb-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </Card>
  );
}
