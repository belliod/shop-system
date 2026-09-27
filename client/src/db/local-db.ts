import type {
  PlatformInfo,
  StoreInfo,
  StoreStatus,
  StoreExtra,
  MonthlyRevenueInfo,
  UserInfo,
  UserRole,
  PermissionLevel,
  RevenuePeriodType,
  AppSettings,
  AbcThresholdConfig,
  AlertSettings,
  AlertItem,
  DashboardStatsResponse,
  StatsOverview,
  PlatformStats,
  RevenueTrendItem,
  OwnerRevenueItem,
  AbcCategory,
  AbcStatsItem,
  DEFAULT_ABC_THRESHOLD,
  DEFAULT_ALERT_SETTINGS,
} from '@shared/api.interface';

const KEY_INIT = 'lsdb_initialized_v1';
const KEY_USERS = 'lsdb_users';
const KEY_USER_PASS = 'lsdb_user_pass';
const KEY_PLATFORMS = 'lsdb_platforms';
const KEY_STORES = 'lsdb_stores';
const KEY_REVENUE = 'lsdb_revenue';
const KEY_SETTINGS = 'lsdb_settings';

const genId = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const nowIso = (): string => new Date().toISOString();

const readArr = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
};

const writeArr = <T>(key: string, data: T[]): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

const readObj = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeObj = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

/* ---------------- seed data ---------------- */

const seedPlatforms = (): PlatformInfo[] => [
  {
    id: genId(),
    platformKey: 'meituan',
    platformName: '美团平台',
    description: '美团外卖店铺运营管理',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: genId(),
    platformKey: 'shangou',
    platformName: '闪购平台',
    description: '饿了么 / 闪购店铺运营管理',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: genId(),
    platformKey: 'jingdong',
    platformName: '京东平台',
    description: '京东到家门店运营管理',
    isActive: true,
    sortOrder: 3,
  },
];

const seedStores = (): StoreInfo[] => {
  const createdAt = nowIso();
  return [
    {
      id: genId(),
      platformKey: 'meituan',
      storeId: '30119599',
      storeName: '琴海路店',
      owner: 'KIKI-9',
      phone: '13392536145',
      address: '珠海市横琴镇琴海路',
      menuType: 'S',
      status: 'normal' as StoreStatus,
      signTime: '2025-03-15',
      shopNotes: '拼好饭主站，已签约',
      extra: {
        phoneCategory: 'A',
        phoneSerial: '1',
        checkPinhoFan: '已检查',
        pinhaoFan: '拼好饭主站',
        dualPlatform: '否',
        checkCount: '3',
      } as StoreExtra,
      createdAt,
    },
    {
      id: genId(),
      platformKey: 'meituan',
      storeId: '14948881',
      storeName: '西乡街道店',
      owner: '胡崇晖',
      phone: '17397026223',
      address: '深圳市宝安区西乡街道',
      menuType: 'S',
      status: 'normal' as StoreStatus,
      signTime: '2025-05-10',
      extra: {
        phoneSerial: '1',
        dualPlatform: '否',
        checkCount: '2',
      } as StoreExtra,
      createdAt,
    },
    {
      id: genId(),
      platformKey: 'shangou',
      storeId: '529915723',
      storeName: '上海兰甄亭龙启路店',
      owner: 'KIKI-9',
      phone: '15597270518',
      address: '上海市龙启路',
      menuType: 'D',
      status: 'normal' as StoreStatus,
      signTime: '2025-04-20',
      newStoreNotes: '已换菜单',
      extra: {
        checkBaoPinTuan: '已检查',
        dualPlatform: '否',
        superHot: '否',
        baoPinTuan: '否',
        checkCount: '1',
      } as StoreExtra,
      createdAt,
    },
    {
      id: genId(),
      platformKey: 'shangou',
      storeId: '1333749722',
      storeName: '中山小榄同昌路店',
      owner: '胡崇晖',
      phone: '16676005015',
      address: '中山市小榄镇同昌路',
      menuType: 'D',
      status: 'pending' as StoreStatus,
      shopNotes: '需要新店搭建',
      extra: {
        checkBaoPinTuan: '未检查',
        dualPlatform: '否',
        checkCount: '0',
      } as StoreExtra,
      createdAt,
    },
    {
      id: genId(),
      platformKey: 'jingdong',
      storeId: '24036093',
      storeName: '兰州拉面·拌饭·饺子（永和路店）',
      owner: 'KIKI-9',
      phone: '18397159916',
      address: '永和路',
      menuType: '综合',
      status: 'normal' as StoreStatus,
      signTime: '2026-07-20',
      extra: {
        account: 'JDWM18397159916',
        businessStatus: '营业中',
        createTime: '2026-07-20',
        checkYiKouJia: '已检查',
        checkCount: '1',
      } as StoreExtra,
      createdAt,
    },
  ];
};

