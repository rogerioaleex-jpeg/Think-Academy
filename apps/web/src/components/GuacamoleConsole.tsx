'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Console RDP via Apache Guacamole. Diferente do `VncConsole` (que embute
 * `accessUrl` direto), aqui a URL precisa de um token de sessão FRESCO —
 * o Guacamole expira tokens por inatividade, então nunca persistimos um na
 * instância; buscamos um novo em `GET /labs/instances/:id/rdp-token` a cada
 * vez que o componente monta (e no botão "Reconectar").
 */
export function GuacamoleConsole({ instanceId }: { instanceId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function fetchUrl() {
    setLoading(true);
    setError('');
    try {
      const { url } = await api<{ url: string }>(`/labs/instances/${instanceId}/rdp-token`);
      setUrl(url);
    } catch (e) {
      setError((e as Error).message);
      setUrl(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId]);

  if (loading) {
    return (
      <div className="flex h-[560px] items-center justify-center rounded-lg border border-border bg-black text-xs text-muted">
        Conectando ao console RDP…
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="flex h-[560px] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-black text-xs text-muted">
        <p>{error || 'Console RDP ainda não disponível.'}</p>
        <button onClick={fetchUrl} className="rounded-lg bg-surface2 px-3 py-1.5 text-xs text-ink">
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div>
      <iframe
        src={url}
        title="Console RDP do laboratório"
        className="h-[560px] w-full rounded-lg border border-border bg-black"
        allow="clipboard-read; clipboard-write; fullscreen"
      />
      <button onClick={fetchUrl} className="mt-2 rounded-lg bg-surface2 px-3 py-1.5 text-xs text-muted">
        Reconectar
      </button>
    </div>
  );
}
