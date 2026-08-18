import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { VideosModule } from './videos/videos.module';
import { StorageModule } from './storage/storage.module';
import { ExamsModule } from './exams/exams.module';
import { GamificationModule } from './gamification/gamification.module';
import { LearningPathsModule } from './learning-paths/learning-paths.module';
import { CompetenciesModule } from './competencies/competencies.module';
import { LabsModule } from './labs/labs.module';
import { CertificatesModule } from './certificates/certificates.module';
import { CategoriesModule } from './categories/categories.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JobsModule } from './jobs/jobs.module';
import { SearchModule } from './search/search.module';
import { SettingsModule } from './settings/settings.module';
import { ForumModule } from './forum/forum.module';
import { SocSimModule } from './soc-sim/soc-sim.module';
import { DetectionModule } from './detection/detection.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Rate limiting global — 120 req/min por IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    VideosModule,
    ExamsModule,
    GamificationModule,
    LearningPathsModule,
    CompetenciesModule,
    LabsModule,
    CertificatesModule,
    CategoriesModule,
    ReportsModule,
    NotificationsModule,
    JobsModule,
    SearchModule,
    SettingsModule,
    ForumModule,
    SocSimModule,
    DetectionModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // request-id em todas as rotas (antes de tudo, para correlação de logs).
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
