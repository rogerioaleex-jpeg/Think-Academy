'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Card, Button } from '@/components/ui';

interface ExamMeta { id: string; title: string; passScorePct: number; questionCount: number; durationMin: number }
interface AttemptQuestion { id: string; prompt: string; type: string; options: { id: string; text: string }[] }
interface Attempt { attemptId: string; expiresAt: string | null; durationMin: number; passScorePct: number; questions: AttemptQuestion[] }
interface ReviewItem { questionId: string; correct: boolean; correctOptionId: string | null; explanation: string | null }
interface Result { attemptId: string; scorePct: number; passed: boolean; expired: boolean; correct: number; total: number; passScorePct: number; review: ReviewItem[] }

/**
 * Painel de prova genérico: inicia a tentativa, coleta respostas e mostra o
 * resultado corrigido. Usado tanto pra avaliação final do curso quanto pro
 * quiz de fim de módulo (mesma mecânica de /exams — só muda o título/copy).
 */
export function FinalExamPanel({
  exam,
  unlocked,
  heading = 'Avaliação final',
  unlockedHint = 'Conclua todas as aulas para liberar a prova final (você já pode tentar antes, se preferir).',
}: { exam: ExamMeta; unlocked: boolean; heading?: string; unlockedHint?: string }) {
  const [phase, setPhase] = useState<'intro' | 'running' | 'result'>('intro');
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function start() {
    setBusy(true); setErr('');
    try {
      const a = await api<Attempt>(`/exams/${exam.id}/start`, { method: 'POST' });
      setAttempt(a); setAnswers({}); setPhase('running');
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!attempt) return;
    setBusy(true); setErr('');
    try {
      const body = { answers: attempt.questions.map((q) => ({ questionId: q.id, selectedOptionId: answers[q.id] })) };
      const r = await api<Result>(`/exams/attempts/${attempt.attemptId}/submit`, { method: 'POST', body: JSON.stringify(body) });
      setResult(r); setPhase('result');
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <Card className="mt-5 border-t-4 border-t-brand">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-brand">{heading}</h2>
          <p className="mt-1 text-lg font-bold text-ink">{exam.title}</p>
          <p className="mt-1 text-xs text-muted">
            Nota mínima {exam.passScorePct}%{exam.questionCount ? ` · ${exam.questionCount} questões` : ''}{exam.durationMin ? ` · ${exam.durationMin} min` : ''}
          </p>
        </div>
      </div>

      {phase === 'intro' && (
        <div className="mt-4">
          {!unlocked && (
            <p className="mb-3 text-xs text-muted">{unlockedHint}</p>
          )}
          <Button onClick={start} disabled={busy}>Iniciar prova</Button>
        </div>
      )}

      {phase === 'running' && attempt && (
        <div className="mt-4 flex flex-col gap-4">
          {attempt.questions.map((q, i) => (
            <div key={q.id} className="rounded-lg border border-border p-3">
              <p className="mb-2 text-sm font-semibold text-ink">{i + 1}. {q.prompt}</p>
              <div className="flex flex-col gap-1.5">
                {q.options.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-xs text-gray">
                    <input
                      type="radio" name={q.id} checked={answers[q.id] === o.id}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                    />
                    {o.text}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <Button onClick={submit} disabled={busy} className="self-start">Enviar respostas</Button>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="mt-4">
          <div className={`rounded-lg p-4 text-center ${result.passed ? 'bg-[#EFF6F5]' : 'bg-[#FDECEA]'}`}>
            <p className={`text-3xl font-extrabold ${result.passed ? 'text-brand' : 'text-danger'}`}>{result.scorePct}%</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {result.expired ? 'Tempo esgotado' : result.passed ? 'Aprovado ✔' : 'Não atingiu a nota mínima'}
            </p>
            <p className="mt-1 text-xs text-muted">{result.correct} de {result.total} corretas · nota mínima {result.passScorePct}%</p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {attempt?.questions.map((q, i) => {
              const r = result.review.find((x) => x.questionId === q.id);
              return (
                <div key={q.id} className={`rounded-lg border p-3 text-xs ${r?.correct ? 'border-[#d6e8e6]' : 'border-[#f5c6c2]'}`}>
                  <p className="font-semibold text-ink">{i + 1}. {q.prompt} {r?.correct ? '✔' : '✘'}</p>
                  {r?.explanation && <p className="mt-1 text-muted">{r.explanation}</p>}
                </div>
              );
            })}
          </div>

          {!result.passed && (
            <Button onClick={() => { setPhase('intro'); setResult(null); }} className="mt-4">Tentar novamente</Button>
          )}
        </div>
      )}

      {err && <p className="mt-3 text-xs text-danger">{err}</p>}
    </Card>
  );
}
