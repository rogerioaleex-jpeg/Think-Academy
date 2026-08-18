import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeaderboardScope } from '@tica/database';
import { GamificationService } from './gamification.service';

@ApiTags('gamification')
@ApiBearerAuth()
@Controller()
export class GamificationController {
  constructor(private gamification: GamificationService) {}

  @Get('leaderboard')
  @ApiOperation({ summary: 'Ranking global ou mensal.' })
  @ApiQuery({ name: 'scope', enum: LeaderboardScope, required: false })
  leaderboard(@Query('scope') scope?: LeaderboardScope) {
    return this.gamification.leaderboard(scope ?? LeaderboardScope.GLOBAL);
  }

  @Get('badges')
  @ApiOperation({ summary: 'Lista o catálogo de badges.' })
  badges() {
    return this.gamification.listBadges();
  }
}