const seedRevenue = (): MonthlyRevenueInfo[] => {
  const base = [
    { platformKey: 'meituan', storeId: '30119599', storeName: '琴海路店' },
    { platformKey: 'meituan', storeId: '14948881', storeName: '西乡街道店' },
    {
      platformKey: 'shangou',
      storeId: '529915723',
      storeName: '上海兰甄亭龙启路店',
    },
    {
      platformKey: 'shangou',
      storeId: '1333749722',
      storeName: '中山小榄同昌路店',
    },
    {
      platformKey: 'jingdong',
      storeId: '24036093',
      storeName: '兰州拉面·拌饭·饺子（永和路店）',
    },
  ];
  const months = [
    { key: '2026-05', idx: 5 },
    { key: '2026-06', idx: 6 },
    { key: '2026-07', idx: 7 },
    { key: '2026-08', idx: 8 },
  ];
  const result: MonthlyRevenueInfo[] = [];
  let seed = 42;
  const rand = (): number => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (const s of base) {
    for (const m of months) {
      const min = 15000 + (s.platformKey === 'meituan' ? 20000 : 0);
      const max = 70000 + (s.platformKey === 'jingdong' ? 10000 : 0);
      const revenue = Math.round(min + rand() * (max - min));
      result.push({
        id: genId(),
        platformKey: s.platformKey,
        storeId: s.storeId,
        storeName: s.storeName,
        month: m.key,
        revenue,
        periodType: 'month',
        year: 2026,
        periodIndex: m.idx,
      });
    }
  }
  return result;
};

const seedAdmin = (): { users: UserInfo[]; passwords: Record<string, string> } => {
  const userId = genId();
  const user: UserInfo = {
    id: userId,
    username: 'admin',
    displayName: '超级管理员',
    role: 'admin',
    isActive: true,
    platformPermissions: [
      { userId, platformKey: 'meituan', permissionLevel: 'manage' },
      { userId, platformKey: 'shangou', permissionLevel: 'manage' },
      { userId, platformKey: 'jingdong', permissionLevel: 'manage' },
    ],
  };
  return { users: [user], passwords: { [userId]: 'Admin@123456' } };
};

const seedSettings = (): AppSettings => ({
  abcThreshold: { aMin: 50000, bMin: 20000, bMax: 50000 },
  alerts: {
    cLowProductEnabled: true,
    noRevenueEnabled: true,
    noRevenuePeriods: 2,
    pendingClosedEnabled: true,
  },
});

export const ensureInitialized = (): void => {
  if (localStorage.getItem(KEY_INIT)) return;
  const platforms = seedPlatforms();
  const stores = seedStores();
  const revenue = seedRevenue();
  const { users, passwords } = seedAdmin();
  const settings = seedSettings();
  writeArr(KEY_PLATFORMS, platforms);
  writeArr(KEY_STORES, stores);
  writeArr(KEY_REVENUE, revenue);
  writeArr(KEY_USERS, users);
  writeObj(KEY_USER_PASS, passwords);
  writeObj(KEY_SETTINGS, settings);
  localStorage.setItem(KEY_INIT, '1');
};

/* ---------------- platform ---------------- */

export const dbPlatforms = {
  list: (): PlatformInfo[] => {
    ensureInitialized();
    return readArr<PlatformInfo>(KEY_PLATFORMS).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
  },
  create: (
    data: Omit<PlatformInfo, 'id'> & Partial<Pick<PlatformInfo, 'id'>>,
  ): PlatformInfo => {
    const list = readArr<PlatformInfo>(KEY_PLATFORMS);
    const exist = list.find((p) => p.platformKey === data.platformKey);
    if (exist) throw new Error('平台标识已存在');
    const item: PlatformInfo = {
      id: data.id || genId(),
      platformKey: data.platformKey,
      platformName: data.platformName,
      description: data.description,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? list.length + 1,
    };
    list.push(item);
    writeArr(KEY_PLATFORMS, list);
    return item;
  },
  update: (id: string, patch: Partial<PlatformInfo>): PlatformInfo => {
    const list = readArr<PlatformInfo>(KEY_PLATFORMS);
    const idx = list.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error('平台不存在');
    list[idx] = { ...list[idx], ...patch };
    writeArr(KEY_PLATFORMS, list);
    return list[idx];
  },
};

/* ---------------- stores ---------------- */

