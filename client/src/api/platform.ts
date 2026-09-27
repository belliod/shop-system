import { request } from '@/utils/request';
import type { PlatformInfo } from '@shared/api.interface';

export interface CreatePlatformRequest {
  platformKey: string;
  platformName: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdatePlatformRequest {
  platformName?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export const listPlatforms = async (): Promise<PlatformInfo[]> => {
  const res = await request.get('/api/platforms');
  return res.data;
};

export const createPlatform = async (
  data: CreatePlatformRequest,
): Promise<PlatformInfo> => {
  const res = await request.post('/api/platforms', data);
  return res.data;
};

export const updatePlatform = async (
  id: string,
  data: UpdatePlatformRequest,
): Promise<PlatformInfo> => {
  const res = await request.patch(`/api/platforms/${id}`, data);
  return res.data;
};
