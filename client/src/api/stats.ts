import { request } from '@/utils/request';
import type {
  DashboardStatsResponse,
  StatsDimension,
} from '@shared/api.interface';

export interface DashboardStatsParams {
  platformKey?: string;
  dimension?: StatsDimension;
  months?: number;
  month?: string;
}

export const getDashboardStats = async (
  params?: DashboardStatsParams,
): Promise<DashboardStatsResponse> => {
  const res = await request.get('/api/stats/dashboard', {
    params: params ?? {},
  });
  return res.data;
};