export const dbStores = {
  list: (params: {
    platformKey?: string;
    page?: number;
    pageSize?: number;
    search?: string;
    status?: StoreStatus;
    abcCategory?: AbcCategory;
    owner?: string;
  }): { items: StoreInfo[]; total: number; page: number; pageSize: number } => {
    ensureInitialized();
    const allStores = readArr<StoreInfo>(KEY_STORES);
    const abcMap = computeAbcForStores(allStores, readSettings().abcThreshold);
    let list = allStores.map((s) => ({
      ...s,
      abcCategory: abcMap.get(s.id) ?? 'none',
    }));
    if (params.platformKey) list = list.filter((s) => s.platformKey === params.platformKey);
    if (params.status) list = list.filter((s) => s.status === params.status);
    if (params.abcCategory) list = list.filter((s) => s.abcCategory === params.abcCategory);
    if (params.owner) list = list.filter((s) => s.owner === params.owner);
    if (params.search) {
      const kw = params.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.storeId.toLowerCase().includes(kw) ||
          (s.storeName || '').toLowerCase().includes(kw) ||
          (s.owner || '').toLowerCase().includes(kw) ||
          (s.address || '').toLowerCase().includes(kw),
      );
    }
    const total = list.length;
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const items = list.slice((page - 1) * pageSize, page * pageSize);
    return { items, total, page, pageSize };
  },
  listOwners: (platformKey?: string): string[] => {
    ensureInitialized();
    const list = readArr<StoreInfo>(KEY_STORES);
    const filtered = platformKey
      ? list.filter((s) => s.platformKey === platformKey)
      : list;
    const owners = Array.from(new Set(filtered.map((s) => s.owner).filter(Boolean) as string[]));
    return owners.sort();
  },
  get: (id: string): StoreInfo | undefined => {
    ensureInitialized();
    const s = readArr<StoreInfo>(KEY_STORES).find((x) => x.id === id);
    if (!s) return undefined;
    const abcMap = computeAbcForStores(
      readArr<StoreInfo>(KEY_STORES),
      readSettings().abcThreshold,
    );
    return { ...s, abcCategory: abcMap.get(s.id) ?? 'none' };
  },
  create: (data: Omit<StoreInfo, 'id' | 'createdAt'>): StoreInfo => {
    const list = readArr<StoreInfo>(KEY_STORES);
    const exist = list.find(
      (s) => s.platformKey === data.platformKey && s.storeId === data.storeId,
    );
    if (exist) throw new Error('该平台下店铺ID已存在');
    const item: StoreInfo = { ...data, id: genId(), createdAt: nowIso() };
    list.push(item);
    writeArr(KEY_STORES, list);
    return item;
  },
  update: (
    id: string,
    data: Partial<Omit<StoreInfo, 'id' | 'createdAt'>>,
  ): StoreInfo => {
    const list = readArr<StoreInfo>(KEY_STORES);
    const idx = list.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error('店铺不存在');
    list[idx] = { ...list[idx], ...data };
    writeArr(KEY_STORES, list);
    return list[idx];
  },
  updateStatus: (id: string, status: string): StoreInfo => {
    return dbStores.update(id, { status: status as StoreStatus });
  },
  remove: (id: string): void => {
    const list = readArr<StoreInfo>(KEY_STORES).filter((s) => s.id !== id);
    writeArr(KEY_STORES, list);
  },
  bulkImport: (rows: Array<{
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
  }>): {
    successCount: number;
    skipCount: number;
    failCount: number;
    totalCount: number;
    failedRows: Array<{ rowNumber: number; storeId: string; platformKey: string; reason: string }>;
    skippedRows: Array<{ rowNumber: number; storeId: string; platformKey: string; reason: string }>;
    successRows: StoreInfo[];
  } => {
    const list = readArr<StoreInfo>(KEY_STORES);
    const platforms = readArr<PlatformInfo>(KEY_PLATFORMS);
    const platformKeys = new Set(platforms.map((p) => p.platformKey));
    const successRows: StoreInfo[] = [];
    const skippedRows: Array<{ rowNumber: number; storeId: string; platformKey: string; reason: string }> = [];
    const failedRows: Array<{ rowNumber: number; storeId: string; platformKey: string; reason: string }> = [];

    for (const row of rows) {
      const rowNumber = row.rowNumber ?? 0;
      const platformKey = (row.platformKey || '').trim();
      const storeId = (row.storeId || '').trim();

      if (!storeId) {
        failedRows.push({
          rowNumber,
          storeId,
          platformKey,
          reason: '店铺ID不能为空',
        });
        continue;
      }

      if (!platformKey) {
        failedRows.push({
          rowNumber,
          storeId,
          platformKey,
          reason: '平台编码不能为空',
        });
        continue;
      }

      if (!platformKeys.has(platformKey)) {
        failedRows.push({
          rowNumber,
          storeId,
          platformKey,
          reason: `平台编码「${platformKey}」不存在`,
        });
        continue;
      }

      const exist = list.find(
        (s) => s.platformKey === platformKey && s.storeId === storeId,
      );
      if (exist) {
        skippedRows.push({
          rowNumber,
          storeId,
          platformKey,
          reason: '该平台下店铺ID已存在，跳过',
        });
        continue;
      }

      const item: StoreInfo = {
        id: genId(),
        platformKey,
        storeId,
        storeName: row.storeName?.trim() || undefined,
        owner: row.owner?.trim() || undefined,
        phone: row.phone?.trim() || undefined,
        address: row.address?.trim() || undefined,
        signTime: row.signTime?.trim() || undefined,
        shopNotes: row.shopNotes?.trim() || undefined,
        status: row.status as StoreStatus | undefined,
        createdAt: nowIso(),
      };
      list.push(item);
      successRows.push(item);
    }

    if (successRows.length > 0) {
      writeArr(KEY_STORES, list);
    }

    return {
      successCount: successRows.length,
      skipCount: skippedRows.length,
      failCount: failedRows.length,
      totalCount: rows.length,
      failedRows,
      skippedRows,
      successRows,
    };
  },
};

