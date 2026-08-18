'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, Button, Badge } from '@/components/ui';

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState({ prompt: '', category: 'SOC', difficulty: 'MEDIUM', explanation: '' });
  const [opts, setOpts] = useState([{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }]);
  const [csv, setCsv] = useState('prompt,category,difficulty,optA,optB,optC,optD,correctIndex,explanation\n');
  const [examTitle, setExamTitle] = useState('Novo Simulado');
  const [examCsv, setExamCsv] = useState('prompt,category,difficulty,optA,optB,optC,optD,correctIndex,explanation\n');

  function load() { api<any[]>('/admin/exams/questions').then(setQuestions).catch(() => {}); }
  useEffect(load, []);

  async function importToExam() {
    try {
      const res = await api<{ examId: string; created: number; errors: string[] }>('/admin/exams/import-to-exam', {
        method: 'POST', body: JSON.stringify({ examTitle, csv: examCsv }),
      });
      setMsg(`Prova criada (${res.created} questões). ${res.errors.length ? 'Erros: ' + res.errors.join('; ') : ''}`);
      load();
    } catch (err) { setMsg((err as Error).message); }
  }

  async function createQuestion(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/exams/questions', {
        method: 'POST',
        body: JSON.stringify({ ...q, options: opts.filter((o) => o.text) }),
      });
      setMsg('Questão criada.'); setQ({ prompt: '', category: q.category, difficulty: 'MEDIUM', explanation: '' });
      setOpts([{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }]);
      load();
    } catch (err) { setMsg((err as Error).message); }
  }

  async function importCsv() {
    try {
      const res = await api<{ created: number; errors: string[] }>('/admin/exams/questions/import', { method: 'POST', body: JSON.stringify({ csv }) });
      setMsg(`Importadas ${res.created} questões. ${res.errors.length ? 'Erros: ' + res.errors.join('; ') : ''}`);
      load();
    } catch (err) { setMsg((err as Error).message); }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold text-ink">Admin · Banco de questões</h1>
      <p className="mb-6 text-xs text-muted">Criar questões, importar por CSV e alimentar as provas/simulados.</p>
      {msg && <p className="mb-4 rounded-lg bg-surface2 px-3 py-2 text-xs text-brand">{msg}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink">Nova questão</h2>
          <form onSubmit={createQuestion} className="flex flex-col gap-3 text-xs text-muted">
            <label>Enunciado
              <textarea value={q.prompt} onChange={(e) => setQ({ ...q, prompt: e.target.value })} required rows={2}
                className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
            </label>
            <div className="flex gap-3">
              <label className="flex-1">Categoria
                <input value={q.category} onChange={(e) => setQ({ ...q, category: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
              </label>
              <label className="flex-1">Dificuldade
                <select value={q.difficulty} onChange={(e) => setQ({ ...q, difficulty: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink">
                  {['EASY', 'MEDIUM', 'HARD', 'EXPERT'].map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
            </div>
            {opts.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={o.isCorrect}
                  onChange={() => setOpts(opts.map((x, j) => ({ ...x, isCorrect: j === i })))} />
                <input value={o.text} placeholder={`Alternativa ${i + 1}`}
                  onChange={(e) => setOpts(opts.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  className="flex-1 rounded-lg border border-border bg-surface2 px-3 py-1.5 text-ink" />
              </div>
            ))}
            <label>Explicação
              <input value={q.explanation} onChange={(e) => setQ({ ...q, explanation: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-ink" />
            </label>
            <Button type="submit">Criar questão</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink">Importar por CSV</h2>
          <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={8}
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 font-mono text-[11px] text-ink" />
          <Button className="mt-3" onClick={importCsv}>Importar</Button>
          <p className="mt-2 text-[11px] text-muted">Colunas: prompt, category, difficulty, optA..optD, correctIndex (0-3), explanation.</p>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">CSV → nova prova (em um passo)</h2>
        <p className="mb-3 text-xs text-muted">Cria a prova, importa as questões do CSV e já anexa todas a ela.</p>
        <input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder="Título da prova"
          className="mb-2 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-ink" />
        <textarea value={examCsv} onChange={(e) => setExamCsv(e.target.value)} rows={6}
          className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 font-mono text-[11px] text-ink" />
        <Button className="mt-3" onClick={importToExam}>Criar prova a partir do CSV</Button>
      </Card>

      <Card className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Banco atual ({questions.length})</h2>
        <ul className="flex flex-col gap-2">
          {questions.map((qq) => (
            <li key={qq.id} className="flex items-center justify-between border-b border-border pb-2 text-sm">
              <span className="text-ink">{qq.prompt}</span>
              <span className="flex gap-2"><Badge>{qq.category ?? '—'}</Badge><Badge>{qq.difficulty}</Badge></span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
