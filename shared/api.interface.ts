export type StoreStatus = 'normal' | 'closed' | 'pending' | 'terminated';

export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  normal: '正常',
  closed: '停业',
  pending: '待搭建',
  terminated: '已解约',
};

export type AbcCategory = 'A' | 'B' | 'C' | 'none';

export const ABC_LABELS: Record<AbcCategory, string> = {
  A: 'A类高产',
  B: 'B类中产',
  C: 'C类低产',
  none: '未统计',
};

export type RevenuePeriodType = 'month' | 'week';

export interface WeeklyRevenueItem {
  week: string;
  revenue: number;
}

export type StatsDimension = 'month' | 'week';
export type StatsMode = 'all' | 'single';

export type UserRole = 'admin' | 'platform_owner' | 'editor' | 'viewer';
export type PermissionLevel = 'manage' | 'edit' | 'view' | 'none';

export interface PlatformInfo {
  id: string;
  platformKey: string;
  platformName: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface StoreExtra {
  phoneCategory?: string;
  phoneSerial?: string;
  checkPinhoFan?: string;
  pinhaoFan?: string;
  dualPlatform?: string;
  checkBaoPinTuan?: string;
  superHot?: string;
  baoPinTuan?: string;
  checkYiKouJia?: string;
  account?: string;
  businessStatus?: string;
  createTime?: string;
  checkCount?: string;
  promotion?: string;
  operationNotes?: string;
}

export interface StoreInfo {
  id: string;
  platformKey: string;
  storeId: string;
  storeName?: string;
  owner?: string;
  phone?: string;
  address?: string;
  menuType?: string;
  status?: StoreStatus;
  signTime?: string;
  cancelTime?: string;
  shopNotes?: string;
  newStoreNotes?: string;
  abcCategory?: AbcCategory;
  latestRevenue?: number;
  latestPeriod?: string;
  weeklyRevenues?: WeeklyRevenueItem[];
  extra?: StoreExtra;
  createdAt: string;
}

export interface StoreListParams {
  platformKey?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: StoreStatus;
  abcCategory?: AbcCategory;
  owner?: string;
}

export interface StoreListResponse {
  items: StoreInfo[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MonthlyRevenueInfo {
  id: string;
  platformKey: string;
  storeId: string;
  storeName?: string;
  month: string;
  revenue: number;
  periodType?: RevenuePeriodType;
  year?: number;
  periodIndex?: number;
}

export interface RevenueUpsertRequest {
  platformKey: string;
  storeId: string;
  month: string;
  revenue: number;
  periodType?: RevenuePeriodType;
  year?: number;
  periodIndex?: number;
}

export interface RevenueListParams {
  platformKey?: string;
  month?: string;
  storeId?: string;
  periodType?: RevenuePeriodType;
  year?: number;
  periodIndex?: number;
}

export interface UserInfo {
  id: string;
  username: string;
  displayName?: string;
  role: UserRole;
  isActive: boolean;
  platformPermissions?: UserPlatformPermissionInfo[];
}

export interface UserPlatformPermissionInfo {
  userId: string;
  platformKey: string;
  permissionLevel: PermissionLevel;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: UserInfo;
  token: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  displayName?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  displayName?: string;
  role: UserRole;
  platformPermissions?: Array<{
    platformKey: string;
    permissionLevel: PermissionLevel;
  }>;
}

export interface UpdateUserRequest {
  displayName?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
  platformPermissions?: Array<{
    platformKey: string;
    permissionLevel: PermissionLevel;
  }>;
}

export interface StatsOverview {
  totalStores: number;
  totalRevenue: number;
  totalOwners: number;
  totalPlatforms: number;
  aCount: number;
  bCount: number;
  cCount: number;
  noneCount: number;
}

export interface RevenueTrendItem {
  period: string;
  revenue: number;
}

export interface OwnerRevenueItem {
  owner: string;
  revenue: number;
  storeCount: number;
}

export interface PlatformStats {
  platformKey: string;
  platformName: string;
  storeCount: number;
  revenue: number;
  aCount: number;
  bCount: number;
  cCount: number;
}

export interface AbcStatsItem {
  category: AbcCategory;
  label: string;
  count: number;
  revenue: number;
}

export interface DashboardStatsResponse {
  overview: StatsOverview;
  platformStats: PlatformStats[];
  revenueTrend: RevenueTrendItem[];
  ownerRevenue: OwnerRevenueItem[];
  abcStats: AbcStatsItem[];
}

/* ---------- Settings / Config ---------- */

export interface AbcThresholdConfig {
  aMin: number;
  bMin: number;
  bMax: number;
}

export interface AlertSettings {
  cLowProductEnabled: boolean;
  noRevenueEnabled: boolean;
  noRevenuePeriods: number;
  pendingClosedEnabled: boolean;
}

export interface AppSettings {
  abcThreshold: AbcThresholdConfig;
  alerts: AlertSettings;
}

export const DEFAULT_ABC_THRESHOLD: AbcThresholdConfig = {
  aMin: 50000,
  bMin: 20000,
  bMax: 50000,
};

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  cLowProductEnabled: true,
  noRevenueEnabled: true,
  noRevenuePeriods: 2,
  pendingClosedEnabled: true,
};

/* ---------- Alerts ---------- */

export type AlertType =
  | 'c_low_product'
  | 'no_revenue'
  | 'pending_store'
  | 'closed_store';

export interface AlertItem {
  type: AlertType;
  title: string;
  count: number;
  description: string;
  level: 'warning' | 'danger' | 'info';
  filterParams: Record<string, string>;
}

export interface AlertListResponse {
  alerts: AlertItem[];
  totalCount: number;
}

/* ---------- Excel Import ---------- */

export interface ExcelImportRow {
  platformKey: string;
  storeId: string;
  periodType: RevenuePeriodType;
  year: number;
  periodIndex: number;
  revenue: number;
  rowNumber?: number;
}

export interface ExcelImportResult {
  successCount: number;
  failCount: number;
  totalCount: number;
  failedRows: Array<{
    rowNumber: number;
    storeId: string;
    platformKey: string;
    reason: string;
  }>;
  successRows: ExcelImportRow[];
}

export interface StoreImportRow {
  platformKey: string;
  storeId: string;
  storeName?: string;
  owner?: string;
  phone?: string;
  address?: string;
  signTime?: string;
  shopNotes?: string;
  status?: StoreStatus;
  rowNumber?: number;
}

export interface StoreImportResult {
  successCount: number;
  skipCount: number;
  failCount: number;
  totalCount: number;
  failedRows: Array<{
    rowNumber: number;
    storeId: string;
    platformKey: string;
    reason: string;
  }>;
  skippedRows: Array<{
    rowNumber: number;
    storeId: string;
    platformKey: string;
    reason: string;
  }>;
  successRows: StoreInfo[];
}

/* ---------- Batch Operations ---------- */

export const BATCH_OWNER_MAX_COUNT = 200;

export interface BatchUpdateOwnerRequest {
  ids: string[];
  owner: string;
}

export interface BatchUpdateOwnerResult {
  successCount: number;
  failCount: number;
  totalCount: number;
  failedIds: Array<{
    id: string;
    reason: string;
  }>;
}
