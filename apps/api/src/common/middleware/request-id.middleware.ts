import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Atribui um ID único a cada requisição (respeitando um `x-request-id` de
 * entrada, útil atrás de proxy/gateway) e o ecoa no header de resposta.
 * Usado pelo LoggingInterceptor e pelo AllExceptionsFilter para correlação.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { id?: string }, res: Response, next: NextFunction) {
    const incoming = req.headers['x-request-id'];
    const id = (Array.isArray(incoming) ? incoming[0] : incoming)?.slice(0, 128) || randomUUID();
    req.id = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
