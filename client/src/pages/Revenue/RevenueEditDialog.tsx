import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import type {
  MonthlyRevenueInfo,
  RevenuePeriodType,
} from '@shared/api.interface';

interface RevenueEditDialogProps {
  open: boolean;
  record: MonthlyRevenueInfo | null;
  periodType: RevenuePeriodType;
  submitting: boolean;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;
}

const RevenueEditDialog: React.FC<RevenueEditDialogProps> = ({
  open,
  record,
  periodType,
  submitting,
  onClose,
  onSave,
}) => {
  const [editRevenue, setEditRevenue] = useState<string>('');

  const handleOpenChange = (openVal: boolean): void => {
    if (!openVal && !submitting) {
      onClose();
    }
  };

  const handleSave = async (): Promise<void> => {
    const amount: number = Number(editRevenue);
    if (Number.isNaN(amount) || amount < 0) return;
    await onSave(amount);
  };

  React.useEffect(() => {
    if (record) {
      setEditRevenue(String(record.revenue));
    }
  }, [record]);

  const displayPeriod: string = (() => {
    if (!record?.month) return '-';
    if (periodType === 'week') return record.month;
    if (/^\d{4}-\d{2}$/.test(record.month)) {
      const [y, m] = record.month.split('-');
      return `${y}年${parseInt(m, 10)}月`;
    }
    return record.month;
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            编辑{periodType === 'week' ? '周' : ''}收入
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <Label className="w-24 text-right shrink-0">店铺</Label>
            <div className="flex-1 text-sm text-muted-foreground">
              {record?.storeId} - {record?.storeName || '-'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="w-24 text-right shrink-0">
              {periodType === 'week' ? '周次' : '月份'}
            </Label>
            <div className="flex-1 text-sm text-muted-foreground">
              {displayPeriod}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="w-24 text-right shrink-0">收入金额（元）</Label>
            <div className="flex-1">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editRevenue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditRevenue(e.target.value)
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            取消
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RevenueEditDialog;
