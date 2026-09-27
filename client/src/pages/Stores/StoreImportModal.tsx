import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { storeApi } from '@/api';
import { STORE_STATUS_LABELS } from '@shared/api.interface';
import type {
  StoreImportRow,
  StoreImportResult,
  StoreStatus,
} from '@shared/api.interface';

interface StoreImportModalProps {
  open: boolean;
  onClose: () => void;
  defaultPlatformKey?: string;
  onImported?: (result: StoreImportResult) => void;
}

const TEMPLATE_HEADERS = [
  '平台编码',
  '店铺ID',
  '店铺名称',
  '负责人',
  '店铺地址',
  '店家手机号',
  '签约时间',
  '店铺备注',
  '店铺状态',
];

const HEADER_MAP: Record<string, keyof StoreImportRow | 'status'> = {
  平台编码: 'platformKey',
  店铺ID: 'storeId',
  店铺名称: 'storeName',
  负责人: 'owner',
  店铺地址: 'address',
  店家手机号: 'phone',
  联系电话: 'phone',
  手机号: 'phone',
  签约时间: 'signTime',
  店铺备注: 'shopNotes',
  备注: 'shopNotes',
  店铺状态: 'status',
  状态: 'status',
};

const normalizeHeader = (raw: string): string => {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, '')
    .trim();
};

const buildHeaderMap = (headers: string[]): Map<number, string> => {
  const result = new Map<number, string>();
  headers.forEach((h, idx) => {
    const key = normalizeHeader(h);
    if (!key) return;
    const field = HEADER_MAP[key];
    if (field) {
      result.set(idx, field);
    }
  });
  return result;
};

const isEmptyRow = (row: unknown[]): boolean => {
  return row.every((cell) => {
    if (cell === null || cell === undefined) return true;
    if (typeof cell === 'string') return cell.trim() === '';
    if (typeof cell === 'number') return false;
    return String(cell).trim() === '';
  });
};

const readCellAsString = (cell: unknown): string => {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'number') return String(cell);
  return String(cell).trim();
};

const STATUS_MAP: Record<string, StoreStatus> = {
  正常: 'normal',
  营业: 'normal',
  正常营业: 'normal',
  停业: 'closed',
  关闭: 'closed',
  待搭建: 'pending',
  待营业: 'pending',
  已解约: 'terminated',
  解约: 'terminated',
};

const parseStatus = (raw: string | number | undefined): StoreStatus | undefined => {
  if (!raw) return undefined;
  const str = String(raw).trim();
  if (!str) return undefined;
  if (STATUS_MAP[str]) return STATUS_MAP[str];
  if (Object.values(STORE_STATUS_LABELS).includes(str as StoreStatus)) {
    return str as StoreStatus;
  }
  const lower = str.toLowerCase();
  if (lower === 'normal' || lower === 'closed' || lower === 'pending' || lower === 'terminated') {
    return lower as StoreStatus;
  }
  return undefined;
};

