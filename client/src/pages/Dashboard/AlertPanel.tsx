import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Store,
  TrendingDown,
  Clock,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

import type { AlertItem } from '@shared/api.interface';

interface AlertPanelProps {
  alerts: AlertItem[];
  loading?: boolean;
  platformKey?: string;
}

const LEVEL_STYLES: Record<
  AlertItem['level'],
  { border: string; bg: string; text: string; iconBg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  danger: {
    border: 'border-red-200 hover:border-red-300',
    bg: 'bg-red-50/60',
    text: 'text-red-700',
    iconBg: 'bg-red-100',
    icon: AlertCircle,
  },
  warning: {
    border: 'border-amber-200 hover:border-amber-300',
    bg: 'bg-amber-50/60',
    text: 'text-amber-700',
    iconBg: 'bg-amber-100',
    icon: AlertTriangle,
  },
  info: {
    border: 'border-blue-200 hover:border-blue-300',
    bg: 'bg-blue-50/60',
    text: 'text-blue-700',
    iconBg: 'bg-blue-100',
    icon: Info,
  },
};

const ALERT_ICONS: Record<AlertItem['type'], React.ComponentType<{ className?: string }>> = {
  c_low_product: TrendingDown,
  no_revenue: TrendingDown,
  pending_store: Clock,
  closed_store: Store,
};

const AlertPanel: React.FC<AlertPanelProps> = ({
  alerts,
  loading = false,
  platformKey,
}) => {
  const navigate = useNavigate();

  const handleAlertClick = (alert: AlertItem): void => {
    try {
      const params = new URLSearchParams();
      if (platformKey) {
        params.set('platformKey', platformKey);
      }
      Object.entries(alert.filterParams).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      navigate(`/stores?${params.toString()}`);
    } catch (err: unknown) {
      logger.error('navigate to stores failed', err);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">告警提醒</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            data-ai-section-type="card-list"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">告警提醒</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8">
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyTitle>暂无告警</EmptyTitle>
              </EmptyHeader>
            </Empty>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">告警提醒</CardTitle>
        <Badge variant="destructive">{alerts.length} 条</Badge>
      </CardHeader>
      <CardContent>
        <div
          data-ai-section-type="card-list"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {alerts.map((alert: AlertItem) => {
            const style = LEVEL_STYLES[alert.level];
            const Icon = ALERT_ICONS[alert.type] || style.icon;
            return (
              <button
                key={alert.type}
                type="button"
                onClick={() => handleAlertClick(alert)}
                className={`group flex flex-col gap-2 rounded-lg border ${style.border} ${style.bg} p-4 text-left transition-all hover:shadow-md`}
              >
                <div className="flex items-start justify-between">
                  <div className={`flex size-9 items-center justify-center rounded-lg ${style.iconBg}`}>
                    <Icon className={`size-5 ${style.text}`} />
                  </div>
                  <span className={`text-2xl font-bold ${style.text}`}>
                    {alert.count}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`text-sm font-semibold ${style.text}`}>
                    {alert.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {alert.description}
                  </span>
                </div>
                <span className={`mt-auto text-xs font-medium ${style.text} opacity-0 transition-opacity group-hover:opacity-100`}>
                  点击查看 →
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertPanel;
