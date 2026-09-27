import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { RoleGuard, Roles } from '@server/common/guards/role.guard';
import type {
  StoreInfo,
  StoreListResponse,
  StoreStatus,
  AbcCategory,
  BatchUpdateOwnerResult,
} from '@shared/api.interface';
import { BATCH_OWNER_MAX_COUNT } from '@shared/api.interface';

interface CreateStoreBody {
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
  extra?: Record<string, unknown>;
}

interface UpdateStoreBody {
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
  extra?: Record<string, unknown>;
}

interface UpdateStatusBody {
  status: StoreStatus;
}

@Controller('api/stores')
@UseGuards(RoleGuard)
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('owners')
  async listOwners(@Query('platformKey') platformKey: string): Promise<string[]> {
    if (!platformKey) throw new BadRequestException('platformKey 必填');
    return this.storeService.listOwners(platformKey);
  }

  @Get()
  async listStores(
    @Query('platformKey') platformKey: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: StoreStatus,
    @Query('abcCategory') abcCategory?: AbcCategory,
    @Query('owner') owner?: string,
  ): Promise<StoreListResponse> {
    if (!platformKey) throw new BadRequestException('platformKey 必填');
    return this.storeService.listStores({
      platformKey,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      search,
      status,
      abcCategory,
      owner,
    });
  }

  @Get(':id')
  async getStore(
    @Param('id') id: string,
    @Query('month') month?: string,
  ): Promise<StoreInfo> {
    return this.storeService.getStore(id, month);
  }

  @Post()
  @Roles('admin', 'platform_owner', 'editor')
  async createStore(@Body() body: CreateStoreBody): Promise<StoreInfo> {
    if (!body.platformKey || !body.storeId) {
      throw new BadRequestException('platformKey 和 storeId 必填');
    }
    return this.storeService.createStore(body);
  }

  @Patch('batch-owner')
  @Roles('admin', 'platform_owner', 'editor')
  async batchUpdateOwner(@Body() body: {
    ids: string[];
    owner: string;
  }): Promise<BatchUpdateOwnerResult> {
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      throw new BadRequestException('ids 必填且不能为空数组');
    }
    if (body.ids.length > BATCH_OWNER_MAX_COUNT) {
      throw new BadRequestException(`单次最多处理 ${BATCH_OWNER_MAX_COUNT} 条`);
    }
    if (typeof body.owner !== 'string') {
      throw new BadRequestException('owner 必填');
    }
    const owner = body.owner.trim();
    if (owner.length === 0) {
      throw new BadRequestException('负责人姓名不能为空');
    }
    if (owner.length > 100) {
      throw new BadRequestException('负责人姓名长度不能超过 100 个字符');
    }
    return this.storeService.batchUpdateOwner(body.ids, owner);
  }

  @Patch(':id')
  @Roles('admin', 'platform_owner', 'editor')
  async updateStore(
    @Param('id') id: string,
    @Body() body: UpdateStoreBody,
  ): Promise<StoreInfo> {
    return this.storeService.updateStore(id, body);
  }

  @Patch(':id/status')
  @Roles('admin', 'platform_owner', 'editor')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateStatusBody,
  ): Promise<StoreInfo> {
    if (!body.status) {
      throw new BadRequestException('status 必填');
    }
    return this.storeService.updateStoreStatus(id, body.status);
  }

  @Delete(':id')
  @Roles('admin')
  async deleteStore(@Param('id') id: string): Promise<{ success: true }> {
    await this.storeService.deleteStore(id);
    return { success: true };
  }
}
