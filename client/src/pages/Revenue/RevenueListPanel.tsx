import React, { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { Button } from '@client/src/components/ui/button';
import { Trash2 } from 'lucide-react';
import { formatIncomeYuanToWan } from '@/utils/format-income';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { revenueApi } from '@client/src/api';
import type {
  MonthlyRevenueInfo,
  RevenuePeriodType,
} from '@shared/api.interface';

interface RevenueListPanelProps {
  periodType: RevenuePeriodType;
  revenues: MonthlyRevenueInfo[];
  loading: boolean;
  onDeleted: () => void;
}

const RevenueListPanel: React.FC<RevenueListPanelProps> = ({
  periodType,
  revenues,
  loading,
  onDeleted,
}) => {
  const [deletingId, setDeletingId] = useState<string>('');

  const totalRevenue: number = useMemo(
    () =>
      revenues.reduce(
        (sum: number, item: MonthlyRevenueInfo) =>
          sum + Number(item.revenue || 0),
        0,
      ),
    [revenues],
  );

  const handleDelete = async (id: string): Promise<void> => {
    setDeletingId(id);
    try {
      await revenueApi.deleteRevenue(id);
      toast.success('删除成功');
      onDeleted();
    } catch (err: unknown) {
      logger.error('delete revenue failed', err);
      toast.error('删除失败，请重试');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-4">
        {periodType === 'week' ? '当周收入列表' : '当月收入列表'}
      </h2>
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">
            加载中...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>店铺ID</TableHead>
                <TableHead>店铺名称</TableHead>
                <TableHead className="text-right">
                  收入金额（万元）
                </TableHead>
                <TableHead className="text-right w-20">
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenues.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-10 text-muted-foreground"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                revenues.map((item: MonthlyRevenueInfo) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.storeId}</TableCell>
                    <TableCell>{item.storeName || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatIncomeYuanToWan(item.revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">
                  {periodType === 'week' ? '当周合计' : '当月合计'}
                </TableCell>
                <TableCell className="text-right font-bold text-primary">
                  {formatIncomeYuanToWan(totalRevenue)} 万元
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>
    </div>
  );
};

export default RevenueListPanel;
