/**
 * Resolve como reproduzir a URL de um vídeo de aula: embute o player nativo
 * do YouTube/Vimeo quando reconhece o link, usa <video> para um arquivo
 * direto (mp4/webm/ogg), ou cai para um link externo simples no restante.
 */
export type VideoEmbed =
  | { kind: 'iframe'; src: string }
  | { kind: 'video'; src: string }
  | { kind: 'link'; src: string };

export function resolveVideoEmbed(url: string): VideoEmbed {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { kind: 'link', src: url };
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');

  if (host === 'youtube.com' || host === 'youtu.be') {
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/embed/')[1] ?? '';
    else id = u.searchParams.get('v') ?? '';
    if (id) return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}` };
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.split('/').filter(Boolean).pop();
    if (id && /^\d+$/.test(id)) return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` };
  }

  if (/\.(mp4|webm|ogg|ogv|mov)$/i.test(u.pathname)) {
    return { kind: 'video', src: url };
  }

  return { kind: 'link', src: url };
}

export const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: 'Fácil', MEDIUM: 'Médio', HARD: 'Difícil', EXPERT: 'Especialista',
};

export const LESSON_TYPE_ICON: Record<string, string> = {
  VIDEO: '▶', TEXT: '📄', MATERIAL: '📎', QUIZ: '❓', LAB: '🧪', CHALLENGE: '🏁',
};