/* ---------------- revenue ---------------- */

export const dbRevenue = {
  list: (params: {
    platformKey?: string;
    month?: string;
    storeId?: string;
    periodType?: RevenuePeriodType;
    year?: number;
    periodIndex?: number;
  }): MonthlyRevenueInfo[] => {
    ensureInitialized();
    let list = readArr<MonthlyRevenueInfo>(KEY_REVENUE);
    if (params.platformKey) list = list.filter((r) => r.platformKey === params.platformKey);
    if (params.month) list = list.filter((r) => r.month === params.month);
    if (params.storeId) list = list.filter((r) => r.storeId === params.storeId);
    if (params.periodType) list = list.filter((r) => r.periodType === params.periodType);
    if (params.year) list = list.filter((r) => r.year === params.year);
    if (params.periodIndex) list = list.filter((r) => r.periodIndex === params.periodIndex);
    return list;
  },
  getDetail: (
    platformKey: string,
    storeId: string,
    month: string,
  ): MonthlyRevenueInfo | undefined => {
    return readArr<MonthlyRevenueInfo>(KEY_REVENUE).find(
      (r) =>
        r.platformKey === platformKey && r.storeId === storeId && r.month === month,
    );
  },
  upsert: (data: {
    platformKey: string;
    storeId: string;
    month: string;
    revenue: number;
    periodType?: RevenuePeriodType;
    year?: number;
    periodIndex?: number;
  }): MonthlyRevenueInfo => {
    const list = readArr<MonthlyRevenueInfo>(KEY_REVENUE);
    const store = readArr<StoreInfo>(KEY_STORES).find(
      (s) => s.platformKey === data.platformKey && s.storeId === data.storeId,
    );
    if (!store) throw new Error(`店铺 ${data.storeId} 在该平台不存在`);
    const idx = list.findIndex(
      (r) =>
        r.platformKey === data.platformKey &&
        r.storeId === data.storeId &&
        r.month === data.month,
    );
    const record: MonthlyRevenueInfo = {
      id: idx >= 0 ? list[idx].id : genId(),
      platformKey: data.platformKey,
      storeId: data.storeId,
      storeName: store.storeName,
      month: data.month,
      revenue: data.revenue,
      periodType: data.periodType || 'month',
      year: data.year,
      periodIndex: data.periodIndex,
    };
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.push(record);
    }
    writeArr(KEY_REVENUE, list);
    return record;
  },
  batchUpsert: (
    items: Array<{
      platformKey: string;
      storeId: string;
      month: string;
      revenue: number;
      periodType?: RevenuePeriodType;
      year?: number;
      periodIndex?: number;
    }>,
  ): MonthlyRevenueInfo[] => {
    const list = readArr<MonthlyRevenueInfo>(KEY_REVENUE);
    const stores = readArr<StoreInfo>(KEY_STORES);
    const results: MonthlyRevenueInfo[] = [];
    for (const data of items) {
      const store = stores.find(
        (s) => s.platformKey === data.platformKey && s.storeId === data.storeId,
      );
      if (!store) continue;
      const idx = list.findIndex(
        (r) =>
          r.platformKey === data.platformKey &&
          r.storeId === data.storeId &&
          r.month === data.month,
      );
      const record: MonthlyRevenueInfo = {
        id: idx >= 0 ? list[idx].id : genId(),
        platformKey: data.platformKey,
        storeId: data.storeId,
        storeName: store.storeName,
        month: data.month,
        revenue: data.revenue,
        periodType: data.periodType || 'month',
        year: data.year,
        periodIndex: data.periodIndex,
      };
      if (idx >= 0) {
        list[idx] = record;
      } else {
        list.push(record);
      }
      results.push(record);
    }
    writeArr(KEY_REVENUE, list);
    return results;
  },
};

