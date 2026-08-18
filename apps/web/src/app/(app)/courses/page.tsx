'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, SectionHeader, Badge } from '@/components/ui';
import { DIFFICULTY_LABEL } from '@/lib/video';

interface LearningPath {
  id: string; title: string; difficulty: string;
  _count: { courses: number };
}
interface Course {
  id: string; title: string; shortDescription: string | null; difficulty: string;
  estimatedHours: number; category: { name: string } | null;
  _count: { modules: number; enrollments: number };
}

export default function CoursesPage() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<LearningPath[]>('/learning-paths').catch(() => []),
      api<Course[]>('/courses').catch(() => []),
    ]).then(([p, c]) => { setPaths(p); setCourses(c); setLoading(false); });
  }, []);

  if (loading) return <p className="text-sm text-muted">Carregando catálogo…</p>;

  return (
    <div>
      <SectionHeader kicker="Catálogo" title="Cursos & Trilhas" subtitle="Jornadas de formação e cursos avulsos." />

      {paths.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink">Trilhas</h2>
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {paths.map((p) => (
              <Card key={p.id}>
                <div className="flex items-center justify-between">
                  <b className="text-sm text-ink">{p.title}</b>
                  <Badge>{DIFFICULTY_LABEL[p.difficulty] ?? p.difficulty}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted">{p._count.courses} curso{p._count.courses === 1 ? '' : 's'}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink">Cursos</h2>
      {courses.length === 0 && <p className="text-sm text-muted">Nenhum curso publicado ainda.</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {courses.map((c) => (
          <Link key={c.id} href={`/courses/${c.id}`}>
            <Card className="h-full cursor-pointer transition hover:border-brand">
              <b className="text-sm text-ink">{c.title}</b>
              <p className="mt-2 text-xs text-muted">{c.shortDescription}</p>
              <div className="mt-3 flex items-center gap-2">
                <Badge>{DIFFICULTY_LABEL[c.difficulty] ?? c.difficulty}</Badge>
                <span className="text-xs text-muted">{c.estimatedHours}h · {c._count.modules} módulos</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
