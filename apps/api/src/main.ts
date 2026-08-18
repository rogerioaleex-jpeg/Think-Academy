import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { validateEnv } from './common/env.validation';

async function bootstrap() {
  // Falha rápido se o ambiente estiver mal configurado (segredo do JWT, banco,
  // CORS, cookies, etc.). Ver common/env.validation.ts.
  validateEnv();

  const app = await NestFactory.create(AppModule);

  // Cabeçalhos de segurança (XSS, clickjacking, sniffing, HSTS, etc.) +
  // Content-Security-Policy explícita. A API só serve JSON e o Swagger, então
  // a policy é restritiva; 'unsafe-inline' fica apenas no style/script do
  // Swagger UI. Ajuste connect/img-src conforme os domínios de mídia/CDN reais.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"], // anti-clickjacking
          objectSrc: ["'none'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger UI
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
    }),
  );

  // Parser de cookies — necessário para ler o access/refresh token httpOnly.
  app.use(cookieParser());

  // Limite de tamanho de payload — mitiga DoS por corpo gigante.
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // Validação global: rejeita campos não declarados (whitelist + forbid),
  // faz coerção de tipos e bloqueia mass-assignment.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Think IT Cyber Academy API')
    .setDescription('API da plataforma de treinamento em Cybersecurity')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Render/Heroku/etc. injetam PORT; em dev usamos API_PORT ou 3333.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3333);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API em http://localhost:${port}/api  •  Swagger em /api/docs`, 'Bootstrap');
}
bootstrap();
