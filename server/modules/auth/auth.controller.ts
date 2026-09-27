import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RoleGuard, Roles } from '@server/common/guards/role.guard';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserInfo,
  CreateUserRequest,
  UpdateUserRequest,
} from '@shared/api.interface';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterRequest): Promise<UserInfo> {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginRequest): Promise<LoginResponse> {
    return this.authService.login(dto.username, dto.password);
  }

  @Get('me')
  @UseGuards(RoleGuard)
  async getMe(@Req() req: Request): Promise<UserInfo> {
    if (!req.user) {
      throw new UnauthorizedException('请先登录');
    }
    return this.authService.getUserWithPermissions(req.user.id);
  }

  @Get('users')
  @UseGuards(RoleGuard)
  @Roles('admin')
  async listUsers(): Promise<UserInfo[]> {
    return this.authService.listUsers();
  }

  @Post('users')
  @UseGuards(RoleGuard)
  @Roles('admin')
  async createUser(@Body() dto: CreateUserRequest): Promise<UserInfo> {
    return this.authService.createUser(dto);
  }

  @Patch('users/:id')
  @UseGuards(RoleGuard)
  @Roles('admin')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserRequest,
  ): Promise<UserInfo> {
    return this.authService.updateUser(id, dto);
  }
}
