import { Controller, Get, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { RoleGuard, Roles } from '@server/common/guards/role.guard';
import type {
  AppSettings,
  AbcThresholdConfig,
  AlertSettings,
  AlertListResponse,
} from '@shared/api.interface';

@Controller('api')
@UseGuards(RoleGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('settings')
  @Roles('admin')
  async getSettings(): Promise<AppSettings> {
    return this.settingsService.getSettings();
  }

  @Patch('settings/abc-threshold')
  @Roles('admin')
  async updateAbcThreshold(
    @Body() data: AbcThresholdConfig,
  ): Promise<AbcThresholdConfig> {
    return this.settingsService.updateAbcThreshold(data);
  }

  @Patch('settings/alerts')
  @Roles('admin')
  async updateAlertSettings(
    @Body() data: AlertSettings,
  ): Promise<AlertSettings> {
    return this.settingsService.updateAlertSettings(data);
  }

  @Get('alerts')
  async getAlerts(
    @Query('platformKey') platformKey?: string,
  ): Promise<AlertListResponse> {
    return this.settingsService.getAlerts(platformKey);
  }
}
