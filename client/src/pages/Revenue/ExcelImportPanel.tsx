import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import { Button } from '@client/src/components/ui/button';
import { Label } from '@client/src/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { settingsApi } from '@client/src/api';
import type {
  ExcelImportRow,
  ExcelImportResult,
  RevenuePeriodType,
} from '@shared/api.interface';

/* 字段映射：中英文列名（不区分大小写）→ 目标字段 */
const COLUMN_ALIASES: Record<string, keyof ExcelImportRow> = {
  '平台编码': 'platformKey',
  platformkey: 'platformKey',
  platform_key: 'platformKey',
  '店铺id': 'storeId',
  '店铺编号': 'storeId',
  storeid: 'storeId',
  store_id: 'storeId',
  '周期类型': 'periodType',
  periodtype: 'periodType',
  period_type: 'periodType',
  年份: 'year',
  year: 'year',
  '周期序号': 'periodIndex',
  月份: 'periodIndex',
  '周序号': 'periodIndex',
  periodindex: 'periodIndex',
  period_index: 'periodIndex',
  '收入金额': 'revenue',
  金额: 'revenue',
  revenue: 'revenue',
};

const SHEETJS_CDN =
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

declare global {
  interface Window {
    XLSX?: {
      read: (
        data: ArrayBuffer | string,
        opts?: { type: string },
      ) => {
        SheetNames: string[];
        Sheets: Record<string, unknown>;
      };
      utils: {
        sheet_to_json: (sheet: unknown) => Record<string, unknown>[];
      };
    };
  }
}

