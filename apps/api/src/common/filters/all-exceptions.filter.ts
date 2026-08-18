import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Filtro global de exceções. Padroniza o corpo de erro e evita vazar detalhes
 * internos em 5xx (em produção o cliente recebe uma mensagem genérica; o stack
 * vai apenas para o log do servidor). Erros esperados (HttpException) preservam
 * status e mensagem.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extrai mensagem/erro de HttpException (que pode ter payload objeto).
    let message: string | string[] = 'Erro interno.';
    let error = 'Internal Server Error';
    if (isHttp) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const p = payload as Record<string, unknown>;
        message = (p.message as string | string[]) ?? exception.message;
        error = (p.error as string) ?? error;
      }
    }

    const isServerError = status >= 500;
    // Nunca expõe detalhes internos de 5xx em produção.
    if (isServerError && process.env.NODE_ENV === 'production') {
      message = 'Erro interno. Tente novamente mais tarde.';
    }

    const body = {
      statusCode: status,
      error: isHttp ? error : 'Internal Server Error',
      message,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      requestId: req.id,
    };

    // 5xx sempre logado com stack; 4xx em nível debug (ruído esperado).
    const logMsg = `${req.method} ${req.originalUrl} -> ${status} [${req.id ?? '-'}]`;
    if (isServerError) {
      this.logger.error(logMsg, exception instanceof Error ? exception.stack : String(exception));
    } else {
      this.logger.debug(logMsg);
    }

    res.status(status).json(body);
  }
}
