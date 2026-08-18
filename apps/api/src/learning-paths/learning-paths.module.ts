import { Module } from '@nestjs/common';
import { LearningPathsService } from './learning-paths.service';
import { LearningPathsController } from './learning-paths.controller';
import { CertificatesModule } from '../certificates/certificates.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [CertificatesModule, GamificationModule],
  providers: [LearningPathsService],
  controllers: [LearningPathsController],
})
export class LearningPathsModule {}
