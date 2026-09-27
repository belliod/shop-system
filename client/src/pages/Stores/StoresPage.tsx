import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import dayjs from 'dayjs';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { storeApi, platformApi, settingsApi } from '@/api';
import { formatIncomeYuanToWan } from '@/utils/format-income';
import { useAuth } from '@/contexts/AuthContext';
import {
  STORE_STATUS_LABELS,
  ABC_LABELS,
} from '@shared/api.interface';
import type {
  StoreInfo,
  StoreListResponse,
  PlatformInfo,
  StoreStatus,
  AbcCategory,
  BatchUpdateOwnerResult,
} from '@shared/api.interface';

import StoreFilterBar from './StoreFilterBar';
import StoreDetailModal from './StoreDetailModal';
import StoreEditModal from './StoreEditModal';
import StoreCreateModal from './StoreCreateModal';
import StoreImportModal from './StoreImportModal';
import BatchOwnerModal from './BatchOwnerModal';

const PAGE_SIZE = 10;

const statusBadgeClass = (status?: StoreStatus): string => {
  switch (status) {
    case 'normal':
      return '!bg-green-100 !text-green-700 !border-transparent';
    case 'pending':
      return '!bg-blue-100 !text-blue-700 !border-transparent';
    case 'closed':
      return '!bg-orange-100 !text-orange-700 !border-transparent';
    case 'terminated':
      return '!bg-red-100 !text-red-700 !border-transparent';
    default:
      return '';
  }
};

const abcBadgeClass = (abc?: AbcCategory): string => {
  switch (abc) {
    case 'A':
      return '!bg-green-100 !text-green-700 !border-transparent';
    case 'B':
      return '!bg-blue-100 !text-blue-700 !border-transparent';
    case 'C':
      return '!bg-orange-100 !text-orange-700 !border-transparent';
    case 'none':
      return '!bg-gray-100 !text-gray-500 !border-transparent';
    default:
      return '';
  }
};



