import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Button } from '@client/src/components/ui/button';
import { Switch } from '@client/src/components/ui/switch';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CreateUserRequest,
  PermissionLevel,
  PlatformInfo,
  UpdateUserRequest,
  UserInfo,
  UserRole,
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

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserInfo | null;
  platforms: PlatformInfo[];
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  submitting: boolean;
}

type PlatformPermMap = Record<string, PermissionLevel>;

const UserFormModal: React.FC<UserFormModalProps> = ({
  open,
  onOpenChange,
  user,
  platforms,
  onSubmit,
  submitting,
}) => {
  const isEdit: boolean = !!user;

  const [username, setUsername] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [platformPerms, setPlatformPerms] = useState<PlatformPermMap>({});
  const [errorTip, setErrorTip] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setErrorTip('');
    if (user) {
      setUsername(user.username);
      setDisplayName(user.displayName || '');
      setPassword('');
      setRole(user.role);
      setIsActive(user.isActive);
      const perms: PlatformPermMap = {};
      user.platformPermissions?.forEach(
        (p: { platformKey: string; permissionLevel: PermissionLevel }) => {
          perms[p.platformKey] = p.permissionLevel;
        },
      );
      setPlatformPerms(perms);
    } else {
      setUsername('');
      setDisplayName('');
      setPassword('');
      setRole('viewer');
      setIsActive(true);
      setPlatformPerms({});
    }
  }, [open, user]);

  const handlePermChange: (platformKey: string, val: string) => void = (
    platformKey: string,
    val: string,
  ) => {
    setPlatformPerms((prev: PlatformPermMap) => ({
      ...prev,
      [platformKey]: val as PermissionLevel,
    }));
  };

  const handleSubmit: (e: React.FormEvent) => Promise<void> = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();
    setErrorTip('');
    if (!isEdit) {
      if (!username.trim()) {
        setErrorTip('请输入用户名');
        return;
      }
      if (!password) {
        setErrorTip('请设置密码');
        return;
      }
      if (password.length < 6) {
        setErrorTip('密码长度不能少于 6 位');
        return;
      }
    }
    const platformPermissions: Array<{
      platformKey: string;
      permissionLevel: PermissionLevel;
    }> = Object.entries(platformPerms).map(
      ([platformKey, permissionLevel]: [string, PermissionLevel]) => ({
        platformKey,
        permissionLevel,
      }),
    );
    try {
      if (isEdit && user) {
        const data: UpdateUserRequest = {
          displayName,
          role,
          isActive,
          platformPermissions,
        };
        if (password) data.password = password;
        await onSubmit(data);
      } else {
        await onSubmit({
          username: username.trim(),
          password,
          displayName,
          role,
          platformPermissions,
        } as CreateUserRequest);
      }
    } catch (err: unknown) {
      logger.error('user form submit failed', err);
      setErrorTip('提交失败，请重试');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑用户' : '新增用户'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="w-24 text-right shrink-0">用户名</Label>
            <div className="flex-1">
              <Input
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUsername(e.target.value)
                }
                disabled={isEdit}
                placeholder="请输入用户名"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="w-24 text-right shrink-0">显示名称</Label>
            <div className="flex-1">
              <Input
                value={displayName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDisplayName(e.target.value)
                }
                placeholder="请输入显示名称"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="w-24 text-right shrink-0">密码</Label>
            <div className="flex-1">
              <Input
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                placeholder={isEdit ? '留空表示不修改密码' : '请设置密码'}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="w-24 text-right shrink-0">角色</Label>
            <div className="flex-1">
              <Select
                value={role}
                onValueChange={(val: string) => setRole(val as UserRole)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(
                    ([key, label]: [string, string]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="w-24 text-right shrink-0">状态</Label>
            <div className="flex-1 flex items-center gap-3">
              <Switch
                checked={isActive}
                onCheckedChange={(checked: boolean) => setIsActive(checked)}
              />
              <span className="text-sm">{isActive ? '启用' : '禁用'}</span>
            </div>
          </div>
          <div className="flex items-start gap-3 pt-2">
            <Label className="w-24 text-right shrink-0 pt-2">平台权限</Label>
            <div className="flex-1 space-y-2">
              {platforms.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无平台</div>
              ) : (
                platforms.map((p: PlatformInfo) => (
                  <div key={p.platformKey} className="flex items-center gap-3">
                    <span className="text-sm w-28 truncate">
                      {p.platformName}
                    </span>
                    <Select
                      value={platformPerms[p.platformKey] || 'none'}
                      onValueChange={(val: string) =>
                        handlePermChange(p.platformKey, val)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PERM_LABELS).map(
                          ([key, label]: [string, string]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ))
              )}
            </div>
          </div>
          {errorTip && (
            <div className="text-sm text-destructive ml-[6.25rem]">
              {errorTip}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '提交中...' : isEdit ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormModal;
