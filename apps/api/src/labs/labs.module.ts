import { Module } from '@nestjs/common';
import { LabsService } from './labs.service';
import { LabsController } from './labs.controller';
import { LabsAdminController } from './labs-admin.controller';
import { DockerLabDriver } from './drivers/docker.driver';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [GamificationModule],
  providers: [LabsService, DockerLabDriver],
  controllers: [LabsController, LabsAdminController],
  exports: [LabsService],
})
export class LabsModule {}