const StoresPage: React.FC = () => {
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [platformKey, setPlatformKey] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<StoreStatus | ''>('');
  const [abcCategory, setAbcCategory] = useState<AbcCategory | ''>('');
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [platformsLoading, setPlatformsLoading] = useState<boolean>(true);
  const [data, setData] = useState<StoreListResponse | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreInfo | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [importOpen, setImportOpen] = useState<boolean>(false);
  const [batchOwnerOpen, setBatchOwnerOpen] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string>('');
  const [deleting, setDeleting] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const canEdit = user && user.role !== 'viewer';

  const syncUrl = useCallback(
    (
      pk: string,
      s: string,
      st: StoreStatus | '',
      abc: AbcCategory | '',
    ) => {
      const params = new URLSearchParams();
      if (pk) params.set('platformKey', pk);
      if (s) params.set('search', s);
      if (st) params.set('status', st);
      if (abc) params.set('abcCategory', abc);
      const query = params.toString();
      const newUrl = query
        ? `${window.location.pathname}?${query}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    },
    [],
  );

  // load platforms + read initial URL params
  useEffect(() => {
    let mounted = true;
    setPlatformsLoading(true);
    platformApi
      .listPlatforms()
      .then((list: PlatformInfo[]) => {
        if (!mounted) return;
        setPlatforms(list);
        const params = new URLSearchParams(window.location.search);
        const urlPlatform = params.get('platformKey');
        const urlSearch = params.get('search');
        const urlStatus = params.get('status') as StoreStatus | null;
        const urlAbc = params.get('abcCategory') as AbcCategory | null;
        if (urlSearch) setSearch(urlSearch);
        if (urlStatus) setStatus(urlStatus);
        if (urlAbc) setAbcCategory(urlAbc);
        if (
          urlPlatform &&
          list.some((p: PlatformInfo) => p.platformKey === urlPlatform)
        ) {
          setPlatformKey(urlPlatform);
        } else if (list.length > 0) {
          setPlatformKey(list[0].platformKey);
        }
      })
      .catch((err: unknown) => {
        logger.error('load platforms failed', err);
      })
      .finally(() => {
        if (mounted) setPlatformsLoading(false);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load store list
  const fetchStores = useCallback(() => {
    if (!platformKey) return;
    let mounted = true;
    setLoading(true);
    storeApi
      .listStores({
        platformKey,
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
        abcCategory: abcCategory || undefined,
      })
      .then((res: StoreListResponse) => {
        if (!mounted) return;
        setData(res);
      })
      .catch((err: unknown) => {
        logger.error('load stores failed', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    syncUrl(platformKey, search, status, abcCategory);
    return () => {
      mounted = false;
    };
  }, [platformKey, page, search, status, abcCategory, syncUrl]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handlePlatformChange = (key: string) => {
    setPlatformKey(key);
    setPage(1);
  };

  const handleSearchSubmit = () => setPage(1);
  const handleStatusFilterChange = (val: StoreStatus | '') => {
    setStatus(val);
    setPage(1);
  };
  const handleAbcFilterChange = (val: AbcCategory | '') => {
    setAbcCategory(val);
    setPage(1);
  };

  const handleViewDetail = (store: StoreInfo) => {
    setSelectedStore(store);
    setDetailOpen(true);
  };

  const handleStatusChange = async (id: string, newStatus: StoreStatus) => {
    setUpdatingId(id);
    try {
      const updated: StoreInfo = await storeApi.updateStoreStatus(
        id,
        newStatus,
      );
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item: StoreInfo) =>
            item.id === id ? updated : item,
          ),
        };
      });
      if (selectedStore && selectedStore.id === id) {
        setSelectedStore(updated);
      }
    } catch (err: unknown) {
      logger.error('update store status failed', err);
    } finally {
      setUpdatingId('');
    }
  };

  const handleExport = async () => {
    if (!platformKey) return;
    setExportLoading(true);
    try {
      const csv: string = await settingsApi.exportStoresCsv({
        platformKey,
        search: search || undefined,
        status: status || undefined,
        abcCategory: abcCategory || undefined,
      });
      const blob = new Blob(['\uFEFF' + csv], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = dayjs().format('YYYYMMDD');
      a.download = `店铺列表_${platformKey}_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      logger.error('export stores csv failed', err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDetailStatusSaved = (updated: StoreInfo) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item: StoreInfo) =>
          item.id === updated.id ? updated : item,
        ),
      };
    });
    setSelectedStore(updated);
  };

  const handleEdit = (store: StoreInfo) => {
    setSelectedStore(store);
    setEditOpen(true);
  };

  const handleCreate = () => {
    setCreateOpen(true);
  };

  const handleCreated = (store: StoreInfo) => {
    setPage(1);
    fetchStores();
  };

  const handleEditSaved = (updated: StoreInfo) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item: StoreInfo) =>
          item.id === updated.id ? updated : item,
        ),
      };
    });
    setSelectedStore(updated);
    toast.success('店铺信息已更新');
  };

  const handleDeleteClick = (store: StoreInfo) => {
    setSelectedStore(store);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStore) return;
    setDeleting(true);
    try {
      await storeApi.deleteStore(selectedStore.id);
      setDeleteOpen(false);
      toast.success('店铺已删除');
      const currentPageHasOnlyOne =
        data && data.items.length === 1 && page > 1;
      if (currentPageHasOnlyOne) {
        setPage((p) => p - 1);
      } else {
        fetchStores();
      }
    } catch (err: unknown) {
      logger.error('delete store failed', err);
      toast.error('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const handleImported = () => {
    setPage(1);
    fetchStores();
  };

  // ---------- 多选相关 ----------
  const pageIds = useMemo(() => {
    if (!data) return [];
    return data.items.map((item: StoreInfo) => item.id);
  }, [data]);

  const allPageSelected = useMemo(() => {
    if (pageIds.length === 0) return false;
    return pageIds.every((id) => selectedIds.has(id));
  }, [pageIds, selectedIds]);

  const somePageSelected = useMemo(() => {
    if (pageIds.length === 0) return false;
    return pageIds.some((id) => selectedIds.has(id));
  }, [pageIds, selectedIds]);

  const handleToggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  };

  const handleToggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBatchOwnerSaved = (result: BatchUpdateOwnerResult) => {
    setSelectedIds(new Set());
    fetchStores();
  };

  // 切换平台/分页/筛选时清空选择，避免保留不可见行
  useEffect(() => {
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformKey, page, search, status, abcCategory]);

  const totalPages = useMemo(() => {
    if (!data) return 0;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const statusOptions = Object.entries(STORE_STATUS_LABELS) as [
    StoreStatus,
    string,
  ][];
  const abcOptions = Object.entries(ABC_LABELS) as [AbcCategory, string][];

  return (
    <div className="flex flex-col gap-6">
      {/* Platform tabs */}
      {platformsLoading ? (
        <Skeleton className="h-11 w-full rounded-lg" />
      ) : (
        <div className="flex items-center rounded-lg bg-muted p-1">
          {platforms.map((p: PlatformInfo) => (
            <button
              key={p.platformKey}
              onClick={() => handlePlatformChange(p.platformKey)}
              className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors ${
                platformKey === p.platformKey
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.platformName}
            </button>
          ))}
        </div>
      )}

      <StoreFilterBar
        search={search}
        status={status}
        abcCategory={abcCategory}
        onSearchChange={setSearch}
        onStatusChange={handleStatusFilterChange}
        onAbcChange={handleAbcFilterChange}
        onSearchSubmit={handleSearchSubmit}
        onExport={handleExport}
        onImport={() => setImportOpen(true)}
        onCreate={handleCreate}
        exportLoading={exportLoading}
        canEdit={canEdit}
      />

      <div className="rounded-xl border bg-card overflow-hidden">
        {canEdit && selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 border-b bg-primary/5 px-4 py-2.5">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="secondary" className="font-medium">
                已选 {selectedIds.size} 项
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5 mr-1" />
                清除选择
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => setBatchOwnerOpen(true)}
              >
                <Users className="size-4 mr-1.5" />
                批量指定负责人
              </Button>
            </div>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              {canEdit && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={handleToggleAll}
                    aria-label="全选当前页"
                    data-state={somePageSelected && !allPageSelected ? 'indeterminate' : undefined}
                  />
                </TableHead>
              )}
              <TableHead>店铺ID</TableHead>
              <TableHead>店铺名称</TableHead>
              <TableHead>负责人</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>ABC类别</TableHead>
              <TableHead>最新月收入</TableHead>
              <TableHead>地址</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <TableRow key={i}>
                  {canEdit && (
                    <TableCell>
                      <div className="size-4" />
                    </TableCell>
                  )}
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full max-w-[120px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 9 : 8}>
                  <Empty className="border-0">
                    <EmptyHeader>
                      <EmptyTitle>暂无店铺</EmptyTitle>
                      <EmptyDescription>
                        当前条件下没有找到店铺数据
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((store: StoreInfo) => (
                <TableRow key={store.id}>
                  {canEdit && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(store.id)}
                        onCheckedChange={() => handleToggleOne(store.id)}
                        aria-label={`选择店铺 ${store.storeId}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-xs">
                    {store.storeId}
                  </TableCell>
                  <TableCell className="font-medium">
                    {store.storeName || '-'}
                  </TableCell>
                  <TableCell>{store.owner || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusBadgeClass(store.status)}
                    >
                      {store.status
                        ? STORE_STATUS_LABELS[store.status]
                        : '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={abcBadgeClass(store.abcCategory)}
                    >
                      {store.abcCategory
                        ? ABC_LABELS[store.abcCategory]
                        : '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatIncomeYuanToWan(store.latestRevenue)}</TableCell>
                  <TableCell className="max-w-[240px] truncate">
                    {store.address || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(store)}
                      >
                        <Eye className="size-4 mr-1" />
                        查看
                      </Button>
                      {canEdit ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(store)}
                            className="text-primary"
                          >
                            <Pencil className="size-4 mr-1" />
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(store)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4 mr-1" />
                            删除
                          </Button>
                        </>
                      ) : (
                        <Select
                          value={store.status || ''}
                          disabled={updatingId === store.id}
                          onValueChange={(val: string) =>
                            handleStatusChange(store.id, val as StoreStatus)
                          }
                        >
                          <SelectTrigger size="sm" className="w-24">
                            <SelectValue placeholder="状态" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {data && data.total > 0 ? (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
            <span className="text-sm text-muted-foreground">
              共 {data.total} 条，第 {page} / {totalPages} 页
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <StoreDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        store={selectedStore}
        onStatusSaved={handleDetailStatusSaved}
      />

      <StoreEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        store={editOpen ? selectedStore : null}
        onSaved={handleEditSaved}
      />

      <StoreCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        platformKey={platformKey}
        platformName={platforms.find((p) => p.platformKey === platformKey)?.platformName}
        onCreated={handleCreated}
      />

      <Dialog open={deleteOpen} onOpenChange={(v) => !v && setDeleteOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除店铺</DialogTitle>
            <DialogDescription>
              您确定要删除店铺
              {selectedStore?.storeName
                ? `「${selectedStore.storeName}」`
                : ''}
              吗？删除后该店铺的数据将从本地存储中移除，且无法恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StoreImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        defaultPlatformKey={platformKey}
        onImported={handleImported}
      />

      <BatchOwnerModal
        open={batchOwnerOpen}
        onClose={() => setBatchOwnerOpen(false)}
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        platformKey={platformKey}
        onSaved={handleBatchOwnerSaved}
      />
    </div>
  );
};

export default StoresPage;
