import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { store, monthlyRevenue } from '@server/database/schema';
import { eq, and, sql, count } from 'drizzle-orm';
import {
  DEFAULT_ABC_THRESHOLD,
  DEFAULT_ALERT_SETTINGS,
} from '@shared/api.interface';
import type {
  AppSettings,
  AbcThresholdConfig,
  AlertSettings,
  AlertListResponse,
  AlertItem,
  AlertType,
  AbcCategory,
} from '@shared/api.interface';

const STORAGE_KEY_ABC = 'app:settings:abc_threshold';
const STORAGE_KEY_ALERTS = 'app:settings:alerts';

interface StoredSetting<T> {
  key: string;
  value: T;
  updatedAt: number;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private abcThreshold: AbcThresholdConfig = { ...DEFAULT_ABC_THRESHOLD };
  private alertSettings: AlertSettings = { ...DEFAULT_ALERT_SETTINGS };

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  getSettings(): AppSettings {
    return {
      abcThreshold: { ...this.abcThreshold },
      alerts: { ...this.alertSettings },
    };
  }

  updateAbcThreshold(data: AbcThresholdConfig): AbcThresholdConfig {
    this.abcThreshold = {
      aMin: Number(data.aMin) || 0,
      bMin: Number(data.bMin) || 0,
      bMax: Number(data.bMax) || 0,
    };
    this.saveSetting(STORAGE_KEY_ABC, this.abcThreshold);
    return { ...this.abcThreshold };
  }

  updateAlertSettings(data: AlertSettings): AlertSettings {
    this.alertSettings = {
      cLowProductEnabled: Boolean(data.cLowProductEnabled),
      noRevenueEnabled: Boolean(data.noRevenueEnabled),
      noRevenuePeriods: Math.max(1, Number(data.noRevenuePeriods) || 2),
      pendingClosedEnabled: Boolean(data.pendingClosedEnabled),
    };
    this.saveSetting(STORAGE_KEY_ALERTS, this.alertSettings);
    return { ...this.alertSettings };
  }

  getAbcThreshold(): AbcThresholdConfig {
    return { ...this.abcThreshold };
  }

  getAlertSettings(): AlertSettings {
    return { ...this.alertSettings };
  }

  private saveSetting<T>(key: string, value: T): void {
    try {
      const stored: StoredSetting<T> = {
        key,
        value,
        updatedAt: Date.now(),
      };
      globalThis[`__miaoda_settings_${key}`] = stored;
    } catch (e) {
      this.logger.warn(`保存设置失败: ${key}`);
    }
  }

  private categorize(revenue: number | null): AbcCategory {
    if (revenue == null) return 'none';
    const { aMin, bMin, bMax } = this.abcThreshold;
    if (revenue >= aMin) return 'A';
    if (revenue >= bMin && revenue < bMax) return 'B';
    return 'C';
  }

  /**
   * 计算最近 N 个月的月份字符串数组（从上个月开始往前数 N 个月）
   */
  private getRecentMonths(n: number): string[] {
    const months: string[] = [];
    const now = new Date();
    for (let i = 1; i <= n; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(m);
    }
    return months;
  }

  async getAlerts(platformKey?: string): Promise<AlertListResponse> {
    const settings = this.alertSettings;
    const alerts: AlertItem[] = [];

    // 1. C类低产告警
    if (settings.cLowProductEnabled) {
      const count = await this.countCategoryStores('C', platformKey);
      if (count > 0) {
        alerts.push({
          type: 'c_low_product' as AlertType,
          title: 'C类低产店铺',
          count,
          description: `有 ${count} 家店铺收入低于 B 类下限，属于低产店铺`,
          level: 'warning',
          filterParams: { abcCategory: 'C' },
        });
      }
    }

    // 2. 连续无收入告警
    if (settings.noRevenueEnabled) {
      const n = settings.noRevenuePeriods;
      const count = await this.countNoRevenueStores(n, platformKey);
      if (count > 0) {
        alerts.push({
          type: 'no_revenue' as AlertType,
          title: '连续无收入店铺',
          count,
          description: `有 ${count} 家店铺连续 ${n} 个月没有收入记录`,
          level: 'danger',
          filterParams: { status: 'normal', abcCategory: 'none' },
        });
      }
    }

    // 3. 待搭建店铺提醒
    if (settings.pendingClosedEnabled) {
      const pendingCount = await this.countStatusStores('pending', platformKey);
      if (pendingCount > 0) {
        alerts.push({
          type: 'pending_store' as AlertType,
          title: '待搭建店铺',
          count: pendingCount,
          description: `有 ${pendingCount} 家店铺处于待搭建状态`,
          level: 'info',
          filterParams: { status: 'pending' },
        });
      }

      // 4. 停业店铺提醒
      const closedCount = await this.countStatusStores('closed', platformKey);
      if (closedCount > 0) {
        alerts.push({
          type: 'closed_store' as AlertType,
          title: '停业店铺',
          count: closedCount,
          description: `有 ${closedCount} 家店铺处于停业状态`,
          level: 'warning',
          filterParams: { status: 'closed' },
        });
      }
    }

    const totalCount = alerts.reduce((sum, a) => sum + a.count, 0);
    return { alerts, totalCount };
  }

