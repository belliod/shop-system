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
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { storeApi } from '@/api';
import { STORE_STATUS_LABELS } from '@shared/api.interface';
import type { StoreInfo, StoreStatus } from '@shared/api.interface';

interface StoreCreateModalProps {
  open: boolean;
  onClose: () => void;
  platformKey: string;
  platformName?: string;
  onCreated?: (store: StoreInfo) => void;
}

interface FormState {
  storeId: string;
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
  storeName: '',
  owner: '',
  address: '',
  phone: '',
  signTime: '',
  shopNotes: '',
  status: 'normal',
  menuType: '',
  cancelTime: '',
  newStoreNotes: '',
};

const StoreCreateModal: React.FC<StoreCreateModalProps> = ({
  open,
  onClose,
  platformKey,
  platformName,
  onCreated,
}) => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setForm(initialForm);
    }
  }, [open]);

  const handleChange = (
    key: keyof FormState,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!platformKey) return;
    if (!form.storeId.trim()) {
      toast.error('请输入店铺ID');
      return;
    }
    setSaving(true);
    try {
      const data: Omit<StoreInfo, 'id' | 'createdAt'> = {
        platformKey,
        storeId: form.storeId.trim(),
        storeName: form.storeName.trim() || undefined,
        owner: form.owner.trim() || undefined,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        signTime: form.signTime.trim() || undefined,
        shopNotes: form.shopNotes.trim() || undefined,
        status: (form.status as StoreStatus) || undefined,
        menuType: form.menuType.trim() || undefined,
        cancelTime: form.cancelTime.trim() || undefined,
        newStoreNotes: form.newStoreNotes.trim() || undefined,
      };
      const created: StoreInfo = await storeApi.createStore(data);
      toast.success('店铺创建成功');
      onCreated?.(created);
      onClose();
    } catch (err: unknown) {
      logger.error('create store failed', err);
      const msg =
        err instanceof Error ? err.message : '创建失败，请重试';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = Object.entries(STORE_STATUS_LABELS) as [
    StoreStatus,
    string,
  ][];

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>新增店铺</DialogTitle>
          <DialogDescription>
            在
            <span className="font-medium text-foreground mx-1">
              {platformName || platformKey}
            </span>
            下添加新店铺
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-storeId">
                店铺ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-storeId"
                value={form.storeId}
                onChange={(e) => handleChange('storeId', e.target.value)}
                placeholder="请输入店铺ID"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-storeName">店铺名称</Label>
              <Input
                id="create-storeName"
                value={form.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                placeholder="请输入店铺名称"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-owner">负责人</Label>
              <Input
                id="create-owner"
                value={form.owner}
                onChange={(e) => handleChange('owner', e.target.value)}
                placeholder="请输入负责人姓名"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-phone">店家手机号</Label>
              <Input
                id="create-phone"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="请输入联系电话"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-menuType">菜单类型</Label>
              <Input
                id="create-menuType"
                value={form.menuType}
                onChange={(e) => handleChange('menuType', e.target.value)}
                placeholder="如 S / D / 综合"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-signTime">签约时间</Label>
              <Input
                id="create-signTime"
                value={form.signTime}
                onChange={(e) => handleChange('signTime', e.target.value)}
                placeholder="如 2025-03-15"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="create-address">店铺地址</Label>
              <Input
                id="create-address"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="请输入店铺地址"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-status">店铺状态</Label>
              <Select
                value={form.status}
                onValueChange={(val: string) =>
                  handleChange('status', val)
                }
              >
                <SelectTrigger id="create-status">
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
            <div className="space-y-1.5">
              <Label htmlFor="create-cancelTime">解约时间</Label>
              <Input
                id="create-cancelTime"
                value={form.cancelTime}
                onChange={(e) => handleChange('cancelTime', e.target.value)}
                placeholder="如 2025-12-31"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="create-shopNotes">店铺备注</Label>
              <Textarea
                id="create-shopNotes"
                value={form.shopNotes}
                onChange={(e) => handleChange('shopNotes', e.target.value)}
                placeholder="请输入店铺备注"
                rows={3}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="create-newStoreNotes">新店备注</Label>
              <Textarea
                id="create-newStoreNotes"
                value={form.newStoreNotes}
                onChange={(e) =>
                  handleChange('newStoreNotes', e.target.value)
                }
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
              {saving ? '创建中...' : '确认创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StoreCreateModal;
