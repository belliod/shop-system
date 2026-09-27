import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Switch } from '@client/src/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { platformApi } from '@client/src/api';
import type { PlatformInfo } from '@shared/api.interface';

interface PlatformFormState {
  platformKey: string;
  platformName: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY_PLATFORM_FORM: PlatformFormState = {
  platformKey: '',
  platformName: '',
  description: '',
  sortOrder: '0',
  isActive: true,
};

const PlatformManagement: React.FC = () => {
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlatformFormState>(EMPTY_PLATFORM_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadPlatforms: () => Promise<void> = useCallback(async () => {
    setLoading(true);
    try {
      const data: PlatformInfo[] = await platformApi.listPlatforms();
      setPlatforms(
        [...data].sort(
          (a: PlatformInfo, b: PlatformInfo) => a.sortOrder - b.sortOrder,
        ),
      );
    } catch (err: unknown) {
      logger.error('load platforms failed', err);
      toast.error('加载平台列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlatforms();
  }, [loadPlatforms]);

  const handleAdd: () => void = () => {
    setEditingId(null);
    setForm({ ...EMPTY_PLATFORM_FORM });
    setDialogOpen(true);
  };

  const handleEdit: (p: PlatformInfo) => void = (p: PlatformInfo) => {
    setEditingId(p.id);
    setForm({
      platformKey: p.platformKey,
      platformName: p.platformName,
      description: p.description ?? '',
      sortOrder: String(p.sortOrder),
      isActive: p.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit: () => Promise<void> = async () => {
    if (!form.platformKey.trim()) {
      toast.error('请输入平台编码');
      return;
    }
    if (!form.platformName.trim()) {
      toast.error('请输入平台名称');
      return;
    }
    const sortOrder: number = Number(form.sortOrder) || 0;
    setSubmitting(true);
    try {
      if (editingId) {
        await platformApi.updatePlatform(editingId, {
          platformName: form.platformName.trim(),
          description: form.description.trim() || undefined,
          sortOrder,
          isActive: form.isActive,
        });
        toast.success('平台已更新');
      } else {
        await platformApi.createPlatform({
          platformKey: form.platformKey.trim(),
          platformName: form.platformName.trim(),
          description: form.description.trim() || undefined,
          sortOrder,
          isActive: form.isActive,
        });
        toast.success('平台已创建');
      }
      setDialogOpen(false);
      void loadPlatforms();
    } catch (err: unknown) {
      logger.error('save platform failed', err);
      toast.error('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg">平台列表</CardTitle>
          <CardDescription className="text-sm">
            管理所有接入的平台，支持新增、编辑和启停
          </CardDescription>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="size-4" />
          新增平台
        </Button>
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
                <TableHead>平台编码</TableHead>
                <TableHead>平台名称</TableHead>
                <TableHead className="w-20">排序</TableHead>
                <TableHead className="w-20">状态</TableHead>
                <TableHead className="text-right w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platforms.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-muted-foreground"
                  >
                    暂无平台，点击右上方新增
                  </TableCell>
                </TableRow>
              ) : (
                platforms.map((p: PlatformInfo) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">
                      {p.platformKey}
                    </TableCell>
                    <TableCell>{p.platformName}</TableCell>
                    <TableCell>{p.sortOrder}</TableCell>
                    <TableCell>
                      <span
                        className={
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' +
                          (p.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600')
                        }
                      >
                        {p.isActive ? '启用' : '停用'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(p)}
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open: boolean) => {
          if (!open && !submitting) setDialogOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? '编辑平台' : '新增平台'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <Label className="w-24 text-right shrink-0">平台编码</Label>
              <div className="flex-1">
                <Input
                  value={form.platformKey}
                  onChange={(e) =>
                    setForm({ ...form, platformKey: e.target.value })
                  }
                  disabled={!!editingId}
                  placeholder="如 meituan"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-24 text-right shrink-0">平台名称</Label>
              <div className="flex-1">
                <Input
                  value={form.platformName}
                  onChange={(e) =>
                    setForm({ ...form, platformName: e.target.value })
                  }
                  placeholder="如 美团"
                />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Label className="w-24 text-right shrink-0 pt-2">描述</Label>
              <div className="flex-1">
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="选填"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-24 text-right shrink-0">排序</Label>
              <div className="flex-1">
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-24 text-right shrink-0">状态</Label>
              <div className="flex-1 flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v: boolean) =>
                    setForm({ ...form, isActive: v })
                  }
                />
                <span className="text-sm">
                  {form.isActive ? '启用' : '停用'}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PlatformManagement;
