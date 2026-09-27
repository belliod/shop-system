import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { monthlyRevenue, store, platform } from '@server/database/schema';
import { sql } from 'drizzle-orm';
import { SettingsService } from '../settings/settings.service';
import {
  ABC_LABELS,
} from '@shared/api.interface';
import type {
  DashboardStatsResponse,
  StatsOverview,
  RevenueTrendItem,
  OwnerRevenueItem,
  PlatformStats,
  StatsDimension,
  AbcCategory,
  AbcStatsItem,
} from '@shared/api.interface';

interface DashboardParams {
  platformKey?: string;
  dimension?: StatsDimension;
  months?: number;
  month?: string;
}

interface LatestRevenueRow {
  platformKey: string;
  storeId: string;
  revenue: number;
  period: string;
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly settingsService: SettingsService,
  ) {}

  async getDashboardStats(params: DashboardParams): Promise<DashboardStatsResponse> {
    const {
      platformKey,
      dimension = 'month',
      months = 6,
      month,
    } = params;

    const latestRevenueMap = await this.getAllStoresLatestRevenue(
      platformKey,
      month,
    );

    const [overview, platformStats, revenueTrend, ownerRevenue] =
      await Promise.all([
        this.getOverview(platformKey, latestRevenueMap, month),
        this.getPlatformStats(platformKey, latestRevenueMap, month),
        this.getRevenueTrend(platformKey, dimension, months, month),
        this.getOwnerRevenue(platformKey, month),
      ]);

    const totalStores = overview.totalStores;
    const abcStats = this.computeAbcStats(
      Array.from(latestRevenueMap.values()),
      totalStores,
    );

    return { overview, platformStats, revenueTrend, ownerRevenue, abcStats };
  }

  /**
   * 获取所有店铺的最新月度收入（仅 month 类型）
   */
  private async getAllStoresLatestRevenue(
    platformKey?: string,
    month?: string,
  ): Promise<Map<string, LatestRevenueRow>> {
    const platformFilter = platformKey
      ? sql`WHERE mr.platform_key = ${platformKey}`
      : sql`WHERE 1=1`;
    const monthFilter = month
      ? sql`AND mr.month = ${month}`
      : sql`AND mr.month LIKE '____-__'`;

    const result = await this.db.execute(sql`
      SELECT DISTINCT ON (mr.platform_key, mr.store_id)
        mr.platform_key AS "platformKey",
        mr.store_id AS "storeId",
        mr.month AS period,
        mr.revenue AS revenue
      FROM ${monthlyRevenue} mr
      ${platformFilter}
        ${monthFilter}
      ORDER BY mr.platform_key, mr.store_id, mr.month DESC
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    const map = new Map<string, LatestRevenueRow>();
    for (const row of rows) {
      const key = `${String(row.platformKey)}:${String(row.storeId)}`;
      map.set(key, {
        platformKey: String(row.platformKey),
        storeId: String(row.storeId),
        revenue: Number(row.revenue),
        period: String(row.period),
      });
    }
    return map;
  }

  private categorize(revenue: number | null): AbcCategory {
    const threshold = this.settingsService.getAbcThreshold();
    if (revenue == null) return 'none';
    if (revenue >= threshold.aMin) return 'A';
    if (revenue >= threshold.bMin && revenue < threshold.bMax) return 'B';
    return 'C';
  }

  private computeAbcStats(
    items: LatestRevenueRow[],
    totalStores = 0,
  ): AbcStatsItem[] {
    const counts: Record<AbcCategory, { count: number; revenue: number }> = {
      A: { count: 0, revenue: 0 },
      B: { count: 0, revenue: 0 },
      C: { count: 0, revenue: 0 },
      none: { count: 0, revenue: 0 },
    };

    for (const item of items) {
      const cat = this.categorize(item.revenue);
      counts[cat].count += 1;
      counts[cat].revenue += item.revenue;
    }

    // 无收入的店铺归入 none 类
    const storesWithRevenue = items.length;
    const noneExtra = Math.max(0, totalStores - storesWithRevenue);
    counts.none.count += noneExtra;

    const categories: AbcCategory[] = ['A', 'B', 'C', 'none'];
    return categories.map((cat) => ({
      category: cat,
      label: ABC_LABELS[cat],
      count: counts[cat].count,
      revenue: Number(counts[cat].revenue.toFixed(2)),
    }));
  }

  private async getOverview(
    platformKey: string | undefined,
    latestRevenueMap: Map<string, LatestRevenueRow>,
    month?: string,
  ): Promise<StatsOverview> {
    const platformFilter = platformKey
      ? sql`WHERE platform_key = ${platformKey}`
      : sql``;
    const parts: import('drizzle-orm').SQLWrapper[] = [];
    if (platformKey) parts.push(sql`mr.platform_key = ${platformKey}`);
    if (month) parts.push(sql`mr.month = ${month}`);
    const revenueFilter = parts.length > 0
      ? sql`WHERE ${sql.join(parts, sql` AND `)}`
      : sql``;

    const result = await this.db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM ${store} s ${platformKey ? sql`WHERE s.platform_key = ${platformKey}` : sql``}) AS "totalStores",
        (SELECT COUNT(DISTINCT s2.owner) FROM ${store} s2 ${platformKey ? sql`WHERE s2.platform_key = ${platformKey} AND s2.owner IS NOT NULL` : sql`WHERE s2.owner IS NOT NULL`}) AS "totalOwners",
        (SELECT COUNT(*) FROM ${platform} p ${platformFilter}) AS "totalPlatforms",
        COALESCE((SELECT SUM(mr.revenue)::numeric FROM ${monthlyRevenue} mr ${revenueFilter}), 0) AS "totalRevenue"
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    const row = rows[0];

    // 计算 ABC 分类数量
    let aCount = 0;
    let bCount = 0;
    let cCount = 0;
    let noneCount = 0;

    for (const item of latestRevenueMap.values()) {
      const cat = this.categorize(item.revenue);
      if (cat === 'A') aCount += 1;
      else if (cat === 'B') bCount += 1;
      else if (cat === 'C') cCount += 1;
      else noneCount += 1;
    }

    // none 类还包括没有收入记录的店铺——需要店铺总数来算
    const totalStores = Number(row?.totalStores ?? 0);
    const storesWithRevenue = latestRevenueMap.size;
    noneCount = totalStores - storesWithRevenue + noneCount;

    return {
      totalStores,
      totalOwners: Number(row?.totalOwners ?? 0),
      totalPlatforms: Number(row?.totalPlatforms ?? 0),
      totalRevenue: Number(row?.totalRevenue ?? 0),
      aCount,
      bCount,
      cCount,
      noneCount,
    };
  }

  private async getPlatformStats(
    platformKey: string | undefined,
    latestRevenueMap: Map<string, LatestRevenueRow>,
    month?: string,
  ): Promise<PlatformStats[]> {
    const platformFilter = platformKey
      ? sql`WHERE p.platform_key = ${platformKey}`
      : sql``;
    const monthFilter = month
      ? sql`AND mr.month = ${month}`
      : sql``;

    const result = await this.db.execute(sql`
      SELECT
        p.platform_key AS "platformKey",
        p.platform_name AS "platformName",
        COUNT(DISTINCT s.store_id) AS "storeCount",
        COALESCE(SUM(mr.revenue)::numeric, 0) AS revenue
      FROM ${platform} p
      LEFT JOIN ${store} s
        ON s.platform_key = p.platform_key
      LEFT JOIN ${monthlyRevenue} mr
        ON mr.platform_key = p.platform_key
        AND mr.store_id = s.store_id
        ${monthFilter}
      ${platformFilter}
      GROUP BY p.platform_key, p.platform_name, p.sort_order
      ORDER BY p.sort_order ASC, p.platform_key ASC
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    return rows.map((row: Record<string, unknown>) => {
      const pk = String(row.platformKey);
      const storeCount = Number(row.storeCount);
      // 按平台过滤最新收入，计算 ABC 数量
      let aCount = 0;
      let bCount = 0;
      let cCount = 0;
      let platformRevenueCount = 0;
      for (const item of latestRevenueMap.values()) {
        if (item.platformKey !== pk) continue;
        platformRevenueCount += 1;
        const cat = this.categorize(item.revenue);
        if (cat === 'A') aCount += 1;
        else if (cat === 'B') bCount += 1;
        else if (cat === 'C') cCount += 1;
      }
      return {
        platformKey: pk,
        platformName: String(row.platformName),
        storeCount,
        revenue: Number(row.revenue),
        aCount,
        bCount,
        cCount,
      };
    });
  }

  private async getRevenueTrend(
    platformKey: string | undefined,
    dimension: StatsDimension,
    months: number,
    month?: string,
  ): Promise<RevenueTrendItem[]> {
    if (month) {
      return [{
        period: month,
        revenue: await this.getMonthTotalRevenue(platformKey, month),
      }];
    }
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    if (dimension === 'month') {
      return this.getMonthlyTrend(platformKey, months, currentMonthStr);
    }
    return this.getWeeklyTrend(platformKey, months);
  }

  private async getMonthTotalRevenue(
    platformKey: string | undefined,
    month: string,
  ): Promise<number> {
    const platformFilter = platformKey
      ? sql`AND mr.platform_key = ${platformKey}`
      : sql``;
    const result = await this.db.execute(sql`
      SELECT COALESCE(SUM(mr.revenue)::numeric, 0) AS revenue
      FROM ${monthlyRevenue} mr
      WHERE mr.month = ${month}
        ${platformFilter}
    `);
    const rows = result as unknown as Array<Record<string, unknown>>;
    return Number(rows[0]?.revenue ?? 0);
  }

  private async getMonthlyTrend(
    platformKey: string | undefined,
    months: number,
    currentMonthStr: string,
  ): Promise<RevenueTrendItem[]> {
    const platformFilter = platformKey
      ? sql`AND mr.platform_key = ${platformKey}`
      : sql``;

    const result = await this.db.execute(sql`
      SELECT
        TO_CHAR(period, 'YYYY-MM') AS period,
        COALESCE(SUM(mr.revenue)::numeric, 0) AS revenue
      FROM generate_series(
        (${currentMonthStr}::date - (${months} - 1 || ' months')::interval)::date,
        ${currentMonthStr}::date,
        '1 month'::interval
      ) AS period
      LEFT JOIN ${monthlyRevenue} mr
        ON TO_CHAR(period, 'YYYY-MM') = mr.month
        ${platformFilter}
      GROUP BY period
      ORDER BY period ASC
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    return rows.map((row: Record<string, unknown>) => ({
      period: String(row.period),
      revenue: Number(row.revenue),
    }));
  }

  private async getWeeklyTrend(
    platformKey: string | undefined,
    months: number,
  ): Promise<RevenueTrendItem[]> {
    const weeks = months * 4;
    const nowIso = new Date().toISOString();
    const platformFilter = platformKey
      ? sql`AND mr.platform_key = ${platformKey}`
      : sql``;

    // 周度数据从 month 字段的 YYYY-WNN 格式匹配
    const result = await this.db.execute(sql`
      SELECT
        TO_CHAR(week_start, 'YYYY-"W"IW') AS period,
        COALESCE(SUM(mr.revenue)::numeric, 0) AS revenue
      FROM generate_series(
        date_trunc('week', ${nowIso}::timestamptz - (${weeks} - 1 || ' weeks')::interval)::date,
        date_trunc('week', ${nowIso}::timestamptz)::date,
        '1 week'::interval
      ) AS week_start
      LEFT JOIN ${monthlyRevenue} mr
        ON TO_CHAR(week_start, 'YYYY-"W"IW') = mr.month
        ${platformFilter}
      GROUP BY week_start
      ORDER BY week_start ASC
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    return rows.map((row: Record<string, unknown>) => ({
      period: String(row.period),
      revenue: Number(row.revenue),
    }));
  }

  private async getOwnerRevenue(
    platformKey?: string,
    month?: string,
  ): Promise<OwnerRevenueItem[]> {
    const platformFilter = platformKey
      ? sql`WHERE s.platform_key = ${platformKey}`
      : sql``;
    const monthFilter = month
      ? sql`AND mr.month = ${month}`
      : sql``;

    const result = await this.db.execute(sql`
      SELECT
        s.owner AS owner,
        COUNT(DISTINCT s.store_id) AS "storeCount",
        COALESCE(SUM(mr.revenue)::numeric, 0) AS revenue
      FROM ${store} s
      LEFT JOIN ${monthlyRevenue} mr
        ON mr.platform_key = s.platform_key
        AND mr.store_id = s.store_id
        ${monthFilter}
      ${platformFilter}
        AND s.owner IS NOT NULL
      GROUP BY s.owner
      ORDER BY revenue DESC
      LIMIT 10
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    return rows
      .filter((row) => row.owner && String(row.owner).trim() !== '')
      .map((row: Record<string, unknown>) => ({
        owner: String(row.owner),
        storeCount: Number(row.storeCount),
        revenue: Number(row.revenue),
      }));
  }
}