const ExcelImportPanel: React.FC = () => {
  const [xlsxReady, setXlsxReady] = useState<boolean>(false);
  const [xlsxLoading, setXlsxLoading] = useState<boolean>(true);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ExcelImportRow[]>([]);
  const [unrecognizedColumns, setUnrecognizedColumns] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] =
    useState<ExcelImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* 动态加载 SheetJS */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.XLSX) {
      setXlsxReady(true);
      setXlsxLoading(false);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-xlsx="1"]',
    );
    if (existing) {
      existing.addEventListener('load', () => {
        setXlsxReady(!!window.XLSX);
        setXlsxLoading(false);
      });
      return;
    }
    const script: HTMLScriptElement = document.createElement('script');
    script.src = SHEETJS_CDN;
    script.async = true;
    script.dataset.xlsx = '1';
    script.onload = () => {
      setXlsxReady(!!window.XLSX);
      setXlsxLoading(false);
      if (!window.XLSX) {
        logger.warn('SheetJS loaded but XLSX global not found');
      }
    };
    script.onerror = () => {
      logger.error('SheetJS failed to load');
      setXlsxLoading(false);
      setParseError('Excel 解析库加载失败，请刷新页面重试');
    };
    document.head.appendChild(script);
  }, []);

  const normalizeKey = (key: string): keyof ExcelImportRow | null => {
    const trimmed: string = key.trim().toLowerCase().replace(/\s+/g, '');
    return COLUMN_ALIASES[trimmed] ?? null;
  };

  const parseWorkbook = useCallback(
    (file: File): Promise<void> => {
      return new Promise((resolve, reject) => {
        const reader: FileReader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          try {
            const data: ArrayBuffer | string | null = e.target?.result ?? null;
            if (!data || !window.XLSX) {
              reject(new Error('解析库未就绪'));
              return;
            }
            const workbook = window.XLSX.read(data as ArrayBuffer, {
              type: 'array',
            });
            const firstSheet: string = workbook.SheetNames[0];
            if (!firstSheet) {
              reject(new Error('文件中没有工作表'));
              return;
            }
            const rawRows: Record<string, unknown>[] =
              window.XLSX!.utils.sheet_to_json(
                workbook.Sheets[firstSheet],
              );

            if (rawRows.length === 0) {
              reject(new Error('文件内容为空'));
              return;
            }

            /* 识别列头 */
            const allKeys: string[] = Object.keys(rawRows[0]);
            const keyMap: Map<string, keyof ExcelImportRow> = new Map();
            const unrecognized: string[] = [];
            for (const k of allKeys) {
              const target = normalizeKey(k);
              if (target) {
                keyMap.set(k, target);
              } else {
                unrecognized.push(k);
              }
            }

            const required: (keyof ExcelImportRow)[] = [
              'platformKey',
              'storeId',
              'revenue',
            ];
            const missing = required.filter(
              (f) => ![...keyMap.values()].includes(f),
            );
            if (missing.length > 0) {
              reject(
                new Error(
                  `缺少必要列：${missing.join('、')}。请确认 Excel 包含平台编码、店铺ID、收入金额等列`,
                ),
              );
              return;
            }

            /* 映射成 ExcelImportRow */
            const mapped: ExcelImportRow[] = rawRows.map(
              (row: Record<string, unknown>, idx: number) => {
                const result: Partial<ExcelImportRow> = {
                  periodType: 'month',
                  rowNumber: idx + 2, // 行号从第 2 行开始（第 1 行是表头）
                };
                for (const [colKey, field] of keyMap) {
                  const rawVal = row[colKey];
                  if (rawVal === undefined || rawVal === null) continue;
                  switch (field) {
                    case 'platformKey':
                    case 'storeId':
                      result[field] = String(rawVal).trim();
                      break;
                    case 'periodType': {
                      const v: string = String(rawVal)
                        .trim()
                        .toLowerCase();
                      result.periodType = (v === 'week'
                        ? 'week'
                        : 'month') as RevenuePeriodType;
                      break;
                    }
                    case 'year':
                      result.year = Math.floor(Number(rawVal));
                      break;
                    case 'periodIndex':
                      result.periodIndex = Math.floor(Number(rawVal));
                      break;
                    case 'revenue':
                      result.revenue = Number(rawVal);
                      break;
                  }
                }
                return result as ExcelImportRow;
              },
            );

            setParsedRows(mapped);
            setUnrecognizedColumns(unrecognized);
            setImportResult(null);
            setParseError('');
            resolve();
          } catch (err: unknown) {
            logger.error('parse excel error', err);
            reject(err instanceof Error ? err : new Error('解析失败'));
          }
        };
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsArrayBuffer(file);
      });
    },
    [],
  );

  const handleFileSelected: (file: File) => Promise<void> = async (
    file: File,
  ) => {
    setParseError('');
    setFileName(file.name);
    try {
      await parseWorkbook(file);
    } catch (err: unknown) {
      const msg: string =
        err instanceof Error ? err.message : '文件解析失败';
      setParseError(msg);
      setParsedRows([]);
      setUnrecognizedColumns([]);
      toast.error(msg);
    }
  };

  const handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file: File | undefined = e.target.files?.[0];
    if (file) void handleFileSelected(file);
  };

  const handleDrop: (e: React.DragEvent<HTMLDivElement>) => void = (
    e: React.DragEvent<HTMLDivElement>,
  ) => {
    e.preventDefault();
    setDragOver(false);
    if (!xlsxReady) return;
    const file: File | undefined = e.dataTransfer.files?.[0];
    if (file) void handleFileSelected(file);
  };

  const handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void = (
    e: React.DragEvent<HTMLDivElement>,
  ) => {
    e.preventDefault();
    if (xlsxReady) setDragOver(true);
  };

  const handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void = () => {
    setDragOver(false);
  };

  const handleImport: () => Promise<void> = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    try {
      const res: ExcelImportResult =
        await settingsApi.importExcelRevenue(parsedRows);
      setImportResult(res);
      toast.success(
        `导入完成：成功 ${res.successCount} 条，失败 ${res.failCount} 条`,
      );
    } catch (err: unknown) {
      logger.error('import excel revenue failed', err);
      toast.error('导入失败，请重试');
    } finally {
      setImporting(false);
    }
  };

  const handleReset: () => void = () => {
    setFileName('');
    setParsedRows([]);
    setUnrecognizedColumns([]);
    setParseError('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const previewRows: ExcelImportRow[] = parsedRows.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* 上传区域 */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">上传 Excel 文件</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={
              'border-2 border-dashed rounded-xl p-8 text-center transition-colors ' +
              (dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50') +
              (!xlsxReady ? ' opacity-60 cursor-not-allowed' : ' cursor-pointer')
            }
            onClick={() => {
              if (xlsxReady) fileInputRef.current?.click();
            }}
          >
            <Upload className="size-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground mb-1">
              {xlsxLoading
                ? '正在加载 Excel 解析库...'
                : xlsxReady
                  ? '拖拽文件到此处，或点击选择文件'
                  : 'Excel 解析库加载失败'}
            </p>
            <p className="text-xs text-muted-foreground">
              支持 .xlsx / .xls / .csv 格式
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleInputChange}
              disabled={!xlsxReady}
            />
          </div>
          {fileName && (
            <div className="mt-3 text-sm text-muted-foreground">
              已选择文件：<span className="font-medium text-foreground">{fileName}</span>
            </div>
          )}
          {unrecognizedColumns.length > 0 && (
            <div className="mt-3 text-sm text-amber-600 flex items-start gap-2">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <span>
                未识别的列（已忽略）：{unrecognizedColumns.join('、')}
              </span>
            </div>
          )}
          {parseError && (
            <div className="mt-3 text-sm text-destructive">{parseError}</div>
          )}
        </CardContent>
      </Card>

      {/* 预览 & 导入 */}
      {parsedRows.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">
              数据预览
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                共 {parsedRows.length} 行
              </span>
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} disabled={importing}>
                重新选择
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? '导入中...' : '开始导入'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>行号</TableHead>
                  <TableHead>平台编码</TableHead>
                  <TableHead>店铺ID</TableHead>
                  <TableHead>周期类型</TableHead>
                  <TableHead>年份</TableHead>
                  <TableHead>周期序号</TableHead>
                  <TableHead className="text-right">收入金额</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row: ExcelImportRow, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>{row.platformKey}</TableCell>
                    <TableCell>{row.storeId}</TableCell>
                    <TableCell>
                      {row.periodType === 'week' ? '周' : '月'}
                    </TableCell>
                    <TableCell>{row.year || '-'}</TableCell>
                    <TableCell>{row.periodIndex || '-'}</TableCell>
                    <TableCell className="text-right">
                      ¥{Number(row.revenue).toLocaleString('zh-CN')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {parsedRows.length > 10 && (
              <p className="text-xs text-muted-foreground mt-2">
                仅展示前 10 行预览
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 导入结果 */}
      {importResult && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {importResult.failCount === 0 ? (
                <CheckCircle2 className="size-5 text-green-600" />
              ) : (
                <XCircle className="size-5 text-amber-600" />
              )}
              导入结果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">总计：</span>
                <span className="font-medium">{importResult.totalCount} 条</span>
              </div>
              <div>
                <span className="text-muted-foreground">成功：</span>
                <span className="font-medium text-green-600">
                  {importResult.successCount} 条
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">失败：</span>
                <span className="font-medium text-destructive">
                  {importResult.failCount} 条
                </span>
              </div>
            </div>

            {importResult.failedRows.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  失败行列表
                </Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>行号</TableHead>
                      <TableHead>平台编码</TableHead>
                      <TableHead>店铺ID</TableHead>
                      <TableHead>失败原因</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.failedRows.slice(0, 20).map(
                      (
                        row: {
                          rowNumber: number;
                          storeId: string;
                          platformKey: string;
                          reason: string;
                        },
                        i: number,
                      ) => (
                        <TableRow key={i}>
                          <TableCell>{row.rowNumber}</TableCell>
                          <TableCell>{row.platformKey}</TableCell>
                          <TableCell>{row.storeId}</TableCell>
                          <TableCell className="text-destructive">
                            {row.reason}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
                {importResult.failedRows.length > 20 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    仅展示前 20 条失败记录
                  </p>
                )}
              </div>
            )}

            {importResult.successRows.length > 0 &&
              importResult.failCount > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    成功行（部分示例）
                  </Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>店铺ID</TableHead>
                        <TableHead>平台</TableHead>
                        <TableHead className="text-right">金额</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.successRows.slice(0, 5).map(
                        (row: ExcelImportRow, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{row.storeId}</TableCell>
                            <TableCell>{row.platformKey}</TableCell>
                            <TableCell className="text-right">
                              ¥{Number(row.revenue).toLocaleString('zh-CN')}
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExcelImportPanel;
