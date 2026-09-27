import React, { useMemo, useState } from 'react';
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
import {
  getWeekNumber,
  getWeekYear,
  formatWeekKey,
  getWeeksInMonth,
} from '@/utils/week-utils';
import { formatMonthCn } from '@/utils/format-income';
import type {
  PlatformInfo,
  StoreInfo,
  RevenuePeriodType,
} from '@shared/api.interface';

interface RevenueEntryFormProps {
  periodType: RevenuePeriodType;
  platforms: PlatformInfo[];
  stores: StoreInfo[];
  selectedPlatform: string;
  selectedMonth: Date;
  selectedStoreId: string;
  revenueAmount: string;
  loadingPlatforms: boolean;
  loadingStores: boolean;
  submitting: boolean;
  onPlatformChange: (val: string) => void;
  onMonthChange: (date: Date) => void;
  onStoreChange: (val: string) => void;
  onRevenueChange: (val: string) => void;
  onSubmit: () => void;
}

const RevenueEntryForm: React.FC<RevenueEntryFormProps> = ({
  periodType,
  platforms,
  stores,
  selectedPlatform,
  selectedMonth,
  selectedStoreId,
  revenueAmount,
  loadingPlatforms,
  loadingStores,
  submitting,
  onPlatformChange,
  onMonthChange,
  onStoreChange,
  onRevenueChange,
  onSubmit,
}) => {
  const monthOptions: Array<{ value: string; label: string }> = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    const now: Date = new Date();
    const baseYear: number = now.getFullYear();
    const baseMonth: number = now.getMonth();
    for (let i = 0; i < 12; i += 1) {
      const d: Date = new Date(baseYear, baseMonth - i, 1);
      const y: number = d.getFullYear();
      const m: number = d.getMonth() + 1;
      const value: string = `${y}-${String(m).padStart(2, '0')}`;
      options.push({
        value,
        label: formatMonthCn(value),
      });
    }
    return options;
  }, []);

  const currentMonthValue: string = useMemo(() => {
    const y: number = selectedMonth.getFullYear();
    const m: number = selectedMonth.getMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }, [selectedMonth]);

  const weekYear: number = useMemo(
    () => getWeekYear(selectedMonth),
    [selectedMonth],
  );
  const weekNum: number = useMemo(
    () => getWeekNumber(selectedMonth),
    [selectedMonth],
  );
  const weekStr: string = useMemo(
    () => formatWeekKey(weekYear, weekNum),
    [weekYear, weekNum],
  );
  const weeksInMonth: ReturnType<typeof getWeeksInMonth> = useMemo(
    () => getWeeksInMonth(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth(),
    ),
    [selectedMonth],
  );

  const handleMonthSelect = (val: string): void => {
    const [yStr, mStr] = val.split('-');
    onMonthChange(
      new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1),
    );
  };

  const handleWeekSelect = (val: string): void => {
    const wk = weeksInMonth.find((w) => w.weekKey === val);
    if (wk) {
      const jan4: Date = new Date(Date.UTC(wk.weekYear, 0, 4));
      const jan4Dow: number = jan4.getUTCDay() || 7;
      const targetDay: Date = new Date(Date.UTC(
        wk.weekYear,
        0,
        4 + (wk.weekNum - 1) * 7 - jan4Dow + 1,
      ));
      onMonthChange(
        new Date(
          targetDay.getUTCFullYear(),
          targetDay.getUTCMonth(),
          targetDay.getUTCDate(),
        ),
      );
    }
  };

  const handleFormSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">收入录入</h2>
      <form onSubmit={handleFormSubmit} className="space-y-5">
        <div className="flex items-start gap-3">
          <Label className="w-20 pt-2 text-right shrink-0">平台</Label>
          <div className="flex-1">
            <Select
              value={selectedPlatform}
              onValueChange={onPlatformChange}
              disabled={loadingPlatforms}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择平台" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p: PlatformInfo) => (
                  <SelectItem key={p.platformKey} value={p.platformKey}>
                    {p.platformName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Label className="w-20 pt-2 text-right shrink-0">
            {periodType === 'week' ? '周次' : '月份'}
          </Label>
          <div className="flex-1">
            {periodType === 'week' ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    value={currentMonthValue}
                    onValueChange={handleMonthSelect}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40 shrink-0">
                  <Select value={weekStr} onValueChange={handleWeekSelect}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weeksInMonth.map((w) => (
                        <SelectItem key={w.weekKey} value={w.weekKey}>
                          第{w.weekOfMonth}周
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <Select
                value={currentMonthValue}
                onValueChange={handleMonthSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择月份" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Label className="w-20 pt-2 text-right shrink-0">店铺</Label>
          <div className="flex-1">
            <Select
              value={selectedStoreId}
              onValueChange={onStoreChange}
              disabled={loadingStores || !selectedPlatform}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={selectedPlatform ? '请选择店铺' : '请先选择平台'} />
              </SelectTrigger>
              <SelectContent>
                {stores.map((s: StoreInfo) => (
                  <SelectItem key={s.storeId} value={s.storeId}>
                    {s.storeName || s.storeId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Label className="w-20 pt-2 text-right shrink-0">
            收入金额<br /><span className="text-xs text-muted-foreground">(元)</span>
          </Label>
          <div className="flex-1">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="请输入收入金额"
              value={revenueAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onRevenueChange(e.target.value)
              }
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? '提交中...' : '提交'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RevenueEntryForm;
