'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, Button, Badge } from '@/components/ui';

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [competencyCatalog, setCompetencyCatalog] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', shortDescription: '', difficulty: 'EASY', estimatedHours: 8, categoryId: '' });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  function load() { api<any[]>('/courses/admin/all').then(setCourses).catch(() => {}); }
  useEffect(() => {
    load();
    api<any[]>('/categories').then(setCats).catch(() => {});
    api<any[]>('/exams').then(setExams).catch(() => {});
    api<any[]>('/competencies').then(setCompetencyCatalog).catch(() => {});
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/courses', {
        method: 'POST',
        body: JSON.stringify({ ...form, slug: slugify(form.title), categoryId: form.categoryId || undefined }),
      });
      setMsg('Curso criado (rascunho).'); setForm({ title: '', shortDescription: '', difficulty: 'EASY', estimatedHours: 8, categoryId: '' }); load();
    } catch (err) { setMsg((err as Error).message); }
  }

  async function togglePublish(c: any) {
    const publish = c.status !== 'PUBLISHED';
    await api(`/courses/${c.id}/publish?published=${publish}`, { method: 'POST' });
    load();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold text-ink">Admin · Cursos</h1>
      <p className="mb-6 text-xs text-muted">Criar, publicar e estruturar cursos, módulos e aulas.</p>
      {msg && <p className="mb-4 rounded-lg bg-surface2 px-3 py-2 text-xs text-brand">{msg}</p>}

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Novo curso</h2>
        <form onSubmit={create} className="grid gap-3 md:grid-cols-2 text-xs text-muted">
          <label className="md:col-span-2">Título
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
              className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
          </label>
          <label className="md:col-span-2">Descrição curta
            <input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
          </label>
          <label>Dificuldade
            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink">
              {['EASY', 'MEDIUM', 'HARD', 'EXPERT'].map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label>Categoria
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink">
              <option value="">—</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Horas estimadas
            <input type="number" value={form.estimatedHours} onChange={(e) => setForm({ ...form, estimatedHours: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
          </label>
          <div className="flex items-end"><Button type="submit" className="w-full">Criar</Button></div>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {courses.map((c) => (
          <Card key={c.id}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-ink">{c.title}</span>
                <span className="ml-2"><Badge>{c.status}</Badge></span>
                <span className="ml-2 text-xs text-muted">{c._count?.modules ?? 0} módulos · {c._count?.enrollments ?? 0} matrículas</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  className="rounded-lg bg-surface2 px-3 py-1.5 text-xs text-muted">Estruturar</button>
                <button onClick={() => togglePublish(c)}
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs text-white">{c.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}</button>
              </div>
            </div>
            {expanded === c.id && <CourseStructure courseId={c.id} exams={exams} competencyCatalog={competencyCatalog} onChange={load} />}
          </Card>
        ))}
      </div>
    </div>
  );
}

function CourseStructure({ courseId, exams, competencyCatalog, onChange }: { courseId: string; exams: any[]; competencyCatalog: any[]; onChange: () => void }) {
  const [moduleTitle, setModuleTitle] = useState('');
  const [modules, setModules] = useState<any[]>([]);
  const [finalExam, setFinalExam] = useState<any>(null);
  const [examChoice, setExamChoice] = useState('');
  const [outcomes, setOutcomes] = useState('');
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([]);
  const [tagsText, setTagsText] = useState('');
  const [msg, setMsg] = useState('');

  function reload() {
    api<any>(`/courses/${courseId}`).then((c) => {
      setModules(c.modules ?? []);
      setFinalExam(c.finalExam ?? null);
      setOutcomes((c.learningOutcomes ?? []).join('\n'));
      setSelectedCompetencies((c.competencies ?? []).map((cc: any) => cc.competency.id));
      setTagsText((c.tags ?? []).map((t: any) => t.tag.name).join(', '));
    }).catch(() => {});
  }
  useEffect(reload, [courseId]);

  async function saveOutcomes() {
    const learningOutcomes = outcomes.split('\n').map((l) => l.trim()).filter(Boolean);
    await api(`/courses/${courseId}`, { method: 'PATCH', body: JSON.stringify({ learningOutcomes }) });
    setMsg('"O que você vai aprender" atualizado.'); reload();
  }
  function toggleCompetency(id: string) {
    setSelectedCompetencies((sel) => sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  }
  async function saveCompetencies() {
    await api(`/courses/${courseId}/competencies`, { method: 'POST', body: JSON.stringify({ competencyIds: selectedCompetencies }) });
    setMsg('Competências atualizadas.'); reload();
  }
  async function saveTags() {
    const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
    await api(`/courses/${courseId}/tags`, { method: 'POST', body: JSON.stringify({ tags }) });
    setMsg('Tags atualizadas.'); reload();
  }

  async function addModule() {
    if (!moduleTitle) return;
    await api(`/courses/${courseId}/modules`, { method: 'POST', body: JSON.stringify({ title: moduleTitle }) });
    setModuleTitle(''); reload(); onChange();
  }
  async function addLesson(moduleId: string, title: string, videoId?: string) {
    await api(`/courses/modules/${moduleId}/lessons`, { method: 'POST', body: JSON.stringify({ title, videoId: videoId || undefined }) });
    reload();
  }
  async function registerVideo(title: string, externalUrl: string): Promise<string> {
    const v = await api<{ id: string }>('/videos', { method: 'POST', body: JSON.stringify({ title, externalUrl }) });
    setMsg(`Vídeo vinculado (YouTube/Vimeo/link direto).`);
    return v.id;
  }
  async function linkExam() {
    if (!examChoice) return;
    await api(`/courses/${courseId}`, { method: 'PATCH', body: JSON.stringify({ finalExamId: examChoice }) });
    setExamChoice(''); setMsg('Prova final vinculada.'); reload();
  }
  async function unlinkExam() {
    await api(`/courses/${courseId}`, { method: 'PATCH', body: JSON.stringify({ finalExamId: null }) });
    setMsg('Prova final removida.'); reload();
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-3 flex gap-2">
        <input value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder="Novo módulo"
          className="flex-1 rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-ink" />
        <Button onClick={addModule}>+ Módulo</Button>
      </div>
      {modules.map((m) => (
        <ModuleRow key={m.id} module={m} onAddLesson={addLesson} onRegisterVideo={registerVideo} />
      ))}

      <div className="mt-4 rounded-lg bg-surface2/50 p-3">
        <p className="mb-2 text-sm font-medium text-ink">Prova final (aplicada ao concluir o curso)</p>
        {finalExam ? (
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Vinculada: <b className="text-ink">{finalExam.title}</b> · nota mínima {finalExam.passScorePct}%</span>
            <button onClick={unlinkExam} className="rounded-lg bg-surface2 px-3 py-1.5 text-xs text-danger">Remover</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select value={examChoice} onChange={(e) => setExamChoice(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink">
              <option value="">Selecione uma prova do banco…</option>
              {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
            <button onClick={linkExam} className="rounded-lg bg-brand px-3 py-1.5 text-xs text-white">Vincular</button>
          </div>
        )}
        {exams.length === 0 && !finalExam && (
          <p className="mt-2 text-[11px] text-muted">Nenhuma prova no banco ainda — crie uma em Admin · Banco de questões.</p>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-surface2/50 p-3">
        <p className="mb-2 text-sm font-medium text-ink">O que o aluno vai aprender (uma linha por item)</p>
        <textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} rows={4}
          placeholder={'Investigar incidentes de segurança com SIEM\nEscrever consultas KQL para caça a ameaças\n...'}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink" />
        <Button onClick={saveOutcomes} className="mt-2 px-3 py-1.5 text-xs">Salvar</Button>
      </div>

      <div className="mt-4 rounded-lg bg-surface2/50 p-3">
        <p className="mb-2 text-sm font-medium text-ink">Competências desenvolvidas</p>
        <div className="flex flex-wrap gap-2">
          {competencyCatalog.map((c) => (
            <label key={c.id} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
              selectedCompetencies.includes(c.id) ? 'border-brand bg-[#EFF6F5] text-brand' : 'border-border text-muted'
            }`}>
              <input type="checkbox" className="hidden" checked={selectedCompetencies.includes(c.id)} onChange={() => toggleCompetency(c.id)} />
              {c.name}
            </label>
          ))}
        </div>
        {competencyCatalog.length === 0 && <p className="text-[11px] text-muted">Nenhuma competência cadastrada.</p>}
        <Button onClick={saveCompetencies} className="mt-2 px-3 py-1.5 text-xs">Salvar competências</Button>
      </div>

      <div className="mt-4 rounded-lg bg-surface2/50 p-3">
        <p className="mb-2 text-sm font-medium text-ink">Tags / temas relacionados (separados por vírgula)</p>
        <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="SIEM, Threat Hunting, Blue Team…"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink" />
        <Button onClick={saveTags} className="mt-2 px-3 py-1.5 text-xs">Salvar tags</Button>
      </div>

      {msg && <p className="mt-2 text-xs text-brand">{msg}</p>}
    </div>
  );
}

function ModuleRow({ module, onAddLesson, onRegisterVideo }: any) {
  const [lessonTitle, setLessonTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="mb-3 rounded-lg bg-surface2/50 p-3">
      <p className="mb-2 text-sm font-medium text-ink">{module.title}</p>
      <ul className="mb-2 flex flex-col gap-1 text-xs text-muted">
        {module.lessons?.map((l: any) => <li key={l.id}>• {l.title} {l.video ? '▶' : ''}</li>)}
      </ul>
      <div className="flex items-center gap-2">
        <input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="Nova aula"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink" />
        <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Link do vídeo (YouTube, Vimeo… opcional)"
          className="flex-[1.3] rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink" />
        <button
          onClick={async () => {
            if (!lessonTitle) return;
            setErr('');
            try {
              const videoId = videoUrl ? await onRegisterVideo(lessonTitle, videoUrl) : undefined;
              await onAddLesson(module.id, lessonTitle, videoId);
              setLessonTitle(''); setVideoUrl('');
            } catch (e) { setErr((e as Error).message); }
          }}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs text-white">+ Aula</button>
      </div>
      {err && <p className="mt-2 text-[11px] text-danger">{err}</p>}
    </div>
  );
}
