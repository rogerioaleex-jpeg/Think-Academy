import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { ExamsAdminController } from './exams-admin.controller';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [GamificationModule],
  providers: [ExamsService],
  controllers: [ExamsController, ExamsAdminController],
})
export class ExamsModule {}
