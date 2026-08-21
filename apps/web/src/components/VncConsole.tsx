'use client';

/**
 * Console remoto embutido via iframe. As imagens de VM (dockurr/windows,
 * dorowu/ubuntu-desktop-lxde-vnc) já servem seu próprio HTML/JS de noVNC —
 * não é necessário embutir um cliente noVNC próprio no bundle do Next.
 */
export function VncConsole({ accessUrl }: { accessUrl: string | null }) {
  if (!accessUrl) {
    return (
      <div className="flex h-[560px] items-center justify-center rounded-lg border border-border bg-black text-xs text-muted">
        Aguardando ambiente…
      </div>
    );
  }
  return (
    <iframe
      src={accessUrl}
      title="Console remoto do laboratório"
      className="h-[560px] w-full rounded-lg border border-border bg-black"
      allow="clipboard-read; clipboard-write; fullscreen"
    />
  );
}
