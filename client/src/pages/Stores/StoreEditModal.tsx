import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Info } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { storeApi } from '@/api';
import { STORE_STATUS_LABELS } from '@shared/api.interface';
import type { StoreInfo, StoreStatus } from '@shared/api.interface';

interface StoreEditModalProps {
  open: boolean;
  onClose: () => void;
  store: StoreInfo | null;
  onSaved?: (updated: StoreInfo) => void;
}

interface FormState {
  storeId: string;
  platformKey: string;
  storeName: string;
  owner: string;
  address: string;
  phone: string;
  signTime: string;
  shopNotes: string;
  status: StoreStatus | '';
  menuType: string;
  cancelTime: string;
  newStoreNotes: string;
}

const initialForm: FormState = {
  storeId: '',
  platformKey: '',
  storeName: '',
  owner: '',
  address: '',
  phone: '',
  signTime: '',
  shopNotes: '',
  status: '',
  menuType: '',
  cancelTime: '',
  newStoreNotes: '',
};

const buildFormFromStore = (store: StoreInfo): FormState => ({
  storeId: store.storeId || '',
  platformKey: store.platformKey || '',
  storeName: store.storeName || '',
  owner: store.owner || '',
  address: store.address || '',
  phone: store.phone || '',
  signTime: store.signTime || '',
  shopNotes: store.shopNotes || '',
  status: (store.status as StoreStatus) || '',
  menuType: store.menuType || '',
  cancelTime: store.cancelTime || '',
  newStoreNotes: store.newStoreNotes || '',
});

const StoreEditModal: React.FC<StoreEditModalProps> = ({
  open,
  onClose,
  store,
  onSaved,
}) => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open && store) {
      setForm(buildFormFromStore(store));
    } else if (!open) {
      setForm(initialForm);
    }
  }, [open, store]);

  const handleChange = (
    key: keyof FormState,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!store) return;
    setSaving(true);
    try {
      const patch: Partial<Omit<StoreInfo, 'id' | 'createdAt'>> = {};
      patch.storeName = form.storeName.trim() || undefined;
      patch.owner = form.owner.trim() || undefined;
      patch.address = form.address.trim() || undefined;
      patch.phone = form.phone.trim() || undefined;
      patch.signTime = form.signTime.trim() || undefined;
      patch.shopNotes = form.shopNotes.trim() || undefined;
      patch.status = (form.status as StoreStatus) || undefined;
      patch.menuType = form.menuType.trim() || undefined;
      patch.cancelTime = form.cancelTime.trim() || undefined;
      patch.newStoreNotes = form.newStoreNotes.trim() || undefined;

      const updated: StoreInfo = await storeApi.updateStore(
        store.id,
        patch,
      );
      toast.success('店铺信息已更新');
      onSaved?.(updated);
      onClose();
    } catch (err: unknown) {
      logger.error('update store failed', err);
      const msg = err instanceof Error ? err.message : '保存失败，请重试';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = Object.entries(STORE_STATUS_LABELS) as [
    StoreStatus,
    string,
  ][];

  if (!store) return null;

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>编辑店铺</DialogTitle>
          <DialogDescription>
            修改店铺信息，保存后立即生效
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Info className="size-3.5" />
                店铺标识（只读）
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">所属平台</span>
                <span className="font-medium">{form.platformKey}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">店铺ID</span>
                <span className="font-mono font-medium">{form.storeId}</span>
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                店铺ID为唯一标识，不可修改。如需变更请删除后重新录入。
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-storeName">店铺名称</Label>
              <Input
                id="edit-storeName"
                value={form.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                placeholder="请输入店铺名称"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-owner">负责人</Label>
              <Input
                id="edit-owner"
                value={form.owner}
                onChange={(e) => handleChange('owner', e.target.value)}
                placeholder="请输入负责人姓名"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">店家手机号</Label>
              <Input
                id="edit-phone"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="请输入联系电话"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-menuType">菜单类型</Label>
              <Input
                id="edit-menuType"
                value={form.menuType}
                onChange={(e) => handleChange('menuType', e.target.value)}
                placeholder="如 S / D / 综合"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-signTime">签约时间</Label>
              <Input
                id="edit-signTime"
                value={form.signTime}
                onChange={(e) => handleChange('signTime', e.target.value)}
                placeholder="如 2025-03-15"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cancelTime">解约时间</Label>
              <Input
                id="edit-cancelTime"
                value={form.cancelTime}
                onChange={(e) => handleChange('cancelTime', e.target.value)}
                placeholder="如 2025-12-31"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="edit-address">店铺地址</Label>
              <Input
                id="edit-address"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="请输入店铺地址"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-status">店铺状态</Label>
              <Select
                value={form.status}
                onValueChange={(val: string) =>
                  handleChange('status', val)
                }
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="edit-shopNotes">店铺备注</Label>
              <Textarea
                id="edit-shopNotes"
                value={form.shopNotes}
                onChange={(e) => handleChange('shopNotes', e.target.value)}
                placeholder="请输入店铺备注"
                rows={3}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="edit-newStoreNotes">新店备注</Label>
              <Textarea
                id="edit-newStoreNotes"
                value={form.newStoreNotes}
                onChange={(e) => handleChange('newStoreNotes', e.target.value)}
                placeholder="请输入新店备注"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StoreEditModal;
