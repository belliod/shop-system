import { useEffect, useState } from 'react';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Switch } from '@client/src/components/ui/switch';
import { settingsApi } from '@client/src/api';
import PlatformManagement from './PlatformManagement';
import type {
  AppSettings,
  AbcThresholdConfig,
  AlertSettings,
} from '@shared/api.interface';
import {
  DEFAULT_ABC_THRESHOLD,
  DEFAULT_ALERT_SETTINGS,
} from '@shared/api.interface';

/* ---------- ABC 阈值 ---------- */

const AbcThresholdPanel: React.FC = () => {
  const [config, setConfig] = useState<AbcThresholdConfig>(
    DEFAULT_ABC_THRESHOLD,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let cancelled: boolean = false;
    const load: () => Promise<void> = async () => {
      setLoading(true);
      try {
        const data: AppSettings = await settingsApi.getSettings();
        if (!cancelled) setConfig(data.abcThreshold);
      } catch (err: unknown) {
        logger.error('load abc threshold failed', err);
        toast.error('加载设置失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave: () => Promise<void> = async () => {
    const aMin: number = Number(config.aMin);
    const bMin: number = Number(config.bMin);
    const bMax: number = Number(config.bMax);
    if (
      Number.isNaN(aMin) ||
      Number.isNaN(bMin) ||
      Number.isNaN(bMax) ||
      aMin <= 0 ||
      bMin <= 0 ||
      bMax <= 0
    ) {
      toast.error('请输入有效的正数阈值');
      return;
    }
    if (bMin >= bMax) {
      toast.error('B类下限必须小于 B类上限');
      return;
    }
    if (aMin <= bMax) {
      toast.error('A类下限必须大于 B类上限');
      return;
    }
    setSaving(true);
    try {
      await settingsApi.updateAbcThreshold({ aMin, bMin, bMax });
      toast.success('阈值已更新，所有店铺标签将实时重新计算');
    } catch (err: unknown) {
      logger.error('update abc threshold failed', err);
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg">ABC 分类阈值</CardTitle>
        <CardDescription className="text-sm">
          根据月收入自动为店铺划分 A/B/C 三类
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="text-center py-6 text-muted-foreground">
            加载中...
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Label className="w-28 text-right shrink-0">A类下限</Label>
              <div className="flex-1 max-w-xs">
                <Input
                  type="number"
                  min="0"
                  value={config.aMin}
                  onChange={(e) =>
                    setConfig({ ...config, aMin: Number(e.target.value) })
                  }
                />
              </div>
              <span className="text-sm text-muted-foreground">元</span>
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-28 text-right shrink-0">B类下限</Label>
              <div className="flex-1 max-w-xs">
                <Input
                  type="number"
                  min="0"
                  value={config.bMin}
                  onChange={(e) =>
                    setConfig({ ...config, bMin: Number(e.target.value) })
                  }
                />
              </div>
              <span className="text-sm text-muted-foreground">元</span>
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-28 text-right shrink-0">B类上限</Label>
              <div className="flex-1 max-w-xs">
                <Input
                  type="number"
                  min="0"
                  value={config.bMax}
                  onChange={(e) =>
                    setConfig({ ...config, bMax: Number(e.target.value) })
                  }
                />
              </div>
              <span className="text-sm text-muted-foreground">元</span>
            </div>

            <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-1">
              <p>
                <span className="font-semibold">A类高产：</span>
                月收入 ≥ A类下限
              </p>
              <p>
                <span className="font-semibold">B类中产：</span>
                B类下限 ≤ 月收入 {'<'} B类上限
              </p>
              <p>
                <span className="font-semibold">C类低产：</span>
                月收入 {'<'} B类下限（且有收入数据）
              </p>
              <p>
                <span className="font-semibold">未统计：</span>
                无收入数据
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="size-4" />
                {saving ? '保存中...' : '保存阈值'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

/* ---------- 告警设置 ---------- */

const AlertSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<AlertSettings>(
    DEFAULT_ALERT_SETTINGS,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let cancelled: boolean = false;
    const load: () => Promise<void> = async () => {
      setLoading(true);
      try {
        const data: AppSettings = await settingsApi.getSettings();
        if (!cancelled) setSettings(data.alerts);
      } catch (err: unknown) {
        logger.error('load alert settings failed', err);
        toast.error('加载设置失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave: () => Promise<void> = async () => {
    const noRevenuePeriods: number = Math.max(
      1,
      Math.floor(Number(settings.noRevenuePeriods) || 1),
    );
    setSaving(true);
    try {
      await settingsApi.updateAlertSettings({
        ...settings,
        noRevenuePeriods,
      });
      toast.success('告警设置已更新');
    } catch (err: unknown) {
      logger.error('update alert settings failed', err);
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg">告警设置</CardTitle>
        <CardDescription className="text-sm">
          配置需要关注的告警类型，及时发现异常店铺
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="text-center py-6 text-muted-foreground">
            加载中...
          </div>
        ) : (
          <>
            {/* C类低产 */}
            <div className="flex items-start justify-between gap-4 py-2 border-b border-border">
              <div className="flex-1">
                <Label className="text-base font-medium">
                  C类低产店铺告警
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  月收入低于 B类下限的店铺将标记为 C 类低产并产生告警
                </p>
              </div>
              <Switch
                checked={settings.cLowProductEnabled}
                onCheckedChange={(v: boolean) =>
                  setSettings({ ...settings, cLowProductEnabled: v })
                }
              />
            </div>

            {/* 连续无收入 */}
            <div className="flex items-start justify-between gap-4 py-2 border-b border-border">
              <div className="flex-1">
                <Label className="text-base font-medium">
                  连续无收入店铺告警
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  连续多个周期无收入数据的店铺将产生告警
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-sm">连续</span>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    className="w-20"
                    value={settings.noRevenuePeriods}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        noRevenuePeriods: Number(e.target.value),
                      })
                    }
                    disabled={!settings.noRevenueEnabled}
                  />
                  <span className="text-sm">个周期</span>
                </div>
              </div>
              <Switch
                checked={settings.noRevenueEnabled}
                onCheckedChange={(v: boolean) =>
                  setSettings({ ...settings, noRevenueEnabled: v })
                }
              />
            </div>

            {/* 待搭建 + 停业 */}
            <div className="flex items-start justify-between gap-4 py-2">
              <div className="flex-1">
                <Label className="text-base font-medium">
                  待搭建 / 停业店铺提醒
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  状态为「待搭建」或「停业」的店铺将在看板中展示提醒
                </p>
              </div>
              <Switch
                checked={settings.pendingClosedEnabled}
                onCheckedChange={(v: boolean) =>
                  setSettings({ ...settings, pendingClosedEnabled: v })
                }
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="size-4" />
                {saving ? '保存中...' : '保存设置'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

/* ---------- 设置页主组件 ---------- */

const SettingsPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">系统设置</h1>
          <p className="text-sm text-muted-foreground">
            管理平台、ABC 分类阈值和告警规则
          </p>
        </div>
      </div>

      <Tabs defaultValue="platforms" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="platforms">平台管理</TabsTrigger>
          <TabsTrigger value="abc">ABC 分类阈值</TabsTrigger>
          <TabsTrigger value="alerts">告警设置</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms">
          <PlatformManagement />
        </TabsContent>

        <TabsContent value="abc">
          <AbcThresholdPanel />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
