import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, count, desc, ilike, or, isNotNull, sql } from 'drizzle-orm';
import { store, monthlyRevenue } from '@server/database/schema';
import { SettingsService } from '../settings/settings.service';
import type {
  StoreInfo,
  StoreExtra,
  StoreListParams,
  StoreListResponse,
  StoreStatus,
  AbcCategory,
  WeeklyRevenueItem,
} from '@shared/api.interface';

interface CreateStoreDto {
  platformKey: string;
  storeId: string;
  storeName?: string;
  owner?: string;
  phone?: string;
  address?: string;
  menuType?: string;
  status?: string;
  signTime?: string;
  cancelTime?: string;
  shopNotes?: string;
  newStoreNotes?: string;
  extra?: StoreExtra;
}

interface UpdateStoreDto {
  storeName?: string;
  owner?: string;
  phone?: string;
  address?: string;
  menuType?: string;
  status?: string;
  signTime?: string;
  cancelTime?: string;
  shopNotes?: string;
  newStoreNotes?: string;
  extra?: StoreExtra;
}

interface LatestRevenueItem {
  revenue: number;
  period: string;
}

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly settingsService: SettingsService,
  ) {}

  private toStoreInfo(row: typeof store.$inferSelect): StoreInfo {
    return {
      id: row.id,
      platformKey: row.platformKey,
      storeId: row.storeId,
      storeName: row.storeName ?? undefined,
      owner: row.owner ?? undefined,
      phone: row.phone ?? undefined,
      address: row.address ?? undefined,
      menuType: row.menuType ?? undefined,
      status: (row.status as StoreStatus) ?? undefined,
      signTime: row.signTime ?? undefined,
      cancelTime: row.cancelTime ?? undefined,
      shopNotes: row.shopNotes ?? undefined,
      newStoreNotes: row.newStoreNotes ?? undefined,
      extra: (row.extra as StoreExtra | null) ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private computeAbcCategory(revenue: number | null | undefined): AbcCategory {
    if (revenue == null) return 'none';
    const threshold = this.settingsService.getAbcThreshold();
    if (revenue >= threshold.aMin) return 'A';
    if (revenue >= threshold.bMin && revenue < threshold.bMax) return 'B';
    return 'C';
  }

  async getStoresWithLatestRevenue(
    items: StoreInfo[],
  ): Promise<Map<string, LatestRevenueItem>> {
    const result = new Map<string, LatestRevenueItem>();
    if (items.length === 0) return result;

    // 按平台分组，用每个平台的 storeId 列表查询
    const byPlatform = new Map<string, string[]>();
    for (const item of items) {
      const list = byPlatform.get(item.platformKey) ?? [];
      list.push(item.storeId);
      byPlatform.set(item.platformKey, list);
    }

    for (const [pk, storeIds] of byPlatform) {
      const idsSql = sql.join(
        storeIds.map((sid) => sql`${sid}`),
        sql`, `,
      );
      const rows = await this.db.execute(sql`
        SELECT DISTINCT ON (mr.platform_key, mr.store_id)
          mr.platform_key AS "platformKey",
          mr.store_id AS "storeId",
          mr.month AS period,
          mr.revenue AS revenue
        FROM ${monthlyRevenue} mr
        WHERE mr.platform_key = ${pk}
          AND mr.store_id = ANY(ARRAY[${idsSql}]::varchar[])
          AND mr.month LIKE '____-__'
        ORDER BY mr.platform_key, mr.store_id, mr.month DESC
      `);

      const rawRows = rows as unknown as Array<Record<string, unknown>>;
      for (const row of rawRows) {
        const key = `${String(row.platformKey)}:${String(row.storeId)}`;
        result.set(key, {
          revenue: Number(row.revenue),
          period: String(row.period),
        });
      }
    }
    return result;
  }

  private attachAbcInfo(
    items: StoreInfo[],
    revenueMap: Map<string, LatestRevenueItem>,
  ): StoreInfo[] {
    return items.map((item: StoreInfo) => {
      const key = `${item.platformKey}:${item.storeId}`;
      const latest = revenueMap.get(key);
      if (latest) {
        return {
          ...item,
          latestRevenue: latest.revenue,
          latestPeriod: latest.period,
          abcCategory: this.computeAbcCategory(latest.revenue),
        };
      }
      return {
        ...item,
        abcCategory: this.computeAbcCategory(null),
      };
    });
  }

  async listStores(params: StoreListParams): Promise<StoreListResponse> {
    const {
      platformKey,
      page = 1,
      pageSize = 20,
      search,
      status,
      abcCategory,
      owner,
    } = params;

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

    const conditions = [eq(store.platformKey, platformKey)];

    if (owner) {
      conditions.push(eq(store.owner, owner));
    }

    if (status) {
      conditions.push(eq(store.status, status));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(store.storeName, searchPattern),
          ilike(store.storeId, searchPattern),
          ilike(store.owner, searchPattern),
        ),
      );
    }

    const whereClause = and(...conditions);

    const [countResult, rows] = await Promise.all([
      this.db.select({ count: count() }).from(store).where(whereClause),
      this.db
        .select()
        .from(store)
        .where(whereClause)
        .orderBy(desc(store.createdAt))
        .limit(safePageSize)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    let items = rows.map((row) => this.toStoreInfo(row));

    // 附加最新收入和 ABC 分类
    const revenueMap = await this.getStoresWithLatestRevenue(items);
    items = this.attachAbcInfo(items, revenueMap);

    // abcCategory 过滤（在内存中过滤，因为需要计算）
    if (abcCategory) {
      items = items.filter((item) => item.abcCategory === abcCategory);
      // 注意：当 abcCategory 过滤时 total 不准确，但由于是计算字段，
      // 实际项目中应该用子查询，这里按实现建议先支持内存过滤
    }

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  async getStore(id: string, month?: string): Promise<StoreInfo> {
    const rows = await this.db.select().from(store).where(eq(store.id, id)).limit(1);
    if (rows.length === 0) throw new NotFoundException('店铺不存在');
    const item = this.toStoreInfo(rows[0]);
    const revenueMap = await this.getStoresWithLatestRevenue([item]);
    const enriched = this.attachAbcInfo([item], revenueMap);
    const result = enriched[0];
    if (month) {
      result.weeklyRevenues = await this.getStoreWeeklyRevenues(
        item.platformKey,
        item.storeId,
        month,
      );
    }
    return result;
  }

  async getStoreByPlatformAndId(platformKey: string, storeId: string): Promise<StoreInfo | null> {
    const rows = await this.db
      .select()
      .from(store)
      .where(and(eq(store.platformKey, platformKey), eq(store.storeId, storeId)))
      .limit(1);

    if (rows.length === 0) return null;
    const item = this.toStoreInfo(rows[0]);
    const revenueMap = await this.getStoresWithLatestRevenue([item]);
    const enriched = this.attachAbcInfo([item], revenueMap);
    return enriched[0];
  }

  async getStoreWeeklyRevenues(
    platformKey: string,
    storeId: string,
    month: string,
  ): Promise<WeeklyRevenueItem[]> {
    const yearPrefix = month.slice(0, 4);
    const rows = await this.db
      .select({
        month: monthlyRevenue.month,
        revenue: monthlyRevenue.revenue,
      })
      .from(monthlyRevenue)
      .where(and(
        eq(monthlyRevenue.platformKey, platformKey),
        eq(monthlyRevenue.storeId, storeId),
        sql`${monthlyRevenue.month} LIKE ${yearPrefix + '-W%'}`,
      ))
      .orderBy(monthlyRevenue.month);

    return rows.map((row: { month: string; revenue: string | number }) => ({
      week: row.month,
      revenue: Number(row.revenue),
    }));
  }

  async createStore(dto: CreateStoreDto): Promise<StoreInfo> {
    const rows = await this.db
      .insert(store)
      .values({
        platformKey: dto.platformKey,
        storeId: dto.storeId,
        storeName: dto.storeName,
        owner: dto.owner,
        phone: dto.phone,
        address: dto.address,
        menuType: dto.menuType,
        status: dto.status,
        signTime: dto.signTime,
        cancelTime: dto.cancelTime,
        shopNotes: dto.shopNotes,
        newStoreNotes: dto.newStoreNotes,
        extra: dto.extra ?? {},
      })
      .returning();

    const row = rows[0];
    this.logger.log(`创建店铺成功: ${row.platformKey}/${row.storeId}`);
    return this.toStoreInfo(row);
  }

  async updateStore(id: string, dto: UpdateStoreDto): Promise<StoreInfo> {
    const patch: Partial<typeof store.$inferInsert> = {};
    if (dto.storeName !== undefined) patch.storeName = dto.storeName;
    if (dto.owner !== undefined) patch.owner = dto.owner;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.address !== undefined) patch.address = dto.address;
    if (dto.menuType !== undefined) patch.menuType = dto.menuType;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.signTime !== undefined) patch.signTime = dto.signTime;
    if (dto.cancelTime !== undefined) patch.cancelTime = dto.cancelTime;
    if (dto.shopNotes !== undefined) patch.shopNotes = dto.shopNotes;
    if (dto.newStoreNotes !== undefined) patch.newStoreNotes = dto.newStoreNotes;
    if (dto.extra !== undefined) patch.extra = dto.extra as typeof store.$inferInsert.extra;

    if (Object.keys(patch).length === 0) {
      return this.getStore(id);
    }

    const rows = await this.db
      .update(store)
      .set(patch)
      .where(eq(store.id, id))
      .returning();

    if (rows.length === 0) throw new NotFoundException('店铺不存在');

    this.logger.log(`更新店铺成功: ${id}`);
    const item = this.toStoreInfo(rows[0]);
    const revenueMap = await this.getStoresWithLatestRevenue([item]);
    const enriched = this.attachAbcInfo([item], revenueMap);
    return enriched[0];
  }

  async updateStoreStatus(id: string, status: StoreStatus): Promise<StoreInfo> {
    const rows = await this.db
      .update(store)
      .set({ status })
      .where(eq(store.id, id))
      .returning();

    if (rows.length === 0) throw new NotFoundException('店铺不存在');

    this.logger.log(`更新店铺状态成功: ${id} -> ${status}`);
    const item = this.toStoreInfo(rows[0]);
    const revenueMap = await this.getStoresWithLatestRevenue([item]);
    const enriched = this.attachAbcInfo([item], revenueMap);
    return enriched[0];
  }

  async deleteStore(id: string): Promise<void> {
    const rows = await this.db.delete(store).where(eq(store.id, id)).returning({ id: store.id });
    if (rows.length === 0) throw new NotFoundException('店铺不存在');
    this.logger.log(`删除店铺成功: ${id}`);
  }

  async listOwners(platformKey: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ owner: store.owner })
      .from(store)
      .where(and(eq(store.platformKey, platformKey), isNotNull(store.owner)))
      .orderBy(store.owner);

    return rows.map((row) => row.owner).filter((o): o is string => o !== null);
  }

  async batchUpdateOwner(
    ids: string[],
    owner: string,
  ): Promise<{
    successCount: number;
    failCount: number;
    totalCount: number;
    failedIds: Array<{ id: string; reason: string }>;
  }> {
    const uniqueIds = Array.from(new Set(ids));
    const failedIds: Array<{ id: string; reason: string }> = [];
    let successCount = 0;

    for (const id of uniqueIds) {
      try {
        const rows = await this.db
          .update(store)
          .set({ owner: owner || null })
          .where(eq(store.id, id))
          .returning({ id: store.id });

        if (rows.length === 0) {
          failedIds.push({ id, reason: '店铺不存在' });
        } else {
          successCount += 1;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '更新失败';
        this.logger.error(`批量设置负责人失败 id=${id}: ${msg}`, err instanceof Error ? err.stack : undefined);
        if (err instanceof NotFoundException) {
          failedIds.push({ id, reason: msg });
        } else {
          failedIds.push({ id, reason: '系统异常，请稍后重试' });
        }
      }
    }

    this.logger.log(
      `批量设置负责人完成: 成功 ${successCount} 条，失败 ${failedIds.length} 条，共 ${uniqueIds.length} 条`,
    );

    return {
      successCount,
      failCount: failedIds.length,
      totalCount: uniqueIds.length,
      failedIds,
    };
  }
}
