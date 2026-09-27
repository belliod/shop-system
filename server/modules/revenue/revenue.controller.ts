import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { RoleGuard, Roles } from '@server/common/guards/role.guard';
import type {
  MonthlyRevenueInfo,
  RevenueListParams,
  RevenueUpsertRequest,
  ExcelImportRow,
  ExcelImportResult,
  RevenuePeriodType,
} from '@shared/api.interface';

@Controller('api/revenue')
@UseGuards(RoleGuard)
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Post()
  @Roles('admin', 'platform_owner', 'editor')
  async upsert(@Body() dto: RevenueUpsertRequest): Promise<MonthlyRevenueInfo> {
    if (!dto.platformKey || !dto.storeId) {
      throw new BadRequestException('platformKey、storeId 均为必填');
    }
    if (!dto.month && (!dto.periodType || !dto.year || dto.periodIndex == null)) {
      throw new BadRequestException('month 或 periodType+year+periodIndex 必填其一');
    }
    return this.revenueService.upsertRevenue(dto);
  }

  @Post('batch')
  @Roles('admin', 'platform_owner', 'editor')
  async batchUpsert(
    @Body() body: { items: RevenueUpsertRequest[] },
  ): Promise<{ count: number }> {
    if (!Array.isArray(body.items)) {
      throw new BadRequestException('items 必须为数组');
    }
    return this.revenueService.batchUpsert(body.items);
  }

  @Post('import-excel')
  @Roles('admin', 'platform_owner', 'editor')
  async importExcel(
    @Body() body: { rows: ExcelImportRow[] },
  ): Promise<ExcelImportResult> {
    if (!Array.isArray(body.rows)) {
      throw new BadRequestException('rows 必须为数组');
    }
    return this.revenueService.importExcel(body.rows);
  }

  @Get()
  async list(
    @Query('platformKey') platformKey?: string,
    @Query('month') month?: string,
    @Query('storeId') storeId?: string,
    @Query('periodType') periodType?: RevenuePeriodType,
    @Query('year') year?: string,
    @Query('periodIndex') periodIndex?: string,
  ): Promise<MonthlyRevenueInfo[]> {
    const params: RevenueListParams = {
      platformKey,
      month,
      storeId,
      periodType,
      year: year ? parseInt(year, 10) : undefined,
      periodIndex: periodIndex ? parseInt(periodIndex, 10) : undefined,
    };
    return this.revenueService.listRevenues(params);
  }

  @Get('detail')
  async detail(
    @Query('platformKey') platformKey: string,
    @Query('storeId') storeId: string,
    @Query('month') month: string,
  ): Promise<MonthlyRevenueInfo> {
    if (!platformKey || !storeId || !month) {
      throw new BadRequestException('platformKey、storeId、month 均为必填');
    }
    const result = await this.revenueService.getRevenueByStoreMonth(
      platformKey,
      storeId,
      month,
    );
    if (!result) {
      throw new NotFoundException('收入记录不存在');
    }
    return result;
  }

  @Delete(':id')
  @Roles('admin', 'platform_owner', 'editor')
  async deleteRevenue(@Param('id') id: string): Promise<{ success: true }> {
    await this.revenueService.deleteRevenue(id);
    return { success: true };
  }
}
