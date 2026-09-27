import React from 'react';
import { Search, Download, Upload, Plus } from 'lucide-react';
import {
  STORE_STATUS_LABELS,
  ABC_LABELS,
} from '@shared/api.interface';
import type { StoreStatus, AbcCategory } from '@shared/api.interface';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StoreFilterBarProps {
  search: string;
  status: StoreStatus | '';
  abcCategory: AbcCategory | '';
  onSearchChange: (val: string) => void;
  onStatusChange: (val: StoreStatus | '') => void;
  onAbcChange: (val: AbcCategory | '') => void;
  onSearchSubmit: () => void;
  onExport: () => void;
  onImport?: () => void;
  onCreate?: () => void;
  exportLoading?: boolean;
  canEdit?: boolean;
}

const StoreFilterBar: React.FC<StoreFilterBarProps> = ({
  search,
  status,
  abcCategory,
  onSearchChange,
  onStatusChange,
  onAbcChange,
  onSearchSubmit,
  onExport,
  onImport,
  onCreate,
  exportLoading,
  canEdit = true,
}) => {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={handleFormSubmit}
          className="flex items-center gap-2 min-w-[240px] max-w-md"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索店铺ID/名称/负责人"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onSearchChange(e.target.value)
              }
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="default" size="sm">
            搜索
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">状态：</span>
          <Select
            value={status}
            onValueChange={(val: string) =>
              onStatusChange(val as StoreStatus | '')
            }
          >
            <SelectTrigger className="w-32" size="sm">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部状态</SelectItem>
              {(
                Object.entries(STORE_STATUS_LABELS) as [
                  StoreStatus,
                  string,
                ][]
              ).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">ABC类别：</span>
          <Select
            value={abcCategory}
            onValueChange={(val: string) =>
              onAbcChange(val as AbcCategory | '')
            }
          >
            <SelectTrigger className="w-32" size="sm">
              <SelectValue placeholder="全部类别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部类别</SelectItem>
              {(
                Object.entries(ABC_LABELS) as [AbcCategory, string][]
              ).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={exportLoading}
        >
          <Download className="size-4 mr-1" />
          导出
        </Button>
        {canEdit && onCreate ? (
          <Button size="sm" onClick={onCreate}>
            <Plus className="size-4 mr-1" />
            新增店铺
          </Button>
        ) : null}
      </div>

      {canEdit && onImport ? (
        <div className="flex justify-start">
          <Button size="sm" onClick={onImport}>
            <Upload className="size-4 mr-1" />
            批量导入
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default StoreFilterBar;
