/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';
const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';
// Domínio wildcard do "lab plane" (ex.: labs.hackerarena.com.br) — MESMO
// valor configurado como LAB_PUBLIC_DOMAIN na API. Necessário pro
// VncConsole/GuacamoleConsole (console de VM embutido via <iframe>, em
// lab-<id>.<dominio> ou guac.<dominio>): sem isso no CSP, o navegador
// bloqueia o iframe/fetch com "Este conteúdo está bloqueado" mesmo com o
// servidor remoto respondendo 200 normalmente — validado em produção.
const labDomain = process.env.LAB_PUBLIC_DOMAIN;

// Content-Security-Policy do frontend. Permite as fontes do Google (Inter,
// JetBrains Mono, Material Symbols) e conexões à API. Em dev libera
// 'unsafe-eval'/websocket para o hot-reload do Next; em produção a policy
// é mais restrita. 'unsafe-inline' em script/style é exigido pelo runtime
// do Next e pelos estilos inline do layout Stitch (endurecer com nonce depois).
const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com data:`,
  `img-src 'self' data: blob:`,
  // https://*.<labDomain>: só pro fetch de sondagem de readiness do console
  // (console/page.tsx) — o WebSocket do próprio Guacamole roda DENTRO do
  // iframe, sob o CSP do documento carregado ali, não o desta página.
  `connect-src 'self' ${apiOrigin}${isDev ? ' ws: wss:' : ''}${labDomain ? ` https://*.${labDomain}` : ''}`,
  // Player de vídeo de aula: embed do YouTube/Vimeo (link externo colado no
  // admin) e <video> apontando pra um arquivo direto em qualquer host https.
  // + console de VM/RDP (*.${labDomain}: lab-<id>.<dominio> e guac.<dominio>).
  `frame-src 'self' https://www.youtube.com https://player.vimeo.com${labDomain ? ` https://*.${labDomain}` : ''}`,
  `media-src 'self' https:`,
  `upgrade-insecure-requests`,
]
  .filter(Boolean)
  .join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // não expõe "X-Powered-By: Next.js"
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
