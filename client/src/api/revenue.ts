import { request } from '@/utils/request';
import type {
  MonthlyRevenueInfo,
  RevenueUpsertRequest,
  RevenueListParams,
  ExcelImportResult,
} from '@shared/api.interface';

export const upsertRevenue = async (
  data: RevenueUpsertRequest,
): Promise<MonthlyRevenueInfo> => {
  const res = await request.post('/api/revenue', data);
  return res.data;
};

export const batchUpsert = async (
  items: RevenueUpsertRequest[],
): Promise<{ count: number }> => {
  const res = await request.post('/api/revenue/batch', { items });
  return res.data;
};

export const listRevenues = async (
  params: RevenueListParams,
): Promise<MonthlyRevenueInfo[]> => {
  const res = await request.get('/api/revenue', { params });
  return res.data;
};

export const getRevenueDetail = async (
  platformKey: string,
  storeId: string,
  month: string,
): Promise<MonthlyRevenueInfo> => {
  const res = await request.get('/api/revenue/detail', {
    params: { platformKey, storeId, month },
  });
  return res.data;
};

export const importExcelRevenue = async (
  rows: Array<Record<string, unknown>>,
): Promise<ExcelImportResult> => {
  const res = await request.post('/api/revenue/import-excel', { rows });
  return res.data;
};

export const deleteRevenue = async (id: string): Promise<{ success: true }> => {
  const res = await request.delete(`/api/revenue/${id}`);
  return res.data;
};
