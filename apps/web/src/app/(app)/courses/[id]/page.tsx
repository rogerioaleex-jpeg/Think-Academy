'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, SectionHeader, Badge, Button, Progress } from '@/components/ui';
import { DIFFICULTY_LABEL, LESSON_TYPE_ICON, resolveVideoEmbed } from '@/lib/video';

interface Video { id: string; title: string; externalUrl: string | null; storageKey: string | null; durationSec: number }
interface Lesson { id: string; title: string; description: string | null; type: string; video: Video | null }
interface Module { id: string; title: string; description: string | null; lessons: Lesson[] }
interface Course {
  id: string; title: string; shortDescription: string | null; description: string | null;
  difficulty: string; estimatedHours: number; modules: Module[];
}
interface MyProgress {
  enrolled: boolean; progressPct: number;
  lessons: { lessonId: string; completed: boolean; watchedPct: number }[];
}
interface Playback { videoId: string; title: string; durationSec: number; external: boolean; url: string }

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<MyProgress | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  function load() {
    Promise.all([
      api<Course>(`/courses/${id}`),
      api<MyProgress>(`/courses/${id}/my-progress`).catch(() => ({ enrolled: false, progressPct: 0, lessons: [] })),
    ]).then(([c, p]) => {
      setCourse(c); setProgress(p);
      setSelectedLessonId((prev) => prev ?? c.modules[0]?.lessons[0]?.id ?? null);
    }).catch((e) => setMsg((e as Error).message));
  }
  useEffect(load, [id]);

  const selectedLesson = useMemo(() => {
    if (!course || !selectedLessonId) return null;
    for (const m of course.modules) {
      const l = m.lessons.find((x) => x.id === selectedLessonId);
      if (l) return l;
    }
    return null;
  }, [course, selectedLessonId]);

  useEffect(() => {
    setPlayback(null);
    if (selectedLesson?.video) {
      api<Playback>(`/videos/${selectedLesson.video.id}/playback`).then(setPlayback).catch(() => {});
    }
  }, [selectedLesson]);

  const progressByLesson = useMemo(() => {
    const map = new Map<string, boolean>();
    progress?.lessons.forEach((l) => map.set(l.lessonId, l.completed));
    return map;
  }, [progress]);

  async function enroll() {
    setBusy(true);
    try { await api(`/courses/${id}/enroll`, { method: 'POST' }); setMsg('Matrícula confirmada.'); load(); }
    catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  }

  async function markComplete() {
    if (!selectedLesson) return;
    setBusy(true);
    try {
      if (!progress?.enrolled) await api(`/courses/${id}/enroll`, { method: 'POST' }).catch(() => {});
      await api(`/courses/lessons/${selectedLesson.id}/progress`, { method: 'POST', body: JSON.stringify({ watchedPct: 100 }) });
      setMsg('Aula marcada como concluída.'); load();
    } catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  }

  if (msg && !course) return <p className="text-sm text-danger">{msg}</p>;
  if (!course) return <p className="text-sm text-muted">Carregando curso…</p>;

  const totalLessons = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const embed = playback ? resolveVideoEmbed(playback.url) : null;
  const done = selectedLesson ? progressByLesson.get(selectedLesson.id) : false;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <SectionHeader kicker="Curso" title={course.title} subtitle={course.shortDescription ?? undefined} />
        {progress?.enrolled ? (
          <div className="w-40 shrink-0 text-right">
            <span className="text-xs font-semibold text-brand">{progress.progressPct}% concluído</span>
            <Progress value={progress.progressPct} />
          </div>
        ) : (
          <Button onClick={enroll} disabled={busy} className="shrink-0">Matricular</Button>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Badge>{DIFFICULTY_LABEL[course.difficulty] ?? course.difficulty}</Badge>
        <span className="text-xs text-muted">{course.estimatedHours}h · {course.modules.length} módulos · {totalLessons} aulas</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <div className="flex flex-col gap-3">
          {course.modules.map((m, i) => (
            <Card key={m.id}>
              <b className="text-xs text-ink">{i + 1}. {m.title}</b>
              <div className="mt-2 flex flex-col gap-0.5">
                {m.lessons.map((l) => {
                  const active = l.id === selectedLessonId;
                  const completed = progressByLesson.get(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => setSelectedLessonId(l.id)}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                        active ? 'bg-[#EFF6F5] text-brand' : 'text-gray hover:bg-surface2'
                      }`}
                    >
                      <span>{LESSON_TYPE_ICON[l.type] ?? '•'}</span>
                      <span className="flex-1">{l.title}</span>
                      {completed && <span className="text-brand">✔</span>}
                    </button>
                  );
                })}
                {m.lessons.length === 0 && <p className="px-2 py-1 text-xs text-muted">Sem aulas ainda.</p>}
              </div>
            </Card>
          ))}
          {course.modules.length === 0 && <p className="text-sm text-muted">Este curso ainda não tem módulos.</p>}
        </div>

        <Card className="self-start">
          {!selectedLesson && <p className="text-sm text-muted">Selecione uma aula ao lado.</p>}
          {selectedLesson && (
            <>
              <h2 className="text-lg font-bold text-ink">{selectedLesson.title}</h2>
              {selectedLesson.description && <p className="mt-1 text-sm text-muted">{selectedLesson.description}</p>}

              <div className="mt-4 aspect-video overflow-hidden rounded-lg bg-[#101317]">
                {!selectedLesson.video && (
                  <div className="flex h-full items-center justify-center text-xs text-[#c7ccd2]">
                    Sem vídeo cadastrado para esta aula.
                  </div>
                )}
                {selectedLesson.video && !playback && (
                  <div className="flex h-full items-center justify-center text-xs text-[#c7ccd2]">Carregando vídeo…</div>
                )}
                {embed?.kind === 'iframe' && (
                  <iframe src={embed.src} className="h-full w-full" allowFullScreen title={selectedLesson.title} />
                )}
                {embed?.kind === 'video' && (
                  <video src={embed.src} controls className="h-full w-full" />
                )}
                {embed?.kind === 'link' && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-[#c7ccd2]">
                    <span>Não foi possível incorporar este link.</span>
                    <a href={embed.src} target="_blank" rel="noreferrer" className="text-brand underline">Abrir vídeo em nova aba ↗</a>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button onClick={markComplete} disabled={busy || !!done}>
                  {done ? 'Aula concluída ✔' : 'Marcar como concluída'}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
      {msg && <p className="mt-4 text-xs text-brand">{msg}</p>}
    </div>
  );
}
