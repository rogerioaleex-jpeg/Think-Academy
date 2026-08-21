'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, Badge, Button } from '@/components/ui';
import { VncConsole } from '@/components/VncConsole';

export default function LabConsolePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <LabConsole />
    </Suspense>
  );
}

function LabConsole() {
  const params = useSearchParams();
  const router = useRouter();
  const instanceId = params.get('instance');
  const [instance, setInstance] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    if (!instanceId) return;
    api(`/labs/instances/${instanceId}`).then(setInstance).catch((e) => setMsg((e as Error).message));
  }

  useEffect(load, [instanceId]);
  useEffect(() => {
    if (!instanceId) return;
    const t = setInterval(load, 5000); // polling simples — sem infra de readiness dedicada
    return () => clearInterval(t);
  }, [instanceId]);

  async function submit(challengeId: string) {
    const answer = answers[challengeId];
    if (!answer) return;
    try {
      await api(`/labs/instances/${instanceId}/submit`, { method: 'POST', body: JSON.stringify({ challengeId, answer }) });
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function reset() {
    setBusy(true);
    try {
      await api(`/labs/instances/${instanceId}/reset`, { method: 'POST' });
      load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function destroy() {
    setBusy(true);
    try {
      await api(`/labs/instances/${instanceId}/destroy`, { method: 'POST' });
      router.push('/labs');
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(false);
    }
  }

  if (!instanceId) return <p className="text-sm text-danger">Instância não informada.</p>;
  if (!instance) return <p className="text-sm text-muted">Carregando…</p>;

  const solved = new Set(instance.submissions.map((s: any) => s.challengeId));
  const isVm = instance.lab.driver === 'VM';

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Badge>{instance.lab.category}</Badge>
          <h1 className="mt-2 text-xl font-bold text-ink">{instance.lab.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={reset} disabled={busy}>Resetar</Button>
          <Button onClick={destroy} disabled={busy} className="bg-danger">Destruir</Button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">
        Status: <b>{instance.status}</b>
        {instance.expiresAt && <> · expira em {new Date(instance.expiresAt).toLocaleTimeString('pt-BR')}</>}
      </p>

      {isVm && (
        <Card className="mt-4">
          {instance.status !== 'RUNNING' && <p className="text-xs text-muted">Provisionando ambiente…</p>}
          {instance.status === 'RUNNING' && !instance.accessUrl && (
            <p className="text-xs text-muted">Aguardando o driver publicar o acesso remoto…</p>
          )}
          {instance.status === 'RUNNING' && instance.accessUrl && (
            <>
              {instance.osType === 'WINDOWS10' && (
                <p className="mb-2 text-[11px] text-brand">
                  Ambientes Windows completos podem levar de 5 a 15 minutos para iniciar na primeira execução
                  (download do sistema). Se a tela ficar preta, aguarde — ela reconecta automaticamente.
                </p>
              )}
              <VncConsole accessUrl={instance.accessUrl} />
            </>
          )}
        </Card>
      )}

      <Card className="mt-4">
        <h2 className="mb-2 text-sm font-bold text-ink">Desafios</h2>
        {instance.lab.challenges.map((c: any) => (
          <div key={c.id} className="mb-2 flex gap-2">
            <input
              disabled={solved.has(c.id)}
              placeholder={solved.has(c.id) ? 'resolvido ✔' : c.title}
              value={answers[c.id] ?? ''}
              onChange={(e) => setAnswers({ ...answers, [c.id]: e.target.value })}
              className="flex-1 rounded-lg border border-border bg-surface2 px-3 py-2 text-xs text-ink"
            />
            <Button onClick={() => submit(c.id)} disabled={solved.has(c.id)}>Enviar</Button>
          </div>
        ))}
        {instance.lab.challenges.length === 0 && <p className="text-xs text-muted">Nenhum desafio cadastrado.</p>}
      </Card>

      {msg && <p className="mt-3 text-xs text-brand">{msg}</p>}
    </div>
  );
}
