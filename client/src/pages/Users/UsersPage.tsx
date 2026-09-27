import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import { Button } from '@client/src/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { Badge } from '@client/src/components/ui/badge';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { authApi, platformApi } from '@client/src/api';
import UserFormModal from './UserFormModal';
import type {
  CreateUserRequest,
  PermissionLevel,
  PlatformInfo,
  UpdateUserRequest,
  UserInfo,
  UserRole,
  UserPlatformPermissionInfo,
} from '@shared/api.interface';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '管理员',
  platform_owner: '平台负责人',
  editor: '录入员',
  viewer: '只读',
};

const PERM_LABELS: Record<PermissionLevel, string> = {
  manage: '管理',
  edit: '编辑',
  view: '查看',
  none: '无权限',
};

const ROLE_VARIANT: Record<UserRole, string> = {
  admin: 'default',
  platform_owner: 'default',
  editor: 'secondary',
  viewer: 'outline',
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [platformLoading, setPlatformLoading] = useState<boolean>(false);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [tip, setTip] = useState<string>('');

  const loadUsers: () => Promise<void> = useCallback(async () => {
    setLoading(true);
    try {
      const data: UserInfo[] = await authApi.listUsers();
      setUsers(data);
    } catch (err: unknown) {
      logger.error('load users failed', err);
      setTip('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlatforms: () => Promise<void> = useCallback(async () => {
    setPlatformLoading(true);
    try {
      const data: PlatformInfo[] = await platformApi.listPlatforms();
      setPlatforms(data);
    } catch (err: unknown) {
      logger.error('load platforms failed', err);
    } finally {
      setPlatformLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    void loadPlatforms();
  }, [loadUsers, loadPlatforms]);

  const handleAdd: () => void = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const handleEdit: (user: UserInfo) => void = (user: UserInfo) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleSubmit: (
    data: CreateUserRequest | UpdateUserRequest,
  ) => Promise<void> = async (
    data: CreateUserRequest | UpdateUserRequest,
  ) => {
    setSubmitting(true);
    try {
      if (editingUser) {
        await authApi.updateUser(
          editingUser.id,
          data as UpdateUserRequest,
        );
        setTip('用户更新成功');
      } else {
        await authApi.createUser(data as CreateUserRequest);
        setTip('用户创建成功');
      }
      setModalOpen(false);
      void loadUsers();
    } catch (err: unknown) {
      logger.error('save user failed', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const platformNameMap: Record<string, string> = platforms.reduce(
    (acc: Record<string, string>, p: PlatformInfo) => {
      acc[p.platformKey] = p.platformName;
      return acc;
    },
    {},
  );

  const renderPlatformPerms: (
    perms: UserPlatformPermissionInfo[] | undefined,
  ) => React.ReactNode = (
    perms: UserPlatformPermissionInfo[] | undefined,
  ) => {
    if (!perms || perms.length === 0) return '-';
    const hasPerm: UserPlatformPermissionInfo[] = perms.filter(
      (p: UserPlatformPermissionInfo) =>
        p.permissionLevel && p.permissionLevel !== 'none',
    );
    if (hasPerm.length === 0) return '-';
    return (
      <div className="flex flex-wrap gap-1">
        {hasPerm.map((p: UserPlatformPermissionInfo) => (
          <Badge
            key={p.platformKey}
            variant="outline"
            className="text-xs font-normal"
          >
            {platformNameMap[p.platformKey] || p.platformKey}:{' '}
            {PERM_LABELS[p.permissionLevel] || p.permissionLevel}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">用户管理</h1>
        <Button onClick={handleAdd}>新增用户</Button>
      </div>

      {tip && (
        <div className="mb-4 text-sm text-green-600">{tip}</div>
      )}

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">
              加载中...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>显示名称</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>平台权限</TableHead>
                  <TableHead className="text-right w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-10 text-muted-foreground"
                    >
                      暂无用户
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user: UserInfo) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username}
                      </TableCell>
                      <TableCell>
                        {user.displayName || user.username}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (ROLE_VARIANT[user.role] as
                              | 'default'
                              | 'secondary'
                              | 'outline'
                              | 'destructive') || 'outline'
                          }
                        >
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            user.isActive
                              ? 'text-green-600'
                              : 'text-muted-foreground'
                          }
                        >
                          {user.isActive ? '启用' : '禁用'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {renderPlatformPerms(user.platformPermissions)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          编辑
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UserFormModal
        open={modalOpen}
        onOpenChange={(open: boolean) => {
          if (!open && !submitting) setModalOpen(false);
        }}
        user={editingUser}
        platforms={platforms}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
      {platformLoading && null}
    </div>
  );
};

export default UsersPage;
