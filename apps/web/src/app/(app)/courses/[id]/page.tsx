'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { Card, Badge, Button, Progress } from '@/components/ui';
import { FinalExamPanel } from '@/components/FinalExamPanel';
import { DIFFICULTY_LABEL, LESSON_TYPE_ICON, resolveVideoEmbed } from '@/lib/video';

interface Video { id: string; title: string; externalUrl: string | null; storageKey: string | null; durationSec: number }
interface LessonExam { id: string; title: string; questionCount: number; durationMin: number; passScorePct: number }
interface Lesson {
  id: string; title: string; description: string | null; type: string; video: Video | null;
  content: string | null; exam: LessonExam | null;
}
interface Module { id: string; title: string; description: string | null; lessons: Lesson[] }
interface FinalExam { id: string; title: string; passScorePct: number; questionCount: number; durationMin: number }
interface Course {
  id: string; title: string; shortDescription: string | null; description: string | null;
  difficulty: string; estimatedHours: number; thumbnailUrl: string | null; updatedAt: string;
  modules: Module[]; finalExam: FinalExam | null;
  instructor: { id: string; name: string } | null;
  category: { name: string } | null;
  learningOutcomes: string[];
  tags: { tag: { id: string; name: string } }[];
  competencies: { competency: { id: string; name: string } }[];
  _count: { enrollments: number };
}
interface MyProgress {
  enrolled: boolean; progressPct: number;
  lessons: { lessonId: string; completed: boolean; watchedPct: number }[];
}
interface Playback { videoId: string; title: string; durationSec: number; external: boolean; url: string }

