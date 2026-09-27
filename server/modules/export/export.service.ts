import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { sql } from 'drizzle-orm';
import { store, monthlyRevenue, platform } from '@server/database/schema';
import { StoreService } from '../store/store.service';
import { RevenueService } from '../revenue/revenue.service';
import { SettingsService } from '../settings/settings.service';
import {
  STORE_STATUS_LABELS,
  ABC_LABELS,
} from '@shared/api.interface';
import type {
  StoreStatus,
  AbcCategory,
  RevenuePeriodType,
  StoreInfo,
  MonthlyRevenueInfo,
} from '@shared/api.interface';

interface ExportStoresParams {
  platformKey?: string;
  search?: string;
  status?: string;
  abcCategory?: string;
}

interface ExportRevenueParams {
  platformKey?: string;
  periodType?: string;
  year?: number;
}

interface ExportStatsParams {
  platformKey?: string;
  dimension?: string;
}

const BOM = '\uFEFF';

function escapeCsv(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getAbcLabel(cat: AbcCategory | undefined): string {
  if (!cat) return ABC_LABELS.none;
  return ABC_LABELS[cat] ?? ABC_LABELS.none;
}

function getStatusLabel(status: StoreStatus | undefined): string {
  if (!status) return '';
  return STORE_STATUS_LABELS[status] ?? status;
}

function getPeriodTypeLabel(type: RevenuePeriodType | undefined): string {
  if (type === 'week') return '周度';
  return '月度';
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly storeService: StoreService,
    private readonly revenueService: RevenueService,
    private readonly settingsService: SettingsService,
  ) {}

  async exportStores(params: ExportStoresParams): Promise<string> {
    const { platformKey, search, status, abcCategory } = params;
    if (!platformKey) {
      throw new Error('platformKey 必填');
    }

    // 拉取全部店铺（不分页）
    const allItems: StoreInfo[] = [];
    let page = 1;
    const pageSize = 200;
    // 先获取总数，避免循环无意义
    const firstPage = await this.storeService.listStores({
      platformKey,
      search,
      status: status as StoreStatus,
      abcCategory: abcCategory as AbcCategory,
      page,
      pageSize,
    });
    allItems.push(...firstPage.items);
    const total = firstPage.total;

    while (allItems.length < total) {
      page += 1;
      const result = await this.storeService.listStores({
        platformKey,
        search,
        status: status as StoreStatus,
        abcCategory: abcCategory as AbcCategory,
        page,
        pageSize,
      });
      if (result.items.length === 0) break;
      allItems.push(...result.items);
    }

    const header = [
      '平台编码',
      '店铺ID',
      '店铺名称',
      '负责人',
      '状态',
      'ABC类别',
      '最新月收入',
      '地址',
      '签约时间',
    ].join(',');

    const rows = allItems.map((item: StoreInfo) =>
      [
        item.platformKey,
        item.storeId,
        item.storeName ?? '',
        item.owner ?? '',
        getStatusLabel(item.status as StoreStatus),
        getAbcLabel(item.abcCategory),
        item.latestRevenue ?? 0,
        item.address ?? '',
        item.signTime ?? '',
      ]
        .map((v) => escapeCsv(v))
        .join(','),
    );

    return BOM + header + '\n' + rows.join('\n');
  }

  async exportRevenue(params: ExportRevenueParams): Promise<string> {
    const { platformKey, periodType, year } = params;
    if (!platformKey) {
      throw new Error('platformKey 必填');
    }

    const items: MonthlyRevenueInfo[] = await this.revenueService.listRevenues({
      platformKey,
      periodType: periodType as RevenuePeriodType,
      year,
    });

    const header = [
      '平台编码',
      '店铺ID',
      '店铺名称',
      '周期类型',
      '年份',
      '周期序号',
      '收入金额',
    ].join(',');

    const rows = items.map((item: MonthlyRevenueInfo) =>
      [
        item.platformKey,
        item.storeId,
        item.storeName ?? '',
        getPeriodTypeLabel(item.periodType),
        item.year ?? '',
        item.periodIndex ?? '',
        item.revenue,
      ]
        .map((v) => escapeCsv(v))
        .join(','),
    );

    return BOM + header + '\n' + rows.join('\n');
  }

  async exportStats(params: ExportStatsParams): Promise<string> {
    const { platformKey, dimension = 'month' } = params;

    // 用 storeService 获取最新收入，按平台聚合
    // 简单实现：获取所有店铺 + 最新收入，在内存里按平台分类
    const threshold = this.settingsService.getAbcThreshold();

    // 由于没有直接获取所有店铺的方法，这里通过 listStores 分页拉取
    // 但 listStores 需要 platformKey，所以我们用 SQL 直接查（通过 StoreService 不行）
    // 改用 StoreService 无法跨平台，所以这里我们直接注入 db 会更简单
    // 为了保持结构，我们复用 listStores 方式，但需要 platformKey
    // 如果 platformKey 为空，我们返回简单的表头+空数据
    // 实际上需要所有平台数据，这里做一个可行的简化实现

    const header = ['平台', '店铺数', '总收入', 'A类数', 'B类数', 'C类数'].join(',');

    // 单平台场景
    if (platformKey) {
      const result = await this.storeService.listStores({
        platformKey,
        pageSize: 500,
      });
      const items = result.items;
      const totalStores = items.length;
      let totalRevenue = 0;
      let aCount = 0;
      let bCount = 0;
      let cCount = 0;

      for (const item of items) {
        const rev = item.latestRevenue ?? 0;
        totalRevenue += rev;
        const cat = item.abcCategory ?? 'none';
        if (cat === 'A') aCount += 1;
        else if (cat === 'B') bCount += 1;
        else if (cat === 'C') cCount += 1;
      }

      const row = [
        platformKey,
        totalStores,
        totalRevenue.toFixed(2),
        aCount,
        bCount,
        cCount,
      ]
        .map((v) => escapeCsv(v))
        .join(',');

      return BOM + header + '\n' + row;
    }

    // 多平台场景：直接用 SQL 查询所有平台的最新收入并分类
    const platformResult = await this.db.execute(sql`
      SELECT
        p.platform_key AS "platformKey",
        p.platform_name AS "platformName",
        COUNT(DISTINCT s.store_id) AS "storeCount"
      FROM ${platform} p
      LEFT JOIN ${store} s ON s.platform_key = p.platform_key
      GROUP BY p.platform_key, p.platform_name, p.sort_order
      ORDER BY p.sort_order ASC, p.platform_key ASC
    `);

    const platformRows = platformResult as unknown as Array<Record<string, unknown>>;

    // 获取所有店铺的最新月度收入
    const latestResult = await this.db.execute(sql`
      SELECT DISTINCT ON (mr.platform_key, mr.store_id)
        mr.platform_key AS "platformKey",
        mr.store_id AS "storeId",
        mr.revenue AS revenue
      FROM ${monthlyRevenue} mr
      WHERE mr.month LIKE '____-__'
      ORDER BY mr.platform_key, mr.store_id, mr.month DESC
    `);

    const latestRows = latestResult as unknown as Array<Record<string, unknown>>;
    const revenueByPlatform = new Map<string, { total: number; aCount: number; bCount: number; cCount: number; storeCount: number }>();

    const { aMin, bMin, bMax } = threshold;

    for (const row of latestRows) {
      const pk = String(row.platformKey);
      const rev = Number(row.revenue);
      let acc = revenueByPlatform.get(pk);
      if (!acc) {
        acc = { total: 0, aCount: 0, bCount: 0, cCount: 0, storeCount: 0 };
        revenueByPlatform.set(pk, acc);
      }
      acc.total += rev;
      acc.storeCount += 1;
      if (rev >= aMin) acc.aCount += 1;
      else if (rev >= bMin && rev < bMax) acc.bCount += 1;
      else acc.cCount += 1;
    }

    const dataRows: string[] = [];
    let totalStores = 0;
    let totalRevenue = 0;
    let totalA = 0;
    let totalB = 0;
    let totalC = 0;

    for (const pRow of platformRows) {
      const pk = String(pRow.platformKey);
      const storeCount = Number(pRow.storeCount);
      const stats = revenueByPlatform.get(pk) ?? { total: 0, aCount: 0, bCount: 0, cCount: 0, storeCount: 0 };

      dataRows.push(
        [
          String(pRow.platformName),
          storeCount,
          stats.total.toFixed(2),
          stats.aCount,
          stats.bCount,
          stats.cCount,
        ]
          .map((v) => escapeCsv(v))
          .join(','),
      );

      totalStores += storeCount;
      totalRevenue += stats.total;
      totalA += stats.aCount;
      totalB += stats.bCount;
      totalC += stats.cCount;
    }

    // 合计行
    dataRows.push(
      ['合计', totalStores, totalRevenue.toFixed(2), totalA, totalB, totalC]
        .map((v) => escapeCsv(v))
        .join(','),
    );

    return BOM + header + '\n' + dataRows.join('\n');
  }
}
