import { Module } from '@nestjs/common';
import { LabsService } from './labs.service';
import { LabsController } from './labs.controller';
import { LabsAdminController } from './labs-admin.controller';
import { DockerLabDriver } from './drivers/docker.driver';
import { VmLabDriver } from './drivers/vm.driver';
import { LabDriverRegistry } from './drivers/lab-driver.registry';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [GamificationModule],
  providers: [LabsService, DockerLabDriver, VmLabDriver, LabDriverRegistry],
  controllers: [LabsController, LabsAdminController],
  exports: [LabsService],
})
export class LabsModule {}
