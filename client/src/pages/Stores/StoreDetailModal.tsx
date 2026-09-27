import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatIncomeYuanToWan } from '@/utils/format-income';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getWeeksInMonth } from '@/utils/week-utils';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { storeApi, revenueApi } from '@/api';
import {
  STORE_STATUS_LABELS,
  ABC_LABELS,
} from '@shared/api.interface';
import type {
  StoreInfo,
  StoreStatus,
  MonthlyRevenueInfo,
} from '@shared/api.interface';

interface StoreDetailModalProps {
  open: boolean;
  onClose: () => void;
  store: StoreInfo | null;
  onStatusSaved?: (updated: StoreInfo) => void;
}

interface DetailItem {
  label: string;
  value?: string;
}

const BASE_FIELDS: Array<{ key: keyof StoreInfo; label: string }> = [
  { key: 'storeId', label: '店铺ID' },
  { key: 'storeName', label: '店铺名称' },
  { key: 'owner', label: '负责人' },
  { key: 'phone', label: '联系电话' },
  { key: 'address', label: '地址' },
  { key: 'menuType', label: '菜单类型' },
  { key: 'signTime', label: '签约时间' },
  { key: 'cancelTime', label: '解约时间' },
  { key: 'shopNotes', label: '店铺备注' },
  { key: 'newStoreNotes', label: '新店备注' },
  { key: 'platformKey', label: '平台标识' },
];

const EXTRA_FIELD_LABELS: Record<string, string> = {
  phoneCategory: '手机品类',
  phoneSerial: '手机序列号',
  checkPinhoFan: '品好饭核查',
  pinhaoFan: '品好饭',
  dualPlatform: '双平台',
  checkBaoPinTuan: '爆品团核查',
  superHot: '超级火爆',
  baoPinTuan: '爆品团',
  checkYiKouJia: '一口价核查',
  account: '账号',
  businessStatus: '经营状态',
  createTime: '创建时间',
  checkCount: '核查次数',
  promotion: '促销活动',
  operationNotes: '运营备注',
};


