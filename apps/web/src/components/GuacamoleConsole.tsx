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
      {/* Gotcha comum de console remoto embutido: o teclado só funciona
          DEPOIS de um clique dentro da tela (o foco do navegador precisa
          entrar no iframe) — sem esse aviso, "cliquei e digitei mas não
          fez nada" é o relato mais comum de quem nunca usou um console
          assim antes. */}
      <p className="mb-2 text-[11px] text-brand">
        Clique dentro da tela abaixo antes de digitar (o teclado só é capturado depois do clique). Para abrir um
        terminal na área de trabalho: clique com o botão direito no fundo da tela e escolha &ldquo;Abrir terminal
        aqui&rdquo; (ou procure o ícone de terminal na barra de tarefas).
      </p>
      <iframe
        src={url}
        title="Console RDP do laboratório"
        className="h-[560px] w-full rounded-lg border border-border bg-black"
        allow="clipboard-read; clipboard-write; fullscreen; pointer-lock"
      />
      <button onClick={fetchUrl} className="mt-2 rounded-lg bg-surface2 px-3 py-1.5 text-xs text-muted">
        Reconectar
      </button>
    </div>
  );
}
