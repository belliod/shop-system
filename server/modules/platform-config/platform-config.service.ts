import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, asc } from 'drizzle-orm';
import { platform } from '@server/database/schema';
import type { PlatformInfo } from '@shared/api.interface';

interface CreatePlatformDto {
  platformKey: string;
  platformName: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

interface UpdatePlatformDto {
  platformName?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable()
export class PlatformConfigService {
  private readonly logger = new Logger(PlatformConfigService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async listPlatforms(): Promise<PlatformInfo[]> {
    const rows = await this.db
      .select()
      .from(platform)
      .where(eq(platform.isActive, true))
      .orderBy(asc(platform.sortOrder));

    return rows.map((row) => ({
      id: row.id,
      platformKey: row.platformKey,
      platformName: row.platformName,
      description: row.description ?? undefined,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    }));
  }

  async getPlatformByKey(platformKey: string): Promise<PlatformInfo | null> {
    const rows = await this.db
      .select()
      .from(platform)
      .where(eq(platform.platformKey, platformKey))
      .limit(1);

    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      platformKey: row.platformKey,
      platformName: row.platformName,
      description: row.description ?? undefined,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    };
  }

  async createPlatform(dto: CreatePlatformDto): Promise<PlatformInfo> {
    const rows = await this.db
      .insert(platform)
      .values({
        platformKey: dto.platformKey,
        platformName: dto.platformName,
        description: dto.description,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      })
      .returning();

    const row = rows[0];
    this.logger.log(`创建平台成功: ${row.platformKey}`);
    return {
      id: row.id,
      platformKey: row.platformKey,
      platformName: row.platformName,
      description: row.description ?? undefined,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    };
  }

  async updatePlatform(id: string, dto: UpdatePlatformDto): Promise<PlatformInfo> {
    const patch: Partial<typeof platform.$inferInsert> = {};
    if (dto.platformName !== undefined) patch.platformName = dto.platformName;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;

    if (Object.keys(patch).length === 0) {
      // Return current record if no fields to update
      const existing = await this.db.select().from(platform).where(eq(platform.id, id)).limit(1);
      if (existing.length === 0) throw new NotFoundException('平台不存在');
      const row = existing[0];
      return {
        id: row.id,
        platformKey: row.platformKey,
        platformName: row.platformName,
        description: row.description ?? undefined,
        isActive: row.isActive,
        sortOrder: row.sortOrder,
      };
    }

    const rows = await this.db
      .update(platform)
      .set(patch)
      .where(eq(platform.id, id))
      .returning();

    if (rows.length === 0) throw new NotFoundException('平台不存在');

    const row = rows[0];
    this.logger.log(`更新平台成功: ${row.platformKey}`);
    return {
      id: row.id,
      platformKey: row.platformKey,
      platformName: row.platformName,
      description: row.description ?? undefined,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    };
  }
}
