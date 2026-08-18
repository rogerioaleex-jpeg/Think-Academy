import { Module } from '@nestjs/common';
import { SocSimService } from './soc-sim.service';
import { SocSimController } from './soc-sim.controller';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [GamificationModule],
  providers: [SocSimService],
  controllers: [SocSimController],
})
export class SocSimModule {}
