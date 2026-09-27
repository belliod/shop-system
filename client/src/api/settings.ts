import { request } from '@/utils/request';
import type {
  AppSettings,
  AbcThresholdConfig,
  AlertSettings,
  AlertListResponse,
  ExcelImportResult,
  ExcelImportRow,
} from '@shared/api.interface';

export const getSettings = async (): Promise<AppSettings> => {
  const res = await request.get('/api/settings');
  return res.data;
};

export const updateAbcThreshold = async (
  data: AbcThresholdConfig,
): Promise<AbcThresholdConfig> => {
  const res = await request.patch(
    '/api/settings/abc-threshold',
    data,
  );
  return res.data;
};

export const updateAlertSettings = async (
  data: AlertSettings,
): Promise<AlertSettings> => {
  const res = await request.patch('/api/settings/alerts', data);
  return res.data;
};

export const getAlerts = async (
  platformKey?: string,
): Promise<AlertListResponse> => {
  const res = await request.get('/api/alerts', {
    params: platformKey ? { platformKey } : {},
  });
  return res.data;
};

export const importExcelRevenue = async (
  rows: ExcelImportRow[],
): Promise<ExcelImportResult> => {
  const res = await request.post('/api/revenue/import-excel', { rows });
  return res.data;
};

export const exportStoresCsv = async (params: {
  platformKey?: string;
  search?: string;
  status?: string;
  abcCategory?: string;
}): Promise<string> => {
  const res = await request.get('/api/export/stores.csv', { params });
  return res.data;
};

export const exportRevenueCsv = async (params: {
  platformKey?: string;
  periodType?: string;
  year?: number;
}): Promise<string> => {
  const res = await request.get('/api/export/revenue.csv', { params });
  return res.data;
};

export const exportStatsCsv = async (params: {
  platformKey?: string;
  dimension?: string;
}): Promise<string> => {
  const res = await request.get('/api/export/stats.csv', { params });
  return res.data;
};
