import React, { useEffect, useMemo, useState } from 'react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Users, Check, ChevronsUpDown, AlertCircle } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { storeApi } from '@/api';
import { BATCH_OWNER_MAX_COUNT } from '@shared/api.interface';
import type { BatchUpdateOwnerResult } from '@shared/api.interface';

interface BatchOwnerModalProps {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedIds: string[];
  platformKey: string;
  onSaved?: (result: BatchUpdateOwnerResult) => void;
}

const BatchOwnerModal: React.FC<BatchOwnerModalProps> = ({
  open,
  onClose,
  selectedCount,
  selectedIds,
  platformKey,
  onSaved,
}) => {
  const [owner, setOwner] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [owners, setOwners] = useState<string[]>([]);
  const [ownersLoading, setOwnersLoading] = useState<boolean>(false);
  const [comboboxOpen, setComboboxOpen] = useState<boolean>(false);

  useEffect(() => {
    if (open && platformKey) {
      setOwner('');
      setOwnersLoading(true);
      storeApi
        .listOwners(platformKey)
        .then((list: string[]) => {
          setOwners(list);
        })
        .catch((err: unknown) => {
          logger.error('load owners failed', err);
        })
        .finally(() => {
          setOwnersLoading(false);
        });
    }
  }, [open, platformKey]);

  const filteredOwners = useMemo(() => {
    if (!owner.trim()) return owners;
    const lower = owner.trim().toLowerCase();
    return owners.filter((o) => o.toLowerCase().includes(lower));
  }, [owner, owners]);

  const overLimit = selectedCount > BATCH_OWNER_MAX_COUNT;
  const canSubmit =
    selectedCount > 0 &&
    !overLimit &&
    owner.trim().length > 0 &&
    !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const result = await storeApi.batchUpdateOwner({
        ids: selectedIds,
        owner: owner.trim(),
      });
      if (result.failCount > 0) {
        toast.warning(
          `批量设置完成：成功 ${result.successCount} 条，失败 ${result.failCount} 条`,
        );
      } else {
        toast.success(`已成功为 ${result.successCount} 家店铺设置负责人`);
      }
      onSaved?.(result);
      onClose();
    } catch (err: unknown) {
      logger.error('batch update owner failed', err);
      const msg = err instanceof Error ? err.message : '批量设置失败，请重试';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            批量指定负责人
          </DialogTitle>
          <DialogDescription>
            为选中的 <span className="font-medium text-foreground">{selectedCount}</span>{' '}
            家店铺统一设置负责人
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {overLimit && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <div>
                已选 {selectedCount} 家店铺，超过单次上限（{BATCH_OWNER_MAX_COUNT} 家）。
                请减少选择后重试。
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="batch-owner">负责人姓名</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between font-normal"
                  disabled={overLimit}
                >
                  {owner || '输入或选择负责人'}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="搜索或输入新的负责人..."
                    value={owner}
                    onValueChange={setOwner}
                  />
                  <CommandList>
                    <CommandEmpty>
                      无匹配项，可直接输入新负责人姓名
                    </CommandEmpty>
                    {filteredOwners.length > 0 && (
                      <CommandGroup heading="已有负责人">
                        {filteredOwners.map((o) => (
                          <CommandItem
                            key={o}
                            value={o}
                            onSelect={(currentValue: string) => {
                              setOwner(currentValue);
                              setComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 size-4 ${
                                owner === o ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            {o}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              支持从已有负责人中选择，也可直接输入新姓名
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-muted-foreground">选中店铺数</span>
            <Badge variant="secondary">{selectedCount}</Badge>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {saving ? '设置中...' : '确认设置'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchOwnerModal;