  private async countCategoryStores(
    category: AbcCategory,
    platformKey?: string,
  ): Promise<number> {
    const { aMin, bMin, bMax } = this.abcThreshold;

    // 获取每个店铺的最新月度收入，再分类统计
    const platformFilter = platformKey
      ? sql`WHERE s.platform_key = ${platformKey}`
      : sql``;

    // 用子查询获取每个店铺的最新 month
    let revenueCondition = sql``;
    if (category === 'A') {
      revenueCondition = sql`AND latest.revenue >= ${aMin}`;
    } else if (category === 'B') {
      revenueCondition = sql`AND latest.revenue >= ${bMin} AND latest.revenue < ${bMax}`;
    } else if (category === 'C') {
      revenueCondition = sql`AND latest.revenue < ${bMin}`;
    } else {
      // none 类
       const result = await this.db.execute(sql`
         SELECT COUNT(*) AS cnt
         FROM ${store} s
         WHERE 1=1 ${platformKey ? sql`AND s.platform_key = ${platformKey}` : sql``}
           AND NOT EXISTS (
             SELECT 1 FROM ${monthlyRevenue} mr
             WHERE mr.platform_key = s.platform_key
               AND mr.store_id = s.store_id
               AND mr.month LIKE '____-__'
           )
       `);
      const rows = result as unknown as Array<Record<string, unknown>>;
      return Number(rows[0]?.cnt ?? 0);
    }

    const result = await this.db.execute(sql`
      SELECT COUNT(*) AS cnt
      FROM (
        SELECT DISTINCT ON (mr.platform_key, mr.store_id)
          mr.platform_key, mr.store_id, mr.revenue
        FROM ${monthlyRevenue} mr
        WHERE 1=1 ${platformKey ? sql`AND mr.platform_key = ${platformKey}` : sql``}
          AND mr.month LIKE '____-__'
        ORDER BY mr.platform_key, mr.store_id, mr.month DESC
      ) latest
      WHERE 1=1 ${revenueCondition}
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    return Number(rows[0]?.cnt ?? 0);
  }

  private async countStatusStores(
    status: string,
    platformKey?: string,
  ): Promise<number> {
    const conditions = [eq(store.status, status)];
    if (platformKey) {
      conditions.push(eq(store.platformKey, platformKey));
    }

    const result = await this.db
      .select({ count: count() })
      .from(store)
      .where(and(...conditions));

    return Number(result[0]?.count ?? 0);
  }

  private async countNoRevenueStores(
    periods: number,
    platformKey?: string,
  ): Promise<number> {
    const recentMonths = this.getRecentMonths(periods);
    if (recentMonths.length === 0) return 0;

    const monthsArray = sql.join(
      recentMonths.map((m) => sql`${m}`),
      sql`, `,
    );

    const platformFilter = platformKey
      ? sql`AND s.platform_key = ${platformKey}`
      : sql``;

    // 找出在最近 N 个月内没有任何收入记录的店铺数量
    // 注意：只统计正常/营业中的店铺
    const result = await this.db.execute(sql`
      SELECT COUNT(*) AS cnt
      FROM ${store} s
      WHERE s.status = 'normal'
        ${platformFilter}
        AND NOT EXISTS (
          SELECT 1 FROM ${monthlyRevenue} mr
          WHERE mr.platform_key = s.platform_key
            AND mr.store_id = s.store_id
            AND mr.month = ANY(ARRAY[${monthsArray}]::varchar[])
        )
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    return Number(rows[0]?.cnt ?? 0);
  }
}
