import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

interface ChartCardProps {
  title: string;
  option: EChartsOption;
  loading?: boolean;
  height?: number;
  empty?: boolean;
  extra?: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  option,
  loading = false,
  height = 320,
  empty = false,
  extra,
}) => {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {extra}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="w-full" style={{ height }} />
        ) : empty ? (
          <div style={{ height }}>
            <Empty className="h-full border-0">
              <EmptyHeader>
                <EmptyTitle>暂无数据</EmptyTitle>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <ReactECharts
            option={option}
            style={{ height }}
            opts={{ renderer: 'svg' }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ChartCard;
