import { Inject, Injectable, Logger, OnModuleInit, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, sql } from 'drizzle-orm';
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'crypto';
import type {
  RegisterRequest,
  LoginResponse,
  UserInfo,
  CreateUserRequest,
  UpdateUserRequest,
  UserPlatformPermissionInfo,
} from '@shared/api.interface';
import { appUser, userPlatformPermission, platform } from '@server/database/schema';

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 天
const TOKEN_SECRET =
  process.env.AUTH_TOKEN_SECRET || 'miaoda-auth-token-secret-default';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaultAdmin();
  }

  private async ensureDefaultAdmin(): Promise<void> {
    try {
      const defaultUsername = 'admin';
      const defaultPassword = 'Admin@123456';
      const passwordHash = this.hashPassword(defaultPassword);

      const existing = await this.db
        .select({ id: appUser.id, username: appUser.username })
        .from(appUser)
        .where(eq(appUser.username, defaultUsername))
        .limit(1);

      let adminId: string;
      if (existing.length > 0) {
        adminId = existing[0].id;
        await this.db
          .update(appUser)
          .set({
            passwordHash,
            displayName: '系统管理员',
            role: 'admin',
            isActive: true,
          })
          .where(eq(appUser.id, adminId));
      } else {
        const inserted = await this.db
          .insert(appUser)
          .values({
            username: defaultUsername,
            passwordHash,
            displayName: '系统管理员',
            role: 'admin',
            isActive: true,
          })
          .returning({ id: appUser.id });
        adminId = inserted[0].id;
      }

      const platforms = await this.db
        .select({ platformKey: platform.platformKey })
        .from(platform)
        .where(eq(platform.isActive, true));

      if (platforms.length > 0) {
        await this.db.execute(sql`
          INSERT INTO ${userPlatformPermission} (user_id, platform_key, permission_level)
          VALUES ${sql.join(
            platforms.map(
              (p: { platformKey: string }) =>
                sql`(${adminId}, ${p.platformKey}, 'manage')`,
            ),
            sql`, `,
          )}
          ON CONFLICT (user_id, platform_key)
          DO UPDATE SET permission_level = 'manage'
        `);
      }

      this.logger.log(
        `默认管理员账号已确保: ${defaultUsername} / ${defaultPassword} (共${platforms.length}个平台权限)`,
      );
    } catch (initErr: unknown) {
      this.logger.error(
        `默认管理员初始化失败: ${
          initErr instanceof Error ? initErr.message : String(initErr)
        }`,
      );
    }
  }

  /* ---------- 密码工具 ---------- */

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const derived = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derived}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [salt, hashHex] = stored.split(':');
    if (!salt || !hashHex) return false;
    const inputHash = scryptSync(password, salt, 64);
    const storedBuf = Buffer.from(hashHex, 'hex');
    if (inputHash.length !== storedBuf.length) return false;
    return timingSafeEqual(inputHash, storedBuf);
  }

  /* ---------- Token 工具 ---------- */

  createTokenForUser(userId: string): string {
    const createdAt = Date.now();
    const payload = Buffer.from(
      JSON.stringify({ userId, createdAt }),
    ).toString('base64url');
    const signature = createHmac('sha256', TOKEN_SECRET)
      .update(payload)
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  getUserIdByToken(token: string): string | null {
    try {
      const [payload, signature] = token.split('.');
      if (!payload || !signature) return null;
      const expected = createHmac('sha256', TOKEN_SECRET)
        .update(payload)
        .digest('base64url');
      const a = Buffer.from(signature);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
      const data = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf-8'),
      ) as { userId: string; createdAt: number };
      if (Date.now() - data.createdAt > TOKEN_TTL_MS) return null;
      return data.userId;
    } catch {
      return null;
    }
  }

  /* ---------- 用户转换 ---------- */

  private toUserInfo(row: typeof appUser.$inferSelect): UserInfo {
    return {
      id: row.id,
      username: row.username,
      displayName: row.displayName ?? undefined,
      role: row.role as UserInfo['role'],
      isActive: row.isActive,
    };
  }

  private toPermissionInfo(
    row: typeof userPlatformPermission.$inferSelect,
  ): UserPlatformPermissionInfo {
    return {
      userId: row.userId,
      platformKey: row.platformKey,
      permissionLevel: row.permissionLevel as UserPlatformPermissionInfo['permissionLevel'],
    };
  }

  /* ---------- 注册 & 登录 ---------- */

  async register(dto: RegisterRequest): Promise<UserInfo> {
    const existing = await this.db
      .select({ id: appUser.id })
      .from(appUser)
      .where(eq(appUser.username, dto.username))
      .limit(1);
    if (existing.length > 0) throw new ConflictException('用户名已存在');

    const allUsers = await this.db.select({ id: appUser.id }).from(appUser).limit(1);
    const isFirst = allUsers.length === 0;
    const role = isFirst ? 'admin' : 'viewer';
    const passwordHash = this.hashPassword(dto.password);

    const inserted = await this.db
      .insert(appUser)
      .values({ username: dto.username, passwordHash, displayName: dto.displayName, role, isActive: true })
      .returning();

    this.logger.log(`用户注册成功: ${dto.username} (${role})${isFirst ? ' - 首个管理员' : ''}`);
    return this.toUserInfo(inserted[0]);
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const cleanUsername: string = username.trim();
    if (!cleanUsername) {
      throw new UnauthorizedException('请输入用户名');
    }
    if (!password) {
      throw new UnauthorizedException('请输入密码');
    }

    const rows = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.username, cleanUsername))
      .limit(1);

    if (rows.length === 0) {
      throw new UnauthorizedException('账号不存在，请检查用户名是否正确');
    }

    const row = rows[0];
    if (!row.isActive) {
      throw new UnauthorizedException('账号已被禁用，请联系管理员');
    }
    if (!this.verifyPassword(password, row.passwordHash)) {
      throw new UnauthorizedException('密码错误，请重新输入');
    }

    const token = this.createTokenForUser(row.id);
    const user = this.toUserInfo(row);
    this.logger.log(`用户登录成功: ${cleanUsername}`);
    return { user, token };
  }

  /* ---------- 查询 ---------- */

  async getUserById(id: string): Promise<UserInfo | null> {
    const rows = await this.db.select().from(appUser).where(eq(appUser.id, id)).limit(1);
    return rows.length > 0 ? this.toUserInfo(rows[0]) : null;
  }

  async getUserWithPermissions(userId: string): Promise<UserInfo> {
    const user = await this.getUserById(userId);
    if (!user) throw new NotFoundException('用户不存在');

    const perms = await this.db
      .select()
      .from(userPlatformPermission)
      .where(eq(userPlatformPermission.userId, userId));

    user.platformPermissions = perms.map(p => this.toPermissionInfo(p));
    return user;
  }

  async listUsers(): Promise<UserInfo[]> {
    const users = await this.db.select().from(appUser);
    const result: UserInfo[] = users.map(u => this.toUserInfo(u));

    const perms = await this.db.select().from(userPlatformPermission);
    const byUser = new Map<string, UserPlatformPermissionInfo[]>();
    for (const p of perms) {
      const info = this.toPermissionInfo(p);
      byUser.set(p.userId, [...(byUser.get(p.userId) ?? []), info]);
    }
    for (const u of result) {
      u.platformPermissions = byUser.get(u.id) ?? [];
    }

    return result;
  }

  /* ---------- 用户管理 ---------- */

  async createUser(dto: CreateUserRequest): Promise<UserInfo> {
    const existing = await this.db
      .select({ id: appUser.id })
      .from(appUser)
      .where(eq(appUser.username, dto.username))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('用户名已存在');
    }

    return this.db.transaction(async tx => {
      const inserted = await tx
        .insert(appUser)
        .values({
          username: dto.username,
          passwordHash: this.hashPassword(dto.password),
          displayName: dto.displayName,
          role: dto.role,
          isActive: true,
        })
        .returning();

      const user = this.toUserInfo(inserted[0]);

      if (dto.platformPermissions && dto.platformPermissions.length > 0) {
        const values = dto.platformPermissions.map(p => ({
          userId: user.id,
          platformKey: p.platformKey,
          permissionLevel: p.permissionLevel,
        }));
        await tx.insert(userPlatformPermission).values(values);
        user.platformPermissions = values.map(v => ({
          userId: v.userId,
          platformKey: v.platformKey,
          permissionLevel: v.permissionLevel,
        }));
      }

      this.logger.log(`管理员创建用户: ${dto.username} (${dto.role})`);
      return user;
    });
  }

  async updateUser(id: string, dto: UpdateUserRequest): Promise<UserInfo> {
    const existing = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const patch: Partial<typeof appUser.$inferInsert> = {};
    if (dto.displayName !== undefined) patch.displayName = dto.displayName;
    if (dto.role !== undefined) patch.role = dto.role;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.password !== undefined) {
      patch.passwordHash = this.hashPassword(dto.password);
    }

    return this.db.transaction(async tx => {
      let user: UserInfo = this.toUserInfo(existing[0]);

      if (Object.keys(patch).length > 0) {
        const updated = await tx
          .update(appUser)
          .set(patch)
          .where(eq(appUser.id, id))
          .returning();
        user = this.toUserInfo(updated[0]);
      }

      if (dto.platformPermissions !== undefined) {
        await tx
          .delete(userPlatformPermission)
          .where(eq(userPlatformPermission.userId, id));

        if (dto.platformPermissions.length > 0) {
          const values = dto.platformPermissions.map(p => ({
            userId: id,
            platformKey: p.platformKey,
            permissionLevel: p.permissionLevel,
          }));
          await tx.insert(userPlatformPermission).values(values);
        }
      }

      const perms = await tx
        .select()
        .from(userPlatformPermission)
        .where(eq(userPlatformPermission.userId, id));
      user.platformPermissions = perms.map(p => this.toPermissionInfo(p));

      this.logger.log(`用户更新成功: id=${id}`);
      return user;
    });
  }
}
