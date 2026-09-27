import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { SettingsModule } from '../settings/settings.module';
import { StoreModule } from '../store/store.module';
import { RevenueModule } from '../revenue/revenue.module';

@Module({
  imports: [SettingsModule, StoreModule, RevenueModule],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
