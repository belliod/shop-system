import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { monthlyRevenue, store } from '@server/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import type {
  MonthlyRevenueInfo,
  RevenueListParams,
  RevenueUpsertRequest,
  ExcelImportRow,
  ExcelImportResult,
  RevenuePeriodType,
} from '@shared/api.interface';

function formatMonthKey(
  periodType: RevenuePeriodType,
  year: number,
  periodIndex: number,
): string {
  if (periodType === 'week') {
    return `${year}-W${String(periodIndex).padStart(2, '0')}`;
  }
  return `${year}-${String(periodIndex).padStart(2, '0')}`;
}

function parseMonthKey(month: string): {
  periodType: RevenuePeriodType;
  year: number;
  periodIndex: number;
} {
  if (month.includes('-W')) {
    const [yearStr, weekStr] = month.split('-W');
    return {
      periodType: 'week',
      year: parseInt(yearStr, 10),
      periodIndex: parseInt(weekStr, 10),
    };
  }
  const [yearStr, monthStr] = month.split('-');
  return {
    periodType: 'month',
    year: parseInt(yearStr, 10),
    periodIndex: parseInt(monthStr, 10),
  };
}

@Injectable()
export class RevenueService {
  private readonly logger = new Logger(RevenueService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async upsertRevenue(dto: RevenueUpsertRequest): Promise<MonthlyRevenueInfo> {
    const { platformKey, storeId, revenue } = dto;

    let month = dto.month;
    if (!month && dto.periodType && dto.year && dto.periodIndex !== undefined) {
      month = formatMonthKey(dto.periodType, dto.year, dto.periodIndex);
    }

    const revenueStr = String(revenue);

    const result = await this.db.execute(sql`
      INSERT INTO ${monthlyRevenue} (platform_key, store_id, month, revenue)
      VALUES (${platformKey}, ${storeId}, ${month}, ${revenueStr}::numeric)
      ON CONFLICT (platform_key, store_id, month)
      DO UPDATE SET revenue = EXCLUDED.revenue
      RETURNING id, platform_key, store_id, month, revenue
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    const row = rows[0];
    return this.toMonthlyRevenueInfo(row);
  }

  async batchUpsert(items: RevenueUpsertRequest[]): Promise<{ count: number }> {
    if (items.length === 0) return { count: 0 };

    const valuesSql = sql.join(
      items.map((item: RevenueUpsertRequest) => {
        let month = item.month;
        if (!month && item.periodType && item.year && item.periodIndex !== undefined) {
          month = formatMonthKey(item.periodType, item.year, item.periodIndex);
        }
        return sql`(${item.platformKey}, ${item.storeId}, ${month}, ${String(item.revenue)}::numeric)`;
      }),
      sql`, `,
    );

    await this.db.execute(sql`
      INSERT INTO ${monthlyRevenue} (platform_key, store_id, month, revenue)
      VALUES ${valuesSql}
      ON CONFLICT (platform_key, store_id, month)
      DO UPDATE SET revenue = EXCLUDED.revenue
    `);

    return { count: items.length };
  }

  async importExcel(rows: ExcelImportRow[]): Promise<ExcelImportResult> {
    const totalCount = rows.length;
    const failedRows: ExcelImportResult['failedRows'] = [];
    const successRows: ExcelImportRow[] = [];

    // 收集所有 platformKey+storeId，一次性查找店铺
    const keySet = new Set<string>();
    for (const row of rows) {
      keySet.add(`${row.platformKey}:${row.storeId}`);
    }

    // 查找所有存在的店铺
    const validKeys = new Set<string>();
    if (keySet.size > 0) {
      const keys = Array.from(keySet);
      // 用 (platform_key, store_id) IN (VALUES ...) 批量查询
      const valuesSql = sql.join(
        keys.map((k) => {
          const [pk, sid] = k.split(':');
          return sql`(${pk}, ${sid})`;
        }),
        sql`, `,
      );
      const result = await this.db.execute(sql`
        SELECT s.platform_key AS "platformKey", s.store_id AS "storeId"
        FROM ${store} s
        WHERE (s.platform_key, s.store_id) IN (VALUES ${valuesSql})
      `);
      const storeRows = result as unknown as Array<Record<string, unknown>>;

      for (const sr of storeRows) {
        validKeys.add(`${String(sr.platformKey)}:${String(sr.storeId)}`);
      }
    }

    // 分批处理成功的行
    const upsertItems: RevenueUpsertRequest[] = [];

    for (const row of rows) {
      const key = `${row.platformKey}:${row.storeId}`;
      if (!validKeys.has(key)) {
        failedRows.push({
          rowNumber: row.rowNumber ?? 0,
          storeId: row.storeId,
          platformKey: row.platformKey,
          reason: '店铺不存在',
        });
        continue;
      }

      if (!row.periodType || !row.year || row.periodIndex == null) {
        failedRows.push({
          rowNumber: row.rowNumber ?? 0,
          storeId: row.storeId,
          platformKey: row.platformKey,
          reason: '周期信息不完整',
        });
        continue;
      }

      if (typeof row.revenue !== 'number' || isNaN(row.revenue)) {
        failedRows.push({
          rowNumber: row.rowNumber ?? 0,
          storeId: row.storeId,
          platformKey: row.platformKey,
          reason: '收入金额无效',
        });
        continue;
      }

      const month = formatMonthKey(row.periodType, row.year, row.periodIndex);
      upsertItems.push({
        platformKey: row.platformKey,
        storeId: row.storeId,
        month,
        revenue: row.revenue,
        periodType: row.periodType,
        year: row.year,
        periodIndex: row.periodIndex,
      });
      successRows.push(row);
    }

    if (upsertItems.length > 0) {
      await this.batchUpsert(upsertItems);
    }

    return {
      successCount: successRows.length,
      failCount: failedRows.length,
      totalCount,
      failedRows,
      successRows,
    };
  }

  async listRevenues(params: RevenueListParams): Promise<MonthlyRevenueInfo[]> {
    const { platformKey, month, storeId, periodType, year, periodIndex } = params;
    const conditions = [];
    if (platformKey) conditions.push(eq(monthlyRevenue.platformKey, platformKey));
    if (storeId) conditions.push(eq(monthlyRevenue.storeId, storeId));

    if (month) {
      conditions.push(eq(monthlyRevenue.month, month));
    } else if (periodType && year && periodIndex !== undefined) {
      const monthKey = formatMonthKey(periodType, year, periodIndex);
      conditions.push(eq(monthlyRevenue.month, monthKey));
    } else if (periodType && year) {
      // 按年+类型前缀过滤
      const prefix =
        periodType === 'week' ? `${year}-W` : `${year}-`;
      conditions.push(sql`${monthlyRevenue.month} LIKE ${prefix + '%'}`);
    }

    const baseSelect = this.db
      .select({
        id: monthlyRevenue.id,
        platformKey: monthlyRevenue.platformKey,
        storeId: monthlyRevenue.storeId,
        month: monthlyRevenue.month,
        revenue: monthlyRevenue.revenue,
        storeName: store.storeName,
      })
      .from(monthlyRevenue)
      .leftJoin(
        store,
        and(
          eq(monthlyRevenue.platformKey, store.platformKey),
          eq(monthlyRevenue.storeId, store.storeId),
        ),
      );

    const query =
      conditions.length > 0
        ? baseSelect.where(and(...conditions)).orderBy(monthlyRevenue.month, monthlyRevenue.storeId)
        : baseSelect.orderBy(monthlyRevenue.month, monthlyRevenue.storeId);

    const rows = await query;
    return rows.map((row: typeof rows[number]) => {
      const parsed = parseMonthKey(row.month);
      return {
        id: row.id,
        platformKey: row.platformKey,
        storeId: row.storeId,
        month: row.month,
        revenue: Number(row.revenue),
        storeName: row.storeName ?? undefined,
        periodType: parsed.periodType,
        year: parsed.year,
        periodIndex: parsed.periodIndex,
      };
    });
  }

  async getRevenueByStoreMonth(
    platformKey: string,
    storeId: string,
    month: string,
  ): Promise<MonthlyRevenueInfo | null> {
    const rows = await this.db
      .select({
        id: monthlyRevenue.id,
        platformKey: monthlyRevenue.platformKey,
        storeId: monthlyRevenue.storeId,
        month: monthlyRevenue.month,
        revenue: monthlyRevenue.revenue,
        storeName: store.storeName,
      })
      .from(monthlyRevenue)
      .leftJoin(
        store,
        and(
          eq(monthlyRevenue.platformKey, store.platformKey),
          eq(monthlyRevenue.storeId, store.storeId),
        ),
      )
      .where(
        and(
          eq(monthlyRevenue.platformKey, platformKey),
          eq(monthlyRevenue.storeId, storeId),
          eq(monthlyRevenue.month, month),
        ),
      );

    if (rows.length === 0) return null;
    const row = rows[0];
    const parsed = parseMonthKey(row.month);
    return {
      id: row.id,
      platformKey: row.platformKey,
      storeId: row.storeId,
      month: row.month,
      revenue: Number(row.revenue),
      storeName: row.storeName ?? undefined,
      periodType: parsed.periodType,
      year: parsed.year,
      periodIndex: parsed.periodIndex,
    };
  }

  async deleteRevenue(id: string): Promise<void> {
    const result = await this.db
      .delete(monthlyRevenue)
      .where(eq(monthlyRevenue.id, id))
      .returning({ id: monthlyRevenue.id });
    if (result.length === 0) {
      throw new NotFoundException('收入记录不存在');
    }
  }

  private toMonthlyRevenueInfo(row: Record<string, unknown>): MonthlyRevenueInfo {
    const monthStr = String(row.month);
    const parsed = parseMonthKey(monthStr);
    return {
      id: String(row.id),
      platformKey: String(row.platform_key),
      storeId: String(row.store_id),
      month: monthStr,
      revenue: Number(row.revenue),
      periodType: parsed.periodType,
      year: parsed.year,
      periodIndex: parsed.periodIndex,
    };
  }
}
