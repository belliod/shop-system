import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ExportService } from './export.service';
import { RoleGuard } from '@server/common/guards/role.guard';

@Controller('api/export')
@UseGuards(RoleGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('stores.csv')
  async exportStores(
    @Query('platformKey') platformKey?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('abcCategory') abcCategory?: string,
  ): Promise<string> {
    return this.exportService.exportStores({
      platformKey,
      search,
      status,
      abcCategory,
    });
  }

  @Get('revenue.csv')
  async exportRevenue(
    @Query('platformKey') platformKey?: string,
    @Query('periodType') periodType?: string,
    @Query('year') year?: string,
  ): Promise<string> {
    return this.exportService.exportRevenue({
      platformKey,
      periodType,
      year: year ? parseInt(year, 10) : undefined,
    });
  }

  @Get('stats.csv')
  async exportStats(
    @Query('platformKey') platformKey?: string,
    @Query('dimension') dimension?: string,
  ): Promise<string> {
    return this.exportService.exportStats({
      platformKey,
      dimension,
    });
  }
}
