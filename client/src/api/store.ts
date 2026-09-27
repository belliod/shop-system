import { request } from '@/utils/request';
import { dbStores, ensureInitialized } from '../db/local-db';
import type {
  StoreInfo,
  StoreListParams,
  StoreListResponse,
  StoreImportRow,
  StoreImportResult,
  BatchUpdateOwnerRequest,
  BatchUpdateOwnerResult,
} from '@shared/api.interface';

// 注意：bulkImportStores 后端暂无对应接口，暂时保留本地 db 实现
// 待后端添加 POST /api/stores/import 后再迁移

export const listStores = async (
  params: StoreListParams,
): Promise<StoreListResponse> => {
  const res = await request.get('/api/stores', { params });
  return res.data;
};

export const listOwners = async (platformKey: string): Promise<string[]> => {
  const res = await request.get('/api/stores/owners', {
    params: { platformKey },
  });
  return res.data;
};

export const getStore = async (id: string): Promise<StoreInfo> => {
  const res = await request.get(`/api/stores/${id}`);
  return res.data;
};

export const createStore = async (
  data: Omit<StoreInfo, 'id' | 'createdAt'>,
): Promise<StoreInfo> => {
  const res = await request.post('/api/stores', data);
  return res.data;
};

export const updateStore = async (
  id: string,
  data: Partial<Omit<StoreInfo, 'id' | 'createdAt'>>,
): Promise<StoreInfo> => {
  const res = await request.patch(`/api/stores/${id}`, data);
  return res.data;
};

export const updateStoreStatus = async (
  id: string,
  status: string,
): Promise<StoreInfo> => {
  const res = await request.patch(`/api/stores/${id}/status`, {
    status,
  });
  return res.data;
};

export const deleteStore = async (id: string): Promise<void> => {
  await request.delete(`/api/stores/${id}`);
};

export const bulkImportStores = async (
  rows: StoreImportRow[],
): Promise<StoreImportResult> => {
  // TODO: 后端暂无 POST /api/stores/import 接口，暂时保留本地实现
  ensureInitialized();
  return dbStores.bulkImport(rows);
};

export const batchUpdateOwner = async (
  data: BatchUpdateOwnerRequest,
): Promise<BatchUpdateOwnerResult> => {
  const res = await request.patch('/api/stores/batch-owner', data);
  return res.data;
};