/* ---------------- users ---------------- */

interface PasswordMap {
  [userId: string]: string;
}

export const dbUsers = {
  list: (): UserInfo[] => {
    ensureInitialized();
    return readArr<UserInfo>(KEY_USERS);
  },
  findByUsername: (username: string): UserInfo | undefined => {
    ensureInitialized();
    return readArr<UserInfo>(KEY_USERS).find(
      (u) => u.username.toLowerCase() === username.toLowerCase(),
    );
  },
  findById: (id: string): UserInfo | undefined => {
    ensureInitialized();
    return readArr<UserInfo>(KEY_USERS).find((u) => u.id === id);
  },
  getPassword: (userId: string): string | undefined => {
    const map = readObj<PasswordMap>(KEY_USER_PASS, {});
    return map[userId];
  },
  create: (data: {
    username: string;
    password: string;
    displayName?: string;
    role: UserRole;
    isActive?: boolean;
    platformPermissions?: Array<{
      platformKey: string;
      permissionLevel: PermissionLevel;
    }>;
  }): UserInfo => {
    const list = readArr<UserInfo>(KEY_USERS);
    const exist = list.find(
      (u) => u.username.toLowerCase() === data.username.toLowerCase(),
    );
    if (exist) throw new Error('用户名已存在');
    const userId = genId();
    const user: UserInfo = {
      id: userId,
      username: data.username,
      displayName: data.displayName,
      role: data.role,
      isActive: data.isActive ?? true,
      platformPermissions: data.platformPermissions
        ? data.platformPermissions.map((p) => ({ ...p, userId }))
        : [],
    };
    list.push(user);
    writeArr(KEY_USERS, list);
    const map = readObj<PasswordMap>(KEY_USER_PASS, {});
    map[userId] = data.password;
    writeObj(KEY_USER_PASS, map);
    return user;
  },
  update: (
    id: string,
    patch: {
      displayName?: string;
      role?: UserRole;
      isActive?: boolean;
      password?: string;
      platformPermissions?: Array<{
        platformKey: string;
        permissionLevel: PermissionLevel;
      }>;
    },
  ): UserInfo => {
    const list = readArr<UserInfo>(KEY_USERS);
    const idx = list.findIndex((u) => u.id === id);
    if (idx < 0) throw new Error('用户不存在');
    const updated: UserInfo = { ...list[idx] };
    if (patch.displayName !== undefined) updated.displayName = patch.displayName;
    if (patch.role !== undefined) updated.role = patch.role;
    if (patch.isActive !== undefined) updated.isActive = patch.isActive;
    if (patch.platformPermissions !== undefined) {
      updated.platformPermissions = patch.platformPermissions.map((p) => ({
        ...p,
        userId: id,
      }));
    }
    list[idx] = updated;
    writeArr(KEY_USERS, list);
    if (patch.password !== undefined) {
      const map = readObj<PasswordMap>(KEY_USER_PASS, {});
      map[id] = patch.password;
      writeObj(KEY_USER_PASS, map);
    }
    return updated;
  },
  isFirstUser: (): boolean => {
    return readArr<UserInfo>(KEY_USERS).length === 0;
  },
};

/* ---------------- settings ---------------- */

const readSettings = (): AppSettings => {
  ensureInitialized();
  return readObj<AppSettings>(KEY_SETTINGS, seedSettings());
};

export const dbSettings = {
  get: (): AppSettings => readSettings(),
  updateAbcThreshold: (data: AbcThresholdConfig): AbcThresholdConfig => {
    const s = readSettings();
    s.abcThreshold = data;
    writeObj(KEY_SETTINGS, s);
    return data;
  },
  updateAlerts: (data: AlertSettings): AlertSettings => {
    const s = readSettings();
    s.alerts = data;
    writeObj(KEY_SETTINGS, s);
    return data;
  },
};

/* ---------------- abc computation ---------------- */

const computeAbcForStores = (
  stores: StoreInfo[],
  threshold: AbcThresholdConfig,
): Map<string, AbcCategory> => {
  const map = new Map<string, AbcCategory>();
  const latest = new Map<string, number>();
  const revenues = readArr<MonthlyRevenueInfo>(KEY_REVENUE);
  const monthMap = new Map<string, MonthlyRevenueInfo[]>();
  for (const r of revenues) {
    const key = `${r.platformKey}_${r.storeId}`;
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(r);
  }
  for (const s of stores) {
    const key = `${s.platformKey}_${s.storeId}`;
    const rs = monthMap.get(key) || [];
    if (rs.length === 0) {
      map.set(s.id, 'none');
      continue;
    }
    const total = rs.reduce((sum: number, r) => sum + Number(r.revenue), 0);
    const avg = total / rs.length;
    let cat: AbcCategory;
    if (avg >= threshold.aMin) cat = 'A';
    else if (avg >= threshold.bMin && avg < threshold.bMax) cat = 'B';
    else cat = 'C';
    map.set(s.id, cat);
    latest.set(s.id, Number(rs[rs.length - 1].revenue));
  }
  return map;
};

