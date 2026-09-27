import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  DollarSign,
  Users,
  LayoutGrid,
  TrendingUp,
  Award,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { EChartsOption } from 'echarts';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { statsApi, platformApi, settingsApi } from '@/api';
import type {
  DashboardStatsResponse,
  PlatformInfo,
  StatsDimension,
  StatsMode,
  AlertItem,
  AbcStatsItem,
} from '@shared/api.interface';

import StatsCard from './StatsCard';
import ChartCard from './ChartCard';
import AlertPanel from './AlertPanel';
import { formatIncomeYuanToWan, formatIncomeYuanWithUnit } from '@/utils/format-income';

// Gradient presets for stats cards
const GRADIENTS = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-700',
  emerald: 'bg-gradient-to-br from-emerald-500 to-teal-700',
  violet: 'bg-gradient-to-br from-violet-500 to-purple-700',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-700',
  purple: 'bg-gradient-to-br from-purple-500 to-fuchsia-700',
  sky: 'bg-gradient-to-br from-sky-500 to-cyan-700',
  orange: 'bg-gradient-to-br from-orange-500 to-red-600',
  slate: 'bg-gradient-to-br from-slate-500 to-slate-700',
} as const;

// ABC category colors
const ABC_COLORS: Record<string, string> = {
  A: '#a855f7', // purple
  B: '#3b82f6', // blue
  C: '#f97316', // orange
  none: '#64748b', // slate
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [mode, setMode] = useState<StatsMode>('all');
  const [platformKey, setPlatformKey] = useState<string>('');
  const [dimension, setDimension] = useState<StatsDimension>('month');
  const [loading, setLoading] = useState<boolean>(false);
  const [platformsLoading, setPlatformsLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState<boolean>(false);
  const [queryMonth, setQueryMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activeMonth, setActiveMonth] = useState<string>('');

  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    const baseYear = now.getFullYear();
    const baseMonth = now.getMonth() + 1;
    for (let i = 0; i < 12; i += 1) {
      const d = new Date(baseYear, baseMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      options.push({
        value: `${y}-${String(m).padStart(2, '0')}`,
        label: `${y}年${m}月`,
      });
    }
    return options;
  }, []);
  const [currentMonthValue] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Load platform list
  useEffect(() => {
    let mounted = true;
    setPlatformsLoading(true);
    platformApi
      .listPlatforms()
      .then((data: PlatformInfo[]) => {
        if (!mounted) return;
        setPlatforms(data);
        // default to first platform in single mode
        if (data.length > 0 && !platformKey) {
          setPlatformKey(data[0].platformKey);
        }
      })
      .catch((err: unknown) => {
        logger.error('load platforms failed', err);
      })
      .finally(() => {
        if (mounted) setPlatformsLoading(false);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load dashboard stats
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const effectivePlatformKey = mode === 'single' ? platformKey : undefined;

    statsApi
      .getDashboardStats({
        platformKey: effectivePlatformKey,
        dimension,
        months: 6,
        month: activeMonth || undefined,
      })
      .then((data: DashboardStatsResponse) => {
        if (!mounted) return;
        setStats(data);
      })
      .catch((err: unknown) => {
        logger.error('load dashboard stats failed', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [mode, platformKey, dimension, activeMonth]);

  // Load alerts
  useEffect(() => {
    let mounted = true;
    setAlertsLoading(true);

    const effectivePlatformKey = mode === 'single' ? platformKey : undefined;

    settingsApi
      .getAlerts(effectivePlatformKey)
      .then((data) => {
        if (!mounted) return;
        setAlerts(data.alerts);
      })
      .catch((err: unknown) => {
        logger.error('load alerts failed', err);
      })
      .finally(() => {
        if (mounted) setAlertsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [mode, platformKey]);

  // ============== Chart options ==============

  const revenueTrendOption = useMemo<EChartsOption>(() => {
    const data = stats?.revenueTrend ?? [];
    const isWeek = dimension === 'week';

    const formatPeriodLabel = (period: string): string => {
      if (isWeek) return period;
      if (/^\d{4}-\d{2}$/.test(period)) {
        const [y, m] = period.split('-');
        return `${y}年${parseInt(m, 10)}月`;
      }
      return period;
    };

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const arr = params as Array<{ name: string; value: number }>;
          if (!arr.length) return '';
          const item = arr[0];
          return `${item.name}<br/>收入：¥${item.value.toLocaleString()}`;
        },
      },
      grid: { left: 60, right: 20, top: 30, bottom: 40 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.map((d) => formatPeriodLabel(d.period)),
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) =>
            value >= 10000 ? `${value / 10000}万` : String(value),
        },
      },
      series: [
        {
          type: 'line',
          name: mode === 'single' ? (platforms.find((p) => p.platformKey === platformKey)?.platformName || '收入') : '总收入',
          smooth: true,
          data: data.map((d) => d.revenue),
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0)' },
              ],
            },
          },
          lineStyle: { color: '#3b82f6', width: 2 },
          itemStyle: { color: '#3b82f6' },
        },
      ],
      graphic: isWeek && data.length === 0 ? [
        {
          type: 'text',
          left: 'center',
          top: 'middle',
          style: {
            text: '周度数据暂未生成',
            fontSize: 14,
            fill: '#94a3b8',
          },
        },
      ] : [],
    };
  }, [stats, dimension, mode, platformKey, platforms]);

  const abcPieOption = useMemo<EChartsOption>(() => {
    const data: AbcStatsItem[] = stats?.abcStats ?? [];
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number };
          return `${p.name}<br/>店铺数：${p.value} 家 (${p.percent}%)`;
        },
      },
      legend: {
        orient: 'vertical',
        right: 20,
        top: 'center',
        itemGap: 12,
        textStyle: { fontSize: 12 },
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          labelLine: {
            show: false,
          },
          data: data.map((item) => ({
            name: item.label,
            value: item.count,
            itemStyle: { color: ABC_COLORS[item.category] || '#64748b' },
          })),
        },
      ],
    };
  }, [stats]);

  const ownerRankOption = useMemo<EChartsOption>(() => {
    const data = [...(stats?.ownerRevenue ?? [])]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .reverse();
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const arr = params as Array<{ name: string; value: number }>;
          if (!arr.length) return '';
          const item = arr[0];
          return `${item.name}<br/>收入：¥${item.value.toLocaleString()}`;
        },
      },
      grid: { left: 90, right: 30, top: 20, bottom: 20 },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) =>
            value >= 10000 ? `${value / 10000}万` : String(value),
        },
      },
      yAxis: {
        type: 'category',
        data: data.map((d) => d.owner),
        axisLabel: {
          fontSize: 12,
        },
      },
      series: [
        {
          type: 'bar',
          data: data.map((d) => d.revenue),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#8b5cf6' },
                { offset: 1, color: '#6366f1' },
              ],
            },
            borderRadius: [0, 6, 6, 0],
          },
          barMaxWidth: 20,
        },
      ],
    };
  }, [stats]);

  // ============== Helpers ==============

  const formatRevenue = (value: number): string => {
    return formatIncomeYuanWithUnit(value);
  };

  const isMonthQueryMode = activeMonth.length > 0;
  const monthQueryLabel = monthOptions.find((m) => m.value === activeMonth)?.label || '';

  const totalRevenueDisplay = (): string => {
    if (!stats) return '-';
    if (stats.overview.totalRevenue === 0 && isMonthQueryMode) return '-';
    return formatRevenue(stats.overview.totalRevenue);
  };

  const statsCards = stats
    ? [
        {
          title: '店铺总数',
          value: stats.overview.totalStores,
          description: '全部合作店铺',
          icon: Store,
          gradient: GRADIENTS.blue,
        },
        {
          title: isMonthQueryMode ? `${monthQueryLabel}收入` : '总收入',
          value: totalRevenueDisplay(),
          description: isMonthQueryMode ? `${monthQueryLabel} 月度营收` : '累计营收金额',
          icon: DollarSign,
          gradient: GRADIENTS.emerald,
        },
        {
          title: '平台数量',
          value: stats.overview.totalPlatforms,
          description: '接入平台数',
          icon: LayoutGrid,
          gradient: GRADIENTS.violet,
        },
        {
          title: '负责人数量',
          value: stats.overview.totalOwners,
          description: '在岗负责人',
          icon: Users,
          gradient: GRADIENTS.amber,
        },
        {
          title: 'A类店铺',
          value: stats.overview.aCount,
          description: '高产店铺',
          icon: Award,
          gradient: GRADIENTS.purple,
        },
        {
          title: 'B类店铺',
          value: stats.overview.bCount,
          description: '中产店铺',
          icon: TrendingUp,
          gradient: GRADIENTS.sky,
        },
        {
          title: 'C类店铺',
          value: stats.overview.cCount,
          description: '低产店铺',
          icon: Activity,
          gradient: GRADIENTS.orange,
        },
        {
          title: '未统计店铺',
          value: stats.overview.noneCount,
          description: '暂无数据',
          icon: AlertTriangle,
          gradient: GRADIENTS.slate,
        },
      ]
    : [];

  // When mode is single and we have platform stats from all-platform API,
  // platformStats may still be available. In single mode, stats.platformStats
  // might contain only the selected platform, or be empty — handle both.
  const platformCards = stats?.platformStats ?? [];

  const handleModeChange = (newMode: StatsMode): void => {
    setMode(newMode);
    if (newMode === 'all') {
      setPlatformKey('');
    } else if (platforms.length > 0 && !platformKey) {
      setPlatformKey(platforms[0].platformKey);
    }
  };

  const handleQueryMonth = (): void => {
    setActiveMonth(queryMonth);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top controls: mode toggle + platform select + dimension + month query */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-muted p-[3px]">
            <Button
              variant={mode === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeChange('all')}
              className="text-sm"
            >
              全部平台合并统计
            </Button>
            <Button
              variant={mode === 'single' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeChange('single')}
              className="text-sm"
            >
              单平台统计
            </Button>
          </div>

          {/* Platform select (single mode only) */}
          {mode === 'single' && (
            <Select
              value={platformKey}
              onValueChange={(v: string) => setPlatformKey(v)}
              disabled={platformsLoading}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="选择平台" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p: PlatformInfo) => (
                  <SelectItem key={p.platformKey} value={p.platformKey}>
                    {p.platformName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* 指定月份查询 */}
          <div className="flex items-center gap-2">
            <Select value={queryMonth} onValueChange={(v: string) => setQueryMonth(v)}>
              <SelectTrigger className="w-36">
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
            <Button size="sm" onClick={handleQueryMonth}>
              查询该月收入
            </Button>
            {isMonthQueryMode && (
              <Badge variant="secondary" className="ml-1">
                查看：{monthQueryLabel}
              </Badge>
            )}
          </div>
        </div>

        {/* Dimension select */}
        <Select
          value={dimension}
          onValueChange={(v: string) =>
            setDimension(v as StatsDimension)
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="选择维度" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">月度</SelectItem>
            <SelectItem value="week">周度</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats cards (8 cards in responsive grid) */}
      <div
        data-ai-section-type="card-list"
        className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8"
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))
          : statsCards.map((card) => (
              <StatsCard
                key={card.title}
                title={card.title}
                value={card.value}
                description={card.description}
                icon={card.icon}
                gradient={card.gradient}
              />
            ))}
      </div>

      {/* Alert panel */}
      <AlertPanel
        alerts={alerts}
        loading={alertsLoading}
        platformKey={mode === 'single' ? platformKey : undefined}
      />

      {/* Charts row 1: revenue trend + ABC pie */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="收入趋势"
          option={revenueTrendOption}
          loading={loading}
          empty={!stats?.revenueTrend.length && dimension === 'month'}
        />
        <ChartCard
          title="ABC分类统计"
          option={abcPieOption}
          loading={loading}
          empty={!stats?.abcStats.length}
          extra={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/stores')}
            >
              查看全部
            </Button>
          }
        />
      </div>

      {/* Charts row 2: owner ranking */}
      <ChartCard
        title="负责人收入排行 Top 10"
        option={ownerRankOption}
        loading={loading}
        empty={!stats?.ownerRevenue.length}
        height={360}
      />

      {/* Platform stats cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">平台统计</CardTitle>
          <Badge variant="secondary">{platformCards.length} 个平台</Badge>
        </CardHeader>
        <CardContent>
          <div
            data-ai-section-type="card-list"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))
              : platformCards.map((p) => (
                  <div
                    key={p.platformKey}
                    className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      if (mode === 'all') {
                        setMode('single');
                        setPlatformKey(p.platformKey);
                      } else {
                        navigate(`/stores?platformKey=${p.platformKey}`);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {p.platformName}
                      </span>
                      <Badge variant="outline">
                        {p.storeCount} 家店铺
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {formatIncomeYuanToWan(p.revenue)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">万元</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100"
                        variant="outline"
                      >
                        A类 {p.aCount}
                      </Badge>
                      <Badge
                        className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100"
                        variant="outline"
                      >
                        B类 {p.bCount}
                      </Badge>
                      <Badge
                        className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100"
                        variant="outline"
                      >
                        C类 {p.cCount}
                      </Badge>
                    </div>
                  </div>
                ))}
          </div>
          {!loading && platformCards.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {isMonthQueryMode
                ? '该月份暂无平台收入数据'
                : '暂无平台数据'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
