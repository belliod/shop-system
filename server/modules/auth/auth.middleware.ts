import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  isActive: boolean;
  displayName?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const token = req.headers['x-auth-token'] as string | undefined;
    if (!token) {
      next();
      return;
    }

    const userId = this.authService.getUserIdByToken(token);
    if (!userId) {
      next();
      return;
    }

    const user = await this.authService.getUserById(userId);
    if (user && user.isActive) {
      req.user = user as AuthUser;
    }

    next();
  }
}
