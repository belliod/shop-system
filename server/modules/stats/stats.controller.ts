import { Controller, Get, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { RoleGuard } from '@server/common/guards/role.guard';
import type { DashboardStatsResponse, StatsDimension } from '@shared/api.interface';

@Controller('api/stats')
@UseGuards(RoleGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  async dashboard(
    @Query('platformKey') platformKey?: string,
    @Query('dimension') dimension?: string,
    @Query('months') months?: string,
    @Query('month') month?: string,
  ): Promise<DashboardStatsResponse> {
    if (dimension && dimension !== 'month' && dimension !== 'week') {
      throw new BadRequestException('dimension 只能是 month 或 week');
    }
    const monthsNum = months ? parseInt(months, 10) : 6;
    if (months !== undefined && (isNaN(monthsNum) || monthsNum < 1)) {
      throw new BadRequestException('months 必须是正整数');
    }
    if (month !== undefined && !/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('month 格式必须为 yyyy-MM');
    }
    return this.statsService.getDashboardStats({
      platformKey,
      dimension: (dimension as StatsDimension) || 'month',
      months: monthsNum,
      month: month || undefined,
    });
  }
}
