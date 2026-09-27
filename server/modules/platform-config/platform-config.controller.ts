import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { PlatformConfigService } from './platform-config.service';
import { RoleGuard, Roles } from '@server/common/guards/role.guard';
import type { PlatformInfo } from '@shared/api.interface';

interface CreatePlatformBody {
  platformKey: string;
  platformName: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

interface UpdatePlatformBody {
  platformName?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

@Controller('api/platforms')
@UseGuards(RoleGuard)
export class PlatformConfigController {
  constructor(private readonly platformConfigService: PlatformConfigService) {}

  @Get()
  async listPlatforms(): Promise<PlatformInfo[]> {
    return this.platformConfigService.listPlatforms();
  }

  @Post()
  @Roles('admin')
  async createPlatform(@Body() body: CreatePlatformBody): Promise<PlatformInfo> {
    if (!body.platformKey || !body.platformName) {
      throw new BadRequestException('platformKey 和 platformName 必填');
    }
    return this.platformConfigService.createPlatform(body);
  }

  @Patch(':id')
  @Roles('admin')
  async updatePlatform(
    @Param('id') id: string,
    @Body() body: UpdatePlatformBody,
  ): Promise<PlatformInfo> {
    return this.platformConfigService.updatePlatform(id, body);
  }
}
