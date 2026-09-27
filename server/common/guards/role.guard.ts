import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  UnauthorizedException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserRole } from '@shared/api.interface';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('请先登录');
    }

    if (!user.isActive) {
      throw new ForbiddenException('账号已被禁用');
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('权限不足');
    }

    return true;
  }
}
