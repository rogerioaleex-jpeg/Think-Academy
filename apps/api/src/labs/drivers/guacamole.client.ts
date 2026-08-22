import { Injectable, Logger } from '@nestjs/common';

/**
 * Cliente REST mínimo do Apache Guacamole — usado pelo VmLabDriver para
 * criar/destruir uma conexão RDP por instância de lab, e pelo endpoint
 * `GET /labs/instances/:id/rdp-token` (LabsController) para gerar um token
 * de sessão fresco na hora que o aluno abre o console (tokens do Guacamole
 * expiram após inatividade — nunca embutimos um token de longa duração no
 * `accessUrl` persistido).
 *
 * Requer as variáveis de ambiente:
 *   GUACAMOLE_URL            ex.: https://guac.labs.hackerarena.com.br/guacamole
 *   GUACAMOLE_ADMIN_USER     ex.: guacadmin
 *   GUACAMOLE_ADMIN_PASSWORD
 *
 * Sem essas variáveis, os métodos lançam erro — o chamador (VmLabDriver)
 * trata isso como falha de provisionamento, igual a qualquer outro erro de
 * `docker run` (ver labs.service.ts.start()).
 */
@Injectable()
export class GuacamoleClient {
  private readonly logger = new Logger(GuacamoleClient.name);
  private readonly dataSource = 'postgresql'; // nome fixo da fonte JDBC configurada no docker-compose.labs.yml

  private get baseUrl(): string {
    const url = process.env.GUACAMOLE_URL;
    if (!url) throw new Error('GUACAMOLE_URL não configurado.');
    return url.replace(/\/$/, '');
  }

  /** Autentica como admin e retorna um authToken fresco (não cacheado — cada chamada gera um novo). */
  async authenticate(): Promise<string> {
    const user = process.env.GUACAMOLE_ADMIN_USER;
    const password = process.env.GUACAMOLE_ADMIN_PASSWORD;
    if (!user || !password) throw new Error('GUACAMOLE_ADMIN_USER/GUACAMOLE_ADMIN_PASSWORD não configurados.');

    const res = await fetch(`${this.baseUrl}/api/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: user, password }).toString(),
    });
    if (!res.ok) throw new Error(`Falha ao autenticar no Guacamole: HTTP ${res.status}`);
    const body = (await res.json()) as { authToken: string };
    return body.authToken;
  }

  /** Cria a conexão RDP para uma instância. Retorna o identifier numérico (string) do Guacamole. */
  async createRdpConnection(opts: {
    name: string;
    hostname: string; // IP interno do container na rede isolada
    port: number;
    username: string;
    password: string;
  }): Promise<string> {
    const token = await this.authenticate();
    const res = await fetch(`${this.baseUrl}/api/session/data/${this.dataSource}/connections?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentIdentifier: 'ROOT',
        name: opts.name,
        protocol: 'rdp',
        parameters: {
          hostname: opts.hostname,
          port: String(opts.port),
          username: opts.username,
          password: opts.password,
          'ignore-cert': 'true',
          security: 'any',
        },
        attributes: {},
      }),
    });
    if (!res.ok) throw new Error(`Falha ao criar conexão no Guacamole: HTTP ${res.status} — ${await res.text()}`);
    const body = (await res.json()) as { identifier: string };
    return body.identifier;
  }

  /** Remove a conexão (best-effort — chamado no destroy() da instância). */
  async deleteConnection(identifier: string): Promise<void> {
    try {
      const token = await this.authenticate();
      const res = await fetch(
        `${this.baseUrl}/api/session/data/${this.dataSource}/connections/${identifier}?token=${token}`,
        { method: 'DELETE' },
      );
      if (!res.ok && res.status !== 404) {
        this.logger.warn(`Falha ao remover conexão Guacamole ${identifier}: HTTP ${res.status}`);
      }
    } catch (e) {
      this.logger.warn(`Falha ao remover conexão Guacamole ${identifier}: ${(e as Error).message}`);
    }
  }

  /**
   * Gera a URL completa do client web do Guacamole (já com token fresco)
   * para uma conexão. Formato do identificador de URL do Guacamole 1.5.x:
   * base64url("<connectionId>\0c\0<dataSource>") sem padding.
   */
  async buildClientUrl(identifier: string): Promise<string> {
    const token = await this.authenticate();
    const raw = `${identifier}\0c\0${this.dataSource}`;
    const encoded = Buffer.from(raw, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return `${this.baseUrl}/#/client/${encoded}?token=${token}`;
  }
}
