import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { revenueApi, storeApi, platformApi } from '@client/src/api';
import ExcelImportPanel from './ExcelImportPanel';
import RevenueListPanel from './RevenueListPanel';
import RevenueEntryForm from './RevenueEntryForm';
import {
  getWeekNumber,
  getWeekYear,
  formatWeekKey,
} from '@/utils/week-utils';
import type {
  MonthlyRevenueInfo,
  PlatformInfo,
  StoreInfo,
  RevenuePeriodType,
} from '@shared/api.interface';

const RevenuePage: React.FC = () => {
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [revenues, setRevenues] = useState<MonthlyRevenueInfo[]>([]);

  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [periodType, setPeriodType] = useState<RevenuePeriodType>('month');
  const [entryTab, setEntryTab] = useState<string>('single');
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now: Date = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [revenueAmount, setRevenueAmount] = useState<string>('');

  const [loadingPlatforms, setLoadingPlatforms] = useState<boolean>(false);
  const [loadingStores, setLoadingStores] = useState<boolean>(false);
  const [loadingRevenues, setLoadingRevenues] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const monthStr: string = useMemo(() => {
    const y: number = selectedMonth.getFullYear();
    const m: number = selectedMonth.getMonth() + 1;
    return `${y}-${m.toString().padStart(2, '0')}`;
  }, [selectedMonth]);
  const weekStr: string = useMemo(
    () => formatWeekKey(getWeekYear(selectedMonth), getWeekNumber(selectedMonth)),
    [selectedMonth],
  );
  const currentPeriodStr: string = useMemo(
    () => (periodType === 'week' ? weekStr : monthStr),
    [periodType, weekStr, monthStr],
  );

  useEffect(() => {
    let cancelled: boolean = false;
    const load: () => Promise<void> = async () => {
      setLoadingPlatforms(true);
      try {
        const data: PlatformInfo[] = await platformApi.listPlatforms();
        if (!cancelled) {
          const active = data.filter((p: PlatformInfo) => p.isActive);
          setPlatforms(active);
          if (active.length > 0 && !selectedPlatform) {
            setSelectedPlatform(active[0].platformKey);
          }
        }
      } catch (err: unknown) {
        logger.error('load platforms failed', err);
        toast.error('加载平台列表失败');
      } finally {
        if (!cancelled) setLoadingPlatforms(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPlatform) {
      setStores([]);
      setSelectedStoreId('');
      return;
    }
    let cancelled: boolean = false;
    const load: () => Promise<void> = async () => {
      setLoadingStores(true);
      try {
        const res = await storeApi.listStores({
          platformKey: selectedPlatform,
          pageSize: 1000,
          page: 1,
        });
        if (!cancelled) {
          setStores(res.items);
        }
      } catch (err: unknown) {
        logger.error('load stores failed', err);
        toast.error('加载店铺列表失败');
      } finally {
        if (!cancelled) setLoadingStores(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedPlatform]);

  const loadRevenues: () => Promise<void> = useCallback(async () => {
    if (!selectedPlatform || !currentPeriodStr) return;
    setLoadingRevenues(true);
    try {
      const data: MonthlyRevenueInfo[] = await revenueApi.listRevenues({
        platformKey: selectedPlatform,
        month: currentPeriodStr,
        periodType,
      });
      setRevenues(data);
    } catch (err: unknown) {
      logger.error('load revenues failed', err);
      toast.error('加载收入列表失败');
    } finally {
      setLoadingRevenues(false);
    }
  }, [selectedPlatform, currentPeriodStr, periodType]);

  useEffect(() => {
    void loadRevenues();
  }, [loadRevenues]);

  const handlePlatformChange = (val: string): void => {
    setSelectedPlatform(val);
    setSelectedStoreId('');
  };

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!selectedPlatform) {
      toast.error('请选择平台');
      return;
    }
    if (!currentPeriodStr) {
      toast.error(periodType === 'week' ? '请选择周次' : '请选择月份');
      return;
    }
    if (!selectedStoreId) {
      toast.error('请选择店铺');
      return;
    }
    const amount: number = Number(revenueAmount);
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('请输入有效的收入金额，不能为负数');
      return;
    }
    const year: number =
      periodType === 'week'
        ? getWeekYear(selectedMonth)
        : selectedMonth.getFullYear();
    const periodIndex: number =
      periodType === 'week'
        ? getWeekNumber(selectedMonth)
        : selectedMonth.getMonth() + 1;

    setSubmitting(true);
    try {
      await revenueApi.upsertRevenue({
        platformKey: selectedPlatform,
        storeId: selectedStoreId,
        month: currentPeriodStr,
        revenue: amount,
        periodType,
        year,
        periodIndex,
      });
      toast.success('提交成功，重复提交将自动覆盖原有记录');
      setRevenueAmount('');
      void loadRevenues();
    } catch (err: unknown) {
      logger.error('upsert revenue failed', err);
      toast.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }, [
    selectedPlatform,
    currentPeriodStr,
    selectedStoreId,
    revenueAmount,
    periodType,
    selectedMonth,
    loadRevenues,
  ]);

  const handlePeriodTypeChange = (val: string): void => {
    setPeriodType(val as RevenuePeriodType);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6 text-foreground">
        收入录入
      </h1>

      <div className="mb-4">
        <Tabs value={periodType} onValueChange={handlePeriodTypeChange}>
          <TabsList>
            <TabsTrigger value="month">月度收入</TabsTrigger>
            <TabsTrigger value="week">周收入</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mb-6">
        <Tabs value={entryTab} onValueChange={setEntryTab}>
          <TabsList>
            <TabsTrigger value="single">单条录入</TabsTrigger>
            <TabsTrigger value="excel">Excel 批量导入</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        {periodType === 'week'
          ? '选择平台与周次后，可录入该周各店铺的收入数据；同一店铺同一周重复提交会自动更新。'
          : '选择平台与月份后，可录入该月份各店铺的收入数据；同一店铺同一月份重复提交会自动更新。'}
      </p>

      {entryTab === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card">
            <RevenueEntryForm
              periodType={periodType}
              platforms={platforms}
              stores={stores}
              selectedPlatform={selectedPlatform}
              selectedMonth={selectedMonth}
              selectedStoreId={selectedStoreId}
              revenueAmount={revenueAmount}
              loadingPlatforms={loadingPlatforms}
              loadingStores={loadingStores}
              submitting={submitting}
              onPlatformChange={handlePlatformChange}
              onMonthChange={setSelectedMonth}
              onStoreChange={setSelectedStoreId}
              onRevenueChange={setRevenueAmount}
              onSubmit={handleSubmit}
            />
          </div>
          <div className="rounded-2xl border border-border bg-card">
            <RevenueListPanel
              periodType={periodType}
              revenues={revenues}
              loading={loadingRevenues}
              onDeleted={loadRevenues}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6">
          <ExcelImportPanel />
        </div>
      )}
    </div>
  );
};

export default RevenuePage;