const StoreDetailModal: React.FC<StoreDetailModalProps> = ({
  open,
  onClose,
  store,
  onStatusSaved,
}) => {
  const [editStatus, setEditStatus] = useState<StoreStatus | ''>('');
  const [saving, setSaving] = useState<boolean>(false);

  const [statMonth, setStatMonth] = useState<Date>(() => {
    const now: Date = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [weekRevenues, setWeekRevenues] = useState<MonthlyRevenueInfo[]>([]);
  const [loadingWeekRevenues, setLoadingWeekRevenues] = useState<boolean>(false);

  const displayLatestPeriod: string = useMemo(() => {
    const p = store?.latestPeriod;
    if (!p) return '-';
    if (/^\d{4}-\d{2}$/.test(p)) {
      const [y, m] = p.split('-');
      return `${y}年${parseInt(m, 10)}月`;
    }
    return p;
  }, [store?.latestPeriod]);

  const statMonthStr: string = useMemo(() => {
    const y: number = statMonth.getFullYear();
    const m: number = statMonth.getMonth() + 1;
    return `${y}-${m.toString().padStart(2, '0')}`;
  }, [statMonth]);

  const weeksInMonth: ReturnType<typeof getWeeksInMonth> = useMemo(
    () => getWeeksInMonth(statMonth.getFullYear(), statMonth.getMonth()),
    [statMonth],
  );

  const loadWeekRevenues: () => Promise<void> = useCallback(async () => {
    if (!store) return;
    setLoadingWeekRevenues(true);
    try {
      const prefix: string = `${statMonth.getFullYear()}-W`;
      const all: MonthlyRevenueInfo[] = await revenueApi.listRevenues({
        platformKey: store.platformKey,
        storeId: store.storeId,
        periodType: 'week',
        year: statMonth.getFullYear(),
      });
      const weekMap: Map<string, MonthlyRevenueInfo> = new Map();
      for (const r of all) {
        if (r.month && r.periodType === 'week') {
          weekMap.set(r.month, r);
        }
      }
      const filtered: MonthlyRevenueInfo[] = weeksInMonth.map((w) => {
        const existing: MonthlyRevenueInfo | undefined = weekMap.get(w.weekKey);
        return {
          id: existing?.id || '',
          platformKey: store.platformKey,
          storeId: store.storeId,
          storeName: store.storeName,
          month: w.weekKey,
          revenue: existing?.revenue,
          periodType: 'week',
          year: w.weekYear,
          periodIndex: w.weekNum,
        };
      });
      setWeekRevenues(filtered);
    } catch (err: unknown) {
      logger.error('load week revenues failed', err);
      setWeekRevenues([]);
    } finally {
      setLoadingWeekRevenues(false);
    }
  }, [store, statMonth, weeksInMonth]);

  const monthTotalRevenue: number = useMemo(() =>
    weekRevenues.reduce(
      (sum: number, item: MonthlyRevenueInfo) => sum + Number(item.revenue || 0),
      0,
    ),
  [weekRevenues]);

   useEffect(() => {
    if (store?.status) {
      setEditStatus(store.status);
    } else {
      setEditStatus('');
    }
  }, [store]);

  useEffect(() => {
    if (open && store) {
      void loadWeekRevenues();
    }
  }, [open, store, loadWeekRevenues]);

  if (!store) return null;

  const baseItems: DetailItem[] = BASE_FIELDS.map(
    ({ key, label }) => ({
      label,
      value: store[key] as string | undefined,
    }),
  );

  const extraItems: DetailItem[] = store.extra
    ? Object.entries(store.extra)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => ({
          label: EXTRA_FIELD_LABELS[k] || k,
          value: String(v),
        }))
    : [];

  const handleSaveStatus = async () => {
    if (!editStatus) return;
    setSaving(true);
    try {
      const updated: StoreInfo = await storeApi.updateStoreStatus(
        store.id,
        editStatus,
      );
      onStatusSaved?.(updated);
    } catch (err: unknown) {
      logger.error('update store status in detail failed', err);
    } finally {
      setSaving(false);
    }
  };

  const renderFieldList = (items: DetailItem[]): React.ReactNode => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <span className="text-sm font-medium break-words">
            {item.value || '-'}
          </span>
        </div>
      ))}
    </div>
  );

  const statusOptions = Object.entries(STORE_STATUS_LABELS) as [
    StoreStatus,
    string,
  ][];

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>店铺详情</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              基本信息
            </h3>
            {renderFieldList(baseItems)}
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              经营指标
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">状态</span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                     store.status === 'normal'
                         ? '!bg-green-100 !text-green-700 !border-transparent'
                         : store.status === 'pending'
                           ? '!bg-blue-100 !text-blue-700 !border-transparent'
                           : store.status === 'closed'
                             ? '!bg-orange-100 !text-orange-700 !border-transparent'
                             : store.status === 'terminated'
                               ? '!bg-red-100 !text-red-700 !border-transparent'
                               : ''
                    }
                  >
                    {store.status ? STORE_STATUS_LABELS[store.status] : '-'}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">ABC类别</span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                     store.abcCategory === 'A'
                         ? '!bg-green-100 !text-green-700 !border-transparent'
                         : store.abcCategory === 'B'
                           ? '!bg-blue-100 !text-blue-700 !border-transparent'
                           : store.abcCategory === 'C'
                             ? '!bg-orange-100 !text-orange-700 !border-transparent'
                             : '!bg-gray-100 !text-gray-500 !border-transparent'
                    }
                  >
                    {store.abcCategory
                      ? ABC_LABELS[store.abcCategory]
                      : '-'}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">最新月收入</span>
                <span className="text-sm font-medium break-words">
                  {formatIncomeYuanToWan(store.latestRevenue)} 万元
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">最新月份</span>
                <span className="text-sm font-medium break-words">
                  {displayLatestPeriod}
                </span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              分周收入统计
            </h3>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setStatMonth(
                      new Date(
                        statMonth.getFullYear(),
                        statMonth.getMonth() - 1,
                        1,
                      ),
                    )
                  }
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-medium min-w-[90px] text-center">
                  {statMonth.getFullYear()}年{statMonth.getMonth() + 1}月
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setStatMonth(
                      new Date(
                        statMonth.getFullYear(),
                        statMonth.getMonth() + 1,
                        1,
                      ),
                    )
                  }
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
            {loadingWeekRevenues ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                加载中...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>周次</TableHead>
                    <TableHead>周标识</TableHead>
                    <TableHead className="text-right">
                      周收入（万元）
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekRevenues.map((item: MonthlyRevenueInfo, idx: number) => (
                    <TableRow key={item.month}>
                      <TableCell>第{idx + 1}周</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.month}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatIncomeYuanToWan(item.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold">
                      本月合计
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatIncomeYuanToWan(monthTotalRevenue)} 万元
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              修改状态
            </h3>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">
                  店铺状态
                </label>
                <Select
                  value={editStatus}
                  onValueChange={(val: string) =>
                    setEditStatus(val as StoreStatus)
                  }
                >
                  <SelectTrigger>
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
              <Button
                onClick={handleSaveStatus}
                disabled={
                  saving || !editStatus || editStatus === store.status
                }
              >
                保存
              </Button>
            </div>
          </section>

          {extraItems.length > 0 ? (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                扩展信息
              </h3>
              {renderFieldList(extraItems)}
            </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoreDetailModal;
