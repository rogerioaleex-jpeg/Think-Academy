import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Loga cada requisição HTTP: método, rota, status e duração (ms), com o
 * request-id para correlação. Erros são tratados/logados pelo
 * AllExceptionsFilter — aqui registramos apenas as respostas de sucesso.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { id?: string }>();
    const res = http.getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        this.logger.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms}ms [${req.id ?? '-'}]`);
      }),
    );
  }
}