/* ---------------- stats ---------------- */

export const dbStats = {
  dashboard: (params: {
    platformKey?: string;
    dimension?: 'month' | 'week';
    months?: number;
  }): DashboardStatsResponse => {
    ensureInitialized();
    const stores = readArr<StoreInfo>(KEY_STORES);
    const revenues = readArr<MonthlyRevenueInfo>(KEY_REVENUE);
    const platforms = readArr<PlatformInfo>(KEY_PLATFORMS).filter(
      (p) => p.isActive,
    );
    const targetPlatforms = params.platformKey
      ? platforms.filter((p) => p.platformKey === params.platformKey)
      : platforms;
    const targetPlatformKeys = new Set(targetPlatforms.map((p) => p.platformKey));
    const filteredStores = stores.filter((s) => targetPlatformKeys.has(s.platformKey));
    const filteredRevenue = revenues.filter((r) =>
      targetPlatformKeys.has(r.platformKey),
    );
    const abcMap = computeAbcForStores(filteredStores, readSettings().abcThreshold);

    const owners = new Set(filteredStores.map((s) => s.owner).filter(Boolean));
    const aCount = Array.from(abcMap.values()).filter((v) => v === 'A').length;
    const bCount = Array.from(abcMap.values()).filter((v) => v === 'B').length;
    const cCount = Array.from(abcMap.values()).filter((v) => v === 'C').length;
    const noneCount = Array.from(abcMap.values()).filter((v) => v === 'none').length;
    const totalRevenue = filteredRevenue.reduce(
      (sum: number, r) => sum + Number(r.revenue),
      0,
    );

    const overview: StatsOverview = {
      totalStores: filteredStores.length,
      totalRevenue,
      totalOwners: owners.size,
      totalPlatforms: targetPlatforms.length,
      aCount,
      bCount,
      cCount,
      noneCount,
    };

    const platformStats: PlatformStats[] = targetPlatforms.map((p) => {
      const ps = filteredStores.filter((s) => s.platformKey === p.platformKey);
      const pr = filteredRevenue.filter((r) => r.platformKey === p.platformKey);
      let pa = 0,
        pb = 0,
        pc = 0;
      for (const s of ps) {
        const c = abcMap.get(s.id);
        if (c === 'A') pa++;
        else if (c === 'B') pb++;
        else if (c === 'C') pc++;
      }
      return {
        platformKey: p.platformKey,
        platformName: p.platformName,
        storeCount: ps.length,
        revenue: pr.reduce((sum: number, r) => sum + Number(r.revenue), 0),
        aCount: pa,
        bCount: pb,
        cCount: pc,
      };
    });

    const trendMap = new Map<string, number>();
    for (const r of filteredRevenue) {
      const period = r.month;
      trendMap.set(period, (trendMap.get(period) ?? 0) + Number(r.revenue));
    }
    const revenueTrend: RevenueTrendItem[] = Array.from(trendMap.entries())
      .map(([period, revenue]) => ({ period, revenue }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const ownerMap = new Map<string, { revenue: number; storeIds: Set<string> }>();
    const storeOwnerMap = new Map<string, string>();
    for (const s of filteredStores) {
      if (s.owner) storeOwnerMap.set(`${s.platformKey}_${s.storeId}`, s.owner);
    }
    for (const r of filteredRevenue) {
      const owner = storeOwnerMap.get(`${r.platformKey}_${r.storeId}`);
      if (!owner) continue;
      if (!ownerMap.has(owner)) {
        ownerMap.set(owner, { revenue: 0, storeIds: new Set() });
      }
      const entry = ownerMap.get(owner)!;
      entry.revenue += Number(r.revenue);
      entry.storeIds.add(`${r.platformKey}_${r.storeId}`);
    }
    const ownerRevenue: OwnerRevenueItem[] = Array.from(ownerMap.entries())
      .map(([owner, v]) => ({
        owner,
        revenue: v.revenue,
        storeCount: v.storeIds.size,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const abcStats: AbcStatsItem[] = (
      ['A', 'B', 'C', 'none'] as AbcCategory[]
    ).map((cat) => {
      const catStores = filteredStores.filter((s) => abcMap.get(s.id) === cat);
      const catRevenue = filteredRevenue
        .filter((r) => {
          const s = filteredStores.find(
            (st) => st.platformKey === r.platformKey && st.storeId === r.storeId,
          );
          return s && abcMap.get(s.id) === cat;
        })
        .reduce((sum: number, r) => sum + Number(r.revenue), 0);
      const labelMap: Record<AbcCategory, string> = {
        A: 'A类高产',
        B: 'B类中产',
        C: 'C类低产',
        none: '未统计',
      };
      return {
        category: cat,
        label: labelMap[cat],
        count: catStores.length,
        revenue: catRevenue,
      };
    });

    return {
      overview,
      platformStats,
      revenueTrend,
      ownerRevenue,
      abcStats,
    };
  },
};

/* ---------------- alerts ---------------- */

export const dbAlerts = {
  list: (platformKey?: string): { alerts: AlertItem[]; totalCount: number } => {
    ensureInitialized();
    const stores = readArr<StoreInfo>(KEY_STORES).filter(
      (s) => !platformKey || s.platformKey === platformKey,
    );
    const revenue = readArr<MonthlyRevenueInfo>(KEY_REVENUE).filter(
      (r) => !platformKey || r.platformKey === platformKey,
    );
    const settings = readSettings();
    const alerts: AlertItem[] = [];

    const pendingStores = stores.filter((s) => s.status === 'pending');
    if (settings.alerts.pendingClosedEnabled && pendingStores.length > 0) {
      alerts.push({
        type: 'pending_store',
        title: '待搭建店铺',
        count: pendingStores.length,
        description: `有 ${pendingStores.length} 家店铺处于待搭建状态，请及时跟进`,
        level: 'info',
        filterParams: { status: 'pending' },
      });
    }

    const closedStores = stores.filter(
      (s) => s.status === 'closed' || s.status === 'terminated',
    );
    if (settings.alerts.pendingClosedEnabled && closedStores.length > 0) {
      alerts.push({
        type: 'closed_store',
        title: '停业 / 解约店铺',
        count: closedStores.length,
        description: `有 ${closedStores.length} 家店铺已停业或解约，请关注`,
        level: 'warning',
        filterParams: { status: 'closed' },
      });
    }

    const abcMap = computeAbcForStores(stores, settings.abcThreshold);
    const cStores = stores.filter((s) => abcMap.get(s.id) === 'C');
    if (settings.alerts.cLowProductEnabled && cStores.length > 0) {
      alerts.push({
        type: 'c_low_product',
        title: 'C类低产店铺',
        count: cStores.length,
        description: `有 ${cStores.length} 家店铺为C类低产，建议重点提升`,
        level: 'warning',
        filterParams: { abcCategory: 'C' },
      });
    }

    const latestPeriodSet = new Set(revenue.map((r) => r.month));
    const latestPeriods = Array.from(latestPeriodSet).sort();
    const noRevenueCount = stores.filter((s) => {
      const sr = revenue.filter(
        (r) => r.platformKey === s.platformKey && r.storeId === s.storeId,
      );
      if (sr.length === 0) return true;
      const lastPeriod = sr.map((r) => r.month).sort().pop();
      if (!lastPeriod) return true;
      const lastIdx = latestPeriods.indexOf(lastPeriod);
      const gap = latestPeriods.length - 1 - lastIdx;
      return gap >= settings.alerts.noRevenuePeriods;
    }).length;
    if (settings.alerts.noRevenueEnabled && noRevenueCount > 0) {
      alerts.push({
        type: 'no_revenue',
        title: '连续无收入店铺',
        count: noRevenueCount,
        description: `有 ${noRevenueCount} 家店铺连续 ${settings.alerts.noRevenuePeriods} 期无收入记录`,
        level: 'danger',
        filterParams: { abcCategory: 'none' },
      });
    }

    return {
      alerts,
      totalCount: alerts.reduce((sum, a) => sum + a.count, 0),
    };
  },
};

/* ---------------- excel import / export ---------------- */

export const dbExport = {
  storesCsv: (params: {
    platformKey?: string;
    search?: string;
    status?: string;
    abcCategory?: string;
  }): string => {
    const { items } = dbStores.list({
      platformKey: params.platformKey,
      status: params.status as StoreStatus | undefined,
      abcCategory: params.abcCategory as AbcCategory | undefined,
      search: params.search,
      page: 1,
      pageSize: 9999,
    });
    const headers = [
      '平台',
      '店铺ID',
      '店铺名称',
      '负责人',
      '手机号',
      '地址',
      '菜单类型',
      '状态',
      'ABC分类',
      '签约时间',
      '店铺备注',
    ];
    const rows = items.map((s) => [
      s.platformKey,
      s.storeId,
      s.storeName || '',
      s.owner || '',
      s.phone || '',
      s.address || '',
      s.menuType || '',
      s.status || '',
      s.abcCategory || 'none',
      s.signTime || '',
      s.shopNotes || '',
    ]);
    return [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
  },
  revenueCsv: (params: {
    platformKey?: string;
    periodType?: string;
    year?: number;
  }): string => {
    const list = dbRevenue.list({
      platformKey: params.platformKey,
      periodType: params.periodType as RevenuePeriodType | undefined,
      year: params.year,
    });
    const headers = ['平台', '店铺ID', '店铺名称', '月份', '收入(元)', '类型'];
    const rows = list.map((r) => [
      r.platformKey,
      r.storeId,
      r.storeName || '',
      r.month,
      String(r.revenue),
      r.periodType || 'month',
    ]);
    return [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
  },
  statsCsv: (params: { platformKey?: string; dimension?: string }): string => {
    const stats = dbStats.dashboard({
      platformKey: params.platformKey,
      dimension: params.dimension as 'month' | 'week',
    });
    const lines: string[] = [];
    lines.push('概览');
    lines.push(
      ['总店铺数', '总收入(元)', '负责人数', '平台数', 'A类', 'B类', 'C类', '未统计']
        .map(csvEscape)
        .join(','),
    );
    lines.push(
      [
        String(stats.overview.totalStores),
        String(stats.overview.totalRevenue),
        String(stats.overview.totalOwners),
        String(stats.overview.totalPlatforms),
        String(stats.overview.aCount),
        String(stats.overview.bCount),
        String(stats.overview.cCount),
        String(stats.overview.noneCount),
      ]
        .map(csvEscape)
        .join(','),
    );
    lines.push('');
    lines.push('平台统计');
    lines.push(
      ['平台Key', '平台名称', '店铺数', '收入(元)', 'A类', 'B类', 'C类']
        .map(csvEscape)
        .join(','),
    );
    for (const p of stats.platformStats) {
      lines.push(
        [
          p.platformKey,
          p.platformName,
          String(p.storeCount),
          String(p.revenue),
          String(p.aCount),
          String(p.bCount),
          String(p.cCount),
        ]
          .map(csvEscape)
          .join(','),
      );
    }
    lines.push('');
    lines.push('收入趋势');
    lines.push(['期间', '收入(元)'].map(csvEscape).join(','));
    for (const t of stats.revenueTrend) {
      lines.push([t.period, String(t.revenue)].map(csvEscape).join(','));
    }
    lines.push('');
    lines.push('负责人排行');
    lines.push(['负责人', '收入(元)', '店铺数'].map(csvEscape).join(','));
    for (const o of stats.ownerRevenue) {
      lines.push([o.owner, String(o.revenue), String(o.storeCount)].map(csvEscape).join(','));
    }
    return lines.join('\n');
  },
};

const csvEscape = (value: string): string => {
  if (value == null) return '';
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/* ---------------- excel import ---------------- */

import type { ExcelImportRow, ExcelImportResult } from '@shared/api.interface';

export const dbExcel = {
  importRevenue: (rows: ExcelImportRow[]): ExcelImportResult => {
    const stores = readArr<StoreInfo>(KEY_STORES);
    const successRows: ExcelImportRow[] = [];
    const failedRows: Array<{
      rowNumber: number;
      storeId: string;
      platformKey: string;
      reason: string;
    }> = [];
    const upsertItems: MonthlyRevenueInfo[] = [];
    for (const row of rows) {
      const store = stores.find(
        (s) => s.platformKey === row.platformKey && s.storeId === row.storeId,
      );
      if (!store) {
        failedRows.push({
          rowNumber: row.rowNumber ?? 0,
          storeId: row.storeId,
          platformKey: row.platformKey,
          reason: '店铺不存在于该平台',
        });
        continue;
      }
      const month = `${row.year}-${String(row.periodIndex).padStart(2, '0')}`;
      upsertItems.push({
        id: genId(),
        platformKey: row.platformKey,
        storeId: row.storeId,
        storeName: store.storeName,
        month,
        revenue: row.revenue,
        periodType: row.periodType,
        year: row.year,
        periodIndex: row.periodIndex,
      });
      successRows.push(row);
    }
    dbRevenue.batchUpsert(
      upsertItems.map((r) => ({
        platformKey: r.platformKey,
        storeId: r.storeId,
        month: r.month,
        revenue: r.revenue,
        periodType: r.periodType,
        year: r.year,
        periodIndex: r.periodIndex,
      })),
    );
    return {
      successCount: successRows.length,
      failCount: failedRows.length,
      totalCount: rows.length,
      failedRows,
      successRows,
    };
  },
};
