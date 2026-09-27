import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ViewModule } from './modules/view/view.module';
import { AuthModule } from './modules/auth/auth.module';
import { StoreModule } from './modules/store/store.module';
import { RevenueModule } from './modules/revenue/revenue.module';
import { StatsModule } from './modules/stats/stats.module';
import { PlatformConfigModule } from './modules/platform-config/platform-config.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ExportModule } from './modules/export/export.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    AuthModule,
    PlatformConfigModule,
    StoreModule,
    RevenueModule,
    StatsModule,
    SettingsModule,
    ExportModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