function formatDuration(totalSec: number): string {
  if (totalSec <= 0) return '0 min';
  const h = Math.floor(totalSec / 3600);
  const m = Math.round((totalSec % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
}
function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
function formatMonthYear(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<MyProgress | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  function load() {
    Promise.all([
      api<Course>(`/courses/${id}`),
      api<MyProgress>(`/courses/${id}/my-progress`).catch(() => ({ enrolled: false, progressPct: 0, lessons: [] })),
    ]).then(([raw, p]) => {
      // Normaliza: se a API estiver numa versão anterior (deploy ainda não
      // propagado), esses campos vêm ausentes — evita quebrar a tela.
      const c: Course = {
        ...raw,
        modules: raw.modules ?? [],
        tags: raw.tags ?? [],
        competencies: raw.competencies ?? [],
        learningOutcomes: raw.learningOutcomes ?? [],
        _count: raw._count ?? { enrollments: 0 },
      };
      setCourse(c); setProgress(p);
      setSelectedLessonId((prev) => prev ?? c.modules[0]?.lessons[0]?.id ?? null);
      setOpenModuleId((prev) => prev ?? c.modules[0]?.id ?? null);
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
  const totalDurationSec = course.modules.reduce((n, m) => n + m.lessons.reduce((s, l) => s + (l.video?.durationSec ?? 0), 0), 0);
  const embed = playback ? resolveVideoEmbed(playback.url) : null;
  const done = selectedLesson ? progressByLesson.get(selectedLesson.id) : false;

  return (
    <div>
      {/* Hero */}
      <div className="rounded-2xl bg-dark p-6 text-white md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            {course.category && <Badge>{course.category.name}</Badge>}
            <h1 className="mt-3 text-2xl font-extrabold leading-tight md:text-3xl">{course.title}</h1>
            {course.shortDescription && <p className="mt-3 text-sm text-[#c7ccd2] md:text-base">{course.shortDescription}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#c7ccd2]">
              <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold text-white">{DIFFICULTY_LABEL[course.difficulty] ?? course.difficulty}</span>
              <span>{course._count.enrollments} aluno{course._count.enrollments === 1 ? '' : 's'}</span>
              {course.instructor && <span>Criado por <b className="text-white">{course.instructor.name}</b></span>}
              <span>Atualizado em {formatMonthYear(course.updatedAt)}</span>
            </div>
          </div>

          <Card className="h-fit">
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt={course.title} className="mb-3 aspect-video w-full rounded-lg object-cover" />
            ) : (
              <div className="mb-3 flex aspect-video w-full items-center justify-center rounded-lg bg-gradient-to-br from-brand to-dark text-3xl text-white">▶</div>
            )}
            {progress?.enrolled ? (
              <div>
                <span className="text-xs font-semibold text-brand">{progress.progressPct}% concluído</span>
                <Progress value={progress.progressPct} />
              </div>
            ) : (
              <Button onClick={enroll} disabled={busy} className="w-full">Matricular</Button>
            )}
            <p className="mb-2 mt-4 text-xs font-bold text-ink">Este curso inclui:</p>
            <ul className="flex flex-col gap-1.5 text-xs text-gray">
              <li>▶ {formatDuration(totalDurationSec)} de vídeo sob demanda</li>
              <li>📖 {totalLessons} aula{totalLessons === 1 ? '' : 's'} em {course.modules.length} módulo{course.modules.length === 1 ? '' : 's'}</li>
              {course.finalExam && <li>📝 Avaliação final</li>}
              <li>📱 Acesso pelo computador e celular</li>
              <li>🏆 Certificado de conclusão</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* O que você vai aprender */}
      {course.learningOutcomes.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-3 text-lg font-bold text-ink">O que você vai aprender</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {course.learningOutcomes.map((o, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray">
                <span className="mt-0.5 text-brand">✔</span><span>{o}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Competências desenvolvidas */}
      {course.competencies.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-3 text-lg font-bold text-ink">Competências desenvolvidas</h2>
          <div className="flex flex-wrap gap-2">
            {course.competencies.map((c) => <Badge key={c.competency.id}>{c.competency.name}</Badge>)}
          </div>
        </Card>
      )}

      {/* Conteúdo do curso */}
      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Conteúdo do curso</h2>
          <span className="text-xs text-muted">
            {course.modules.length} seç{course.modules.length === 1 ? 'ão' : 'ões'} · {totalLessons} aula{totalLessons === 1 ? '' : 's'} · {formatDuration(totalDurationSec)}
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
          <div className="flex flex-col gap-2">
            {course.modules.map((m, i) => {
              const open = openModuleId === m.id;
              const moduleDurationSec = m.lessons.reduce((s, l) => s + (l.video?.durationSec ?? 0), 0);
              return (
                <div key={m.id} className="overflow-hidden rounded-lg border border-border">
                  <button
                    onClick={() => setOpenModuleId(open ? null : m.id)}
                    className="flex w-full items-center justify-between bg-surface2 px-3 py-2 text-left"
                  >
                    <span className="text-xs font-semibold text-ink">{open ? '▾' : '▸'} {i + 1}. {m.title}</span>
                    <span className="text-[11px] text-muted">{m.lessons.length} aula{m.lessons.length === 1 ? '' : 's'} · {formatDuration(moduleDurationSec)}</span>
                  </button>
                  {open && (
                    <div className="flex flex-col gap-0.5 p-2">
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
                            {l.video && <span className="text-[11px] text-muted">{formatClock(l.video.durationSec)}</span>}
                            {completed && <span className="text-brand">✔</span>}
                          </button>
                        );
                      })}
                      {m.lessons.length === 0 && <p className="px-2 py-1 text-xs text-muted">Sem aulas ainda.</p>}
                    </div>
                  )}
                </div>
              );
            })}
            {course.modules.length === 0 && <p className="text-sm text-muted">Este curso ainda não tem módulos.</p>}
          </div>

          <Card className="self-start">
            {!selectedLesson && <p className="text-sm text-muted">Selecione uma aula ao lado.</p>}
            {selectedLesson && (
              <>
                <h3 className="text-base font-bold text-ink">{selectedLesson.title}</h3>
                {selectedLesson.description && <p className="mt-1 text-sm text-muted">{selectedLesson.description}</p>}

                {/* TEXT (capítulo de ebook): renderiza o markdown direto, sem área de vídeo. */}
                {selectedLesson.type === 'TEXT' && selectedLesson.content && (
                  <div className="prose prose-sm mt-4 max-w-none text-ink prose-headings:text-ink prose-a:text-brand prose-strong:text-ink prose-table:text-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedLesson.content}</ReactMarkdown>
                  </div>
                )}

                {/* QUIZ (lista de perguntas de fim de módulo): reaproveita o mesmo painel da prova final. */}
                {selectedLesson.type === 'QUIZ' && selectedLesson.exam && (
                  <div className="mt-4">
                    <FinalExamPanel
                      exam={selectedLesson.exam}
                      unlocked
                      heading="Questões deste módulo"
                      unlockedHint="Responda as questões abaixo para revisar o conteúdo do módulo."
                    />
                  </div>
                )}

                {/* VIDEO (padrão) — só mostra a área de player quando não é TEXT/QUIZ com conteúdo próprio. */}
                {!(selectedLesson.type === 'TEXT' && selectedLesson.content) && !(selectedLesson.type === 'QUIZ' && selectedLesson.exam) && (
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
                )}

                <div className="mt-4 flex items-center gap-2">
                  <Button onClick={markComplete} disabled={busy || !!done}>
                    {done ? 'Aula concluída ✔' : 'Marcar como concluída'}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </Card>

      {course.finalExam && (
        <FinalExamPanel
          exam={course.finalExam}
          unlocked={totalLessons > 0 && course.modules.every((m) => m.lessons.every((l) => progressByLesson.get(l.id)))}
        />
      )}

      {/* Temas relacionados */}
      {course.tags.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink">Explorar temas relacionados</h2>
          <div className="flex flex-wrap gap-2">
            {course.tags.map((t) => <Badge key={t.tag.id}>{t.tag.name}</Badge>)}
          </div>
        </Card>
      )}

      {msg && <p className="mt-4 text-xs text-brand">{msg}</p>}
    </div>
  );
}