const StoreImportModal: React.FC<StoreImportModalProps> = ({
  open,
  onClose,
  defaultPlatformKey,
  onImported,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsing, setParsing] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<StoreImportRow[]>([]);
  const [result, setResult] = useState<StoreImportResult | null>(null);
  const [importing, setImporting] = useState<boolean>(false);

  const handleReset = () => {
    setFileName('');
    setPreviewRows([]);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (importing) return;
    handleReset();
    onClose();
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      [
        defaultPlatformKey || 'meituan',
        '10001',
        '示例店',
        '张三',
        '北京市朝阳区xx路',
        '13800000000',
        '2025-01-01',
        '示例备注',
        '正常',
      ],
    ]);
    ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '店铺导入模板');
    XLSX.writeFile(wb, '店铺批量导入模板.csv');
  };

  const parseFile = (file: File) => {
    setParsing(true);
    setFileName(file.name);
    const name = file.name.toLowerCase();
    const isCsv = name.endsWith('.csv');
    const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls');

    if (!isCsv && !isXlsx) {
      toast.error('不支持的文件格式，请上传 .xlsx、.xls 或 .csv 文件');
      setFileName('');
      setParsing(false);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const fileData = e.target?.result;
        if (fileData == null) {
          throw new Error('文件内容为空');
        }

        let workbook: XLSX.WorkBook;
        if (isCsv) {
          let text = fileData as string;
          if (text.charCodeAt(0) === 0xfeff) {
            text = text.slice(1);
          }
          workbook = XLSX.read(text, { type: 'string' });
        } else {
          workbook = XLSX.read(fileData, { type: 'array' });
        }

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('文件中没有找到工作表');
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new Error('工作表为空');
        }

        const aoa: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: true,
          blankrows: false,
        }) as unknown[][];

        if (aoa.length < 2) {
          throw new Error('文件内容不足，至少需要表头行和一条数据行');
        }

        const headerRow = aoa[0] as string[];
        const headerMap = buildHeaderMap(headerRow);

        if (!headerMap.has('storeId' as unknown as number)) {
          const hasStoreIdField =
            headerRow.some((h) => normalizeHeader(String(h)) === '店铺ID');
          if (!hasStoreIdField) {
            throw new Error(
              '未找到「店铺ID」列，请检查表头是否与模板一致',
            );
          }
        }

        const rows: StoreImportRow[] = [];
        for (let i = 1; i < aoa.length; i++) {
          const row = aoa[i];
          if (!row || isEmptyRow(row)) continue;

          const rowNumber = i + 1;
          const record: Record<string, string> = {};
          headerMap.forEach((field, colIdx) => {
            const val = readCellAsString(row[colIdx]);
            record[field] = val;
          });

          const platformKey = record.platformKey || '';
          rows.push({
            platformKey: platformKey || defaultPlatformKey || '',
            storeId: record.storeId || '',
            storeName: record.storeName || undefined,
            owner: record.owner || undefined,
            address: record.address || undefined,
            phone: record.phone || undefined,
            signTime: record.signTime || undefined,
            shopNotes: record.shopNotes || undefined,
            status: parseStatus(record.status),
            rowNumber,
          });
        }

        if (rows.length === 0) {
          toast.warning('未解析到有效数据行，请检查文件内容');
          setFileName('');
          setPreviewRows([]);
        } else {
          setPreviewRows(rows);
          setResult(null);
        }
      } catch (err: unknown) {
        logger.error('parse excel failed', err);
        const msg = err instanceof Error ? err.message : '未知解析错误';
        toast.error(`文件解析失败：${msg}`);
        setFileName('');
        setPreviewRows([]);
        setResult(null);
      } finally {
        setParsing(false);
      }
    };

    reader.onerror = () => {
      toast.error('文件读取失败，请重新选择文件');
      setParsing(false);
      setFileName('');
    };

    if (isCsv) {
      reader.readAsText(file, 'utf-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    parseFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setResult(null);
    parseFile(file);
  };

  const handleImport = async () => {
    if (!previewRows.length) return;
    setImporting(true);
    try {
      const res: StoreImportResult = await storeApi.bulkImportStores(
        previewRows,
      );
      setResult(res);
      onImported?.(res);
      if (res.successCount > 0) {
        toast.success(`成功导入 ${res.successCount} 条店铺`);
      }
    } catch (err: unknown) {
      logger.error('bulk import stores failed', err);
      toast.error('导入失败，请重试');
    } finally {
      setImporting(false);
    }
  };

  const hasErrors = result && result.failedRows.length > 0;
  const hasSkipped = result && result.skippedRows.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量导入店铺</DialogTitle>
          <DialogDescription>
            上传 Excel 或 CSV 文件，按模板格式批量导入店铺数据
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                请先下载模板，按格式填写后再上传
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <Download className="size-4 mr-1" />
                下载模板
              </Button>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="size-10 text-muted-foreground" />
              {fileName ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="font-medium">{fileName}</span>
                  <span className="text-sm text-muted-foreground">
                    已解析 {previewRows.length} 条数据，点击重新选择
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="font-medium">
                    点击选择文件 或 拖拽到此处
                  </span>
                  <span className="text-sm text-muted-foreground">
                    支持 .xlsx、.xls、.csv 格式，最多 1000 条
                  </span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {previewRows.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    数据预览（{previewRows.length} 条）
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs"
                  >
                    <X className="size-3 mr-1" />
                    清空
                  </Button>
                </div>
                <div className="max-h-60 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">行</TableHead>
                        <TableHead>平台编码</TableHead>
                        <TableHead>店铺ID</TableHead>
                        <TableHead>店铺名称</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.slice(0, 20).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.rowNumber}
                          </TableCell>
                          <TableCell>{row.platformKey || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.storeId}
                          </TableCell>
                          <TableCell>{row.storeName || '-'}</TableCell>
                          <TableCell>
                            {row.status
                              ? STORE_STATUS_LABELS[row.status]
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {previewRows.length > 20 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t">
                      仅展示前 20 行，共 {previewRows.length} 条
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={parsing || importing}
              >
                取消
              </Button>
              <Button
                onClick={handleImport}
                disabled={!previewRows.length || parsing || importing}
                className="gap-1"
              >
                <Upload className="size-4" />
                {importing ? '导入中...' : `开始导入 (${previewRows.length})`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    成功新增
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-green-500" />
                  <span className="text-2xl font-bold text-green-600">
                    {result.successCount}
                  </span>
                  <span className="text-sm text-muted-foreground">条</span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    重复跳过
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <AlertTriangle className="size-5 text-yellow-500" />
                  <span className="text-2xl font-bold text-yellow-600">
                    {result.skipCount}
                  </span>
                  <span className="text-sm text-muted-foreground">条</span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    失败
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <XCircle className="size-5 text-red-500" />
                  <span className="text-2xl font-bold text-red-600">
                    {result.failCount}
                  </span>
                  <span className="text-sm text-muted-foreground">条</span>
                </CardContent>
              </Card>
            </div>

            {hasErrors ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">
                    失败明细
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    共 {result.failedRows.length} 条失败
                  </span>
                </div>
                <div className="max-h-48 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">行号</TableHead>
                        <TableHead>平台编码</TableHead>
                        <TableHead>店铺ID</TableHead>
                        <TableHead>失败原因</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.failedRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">
                            {row.rowNumber}
                          </TableCell>
                          <TableCell>{row.platformKey || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.storeId || '-'}
                          </TableCell>
                          <TableCell className="text-red-500">
                            {row.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}

            {hasSkipped ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs !bg-yellow-50 !text-yellow-700 !border-yellow-200">
                    跳过明细
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    共 {result.skippedRows.length} 条重复跳过
                  </span>
                </div>
                <div className="max-h-40 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">行号</TableHead>
                        <TableHead>平台编码</TableHead>
                        <TableHead>店铺ID</TableHead>
                        <TableHead>说明</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.skippedRows.slice(0, 20).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">
                            {row.rowNumber}
                          </TableCell>
                          <TableCell>{row.platformKey || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.storeId || '-'}
                          </TableCell>
                          <TableCell className="text-yellow-600">
                            {row.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {result.skippedRows.length > 20 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t">
                      仅展示前 20 条
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={handleReset}>
                继续导入
              </Button>
              <Button onClick={handleClose}>完成</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StoreImportModal;
