import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, LogIn, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'login' | 'register';

interface FormErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
  displayName?: string;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, register, isLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!username.trim()) {
      newErrors.username = '请输入用户名';
    } else if (username.length < 3) {
      newErrors.username = '用户名至少 3 个字符';
    }

    if (!password) {
      newErrors.password = '请输入密码';
    } else if (password.length < 6) {
      newErrors.password = '密码长度至少 6 位';
    }

    if (mode === 'register') {
      if (!confirmPassword) {
        newErrors.confirmPassword = '请确认密码';
      } else if (confirmPassword !== password) {
        newErrors.confirmPassword = '两次输入的密码不一致';
      }

      if (!displayName.trim()) {
        newErrors.displayName = '请输入显示名称';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (mode === 'login') {
        await login(username, password);
        toast.success('登录成功');
      } else {
        await register(username, password, displayName);
        toast.success('注册成功，已自动登录');
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '操作失败，请稍后重试';
      toast.error(message);
    }
  };

  const switchMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setErrors({});
    setConfirmPassword('');
    setDisplayName('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 via-primary/5 to-blue-100">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-lg border-primary/10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </CardTitle>
          <CardDescription>
            {mode === 'login'
              ? '登录您的账号以继续使用'
              : '填写信息完成注册'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                aria-invalid={!!errors.username}
              />
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username}</p>
              )}
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="displayName">显示名称</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="请输入显示名称"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                  aria-invalid={!!errors.displayName}
                />
                {errors.displayName && (
                  <p className="text-xs text-destructive">
                    {errors.displayName}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="请再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-10"
                    aria-invalid={!!errors.confirmPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={
                      showConfirmPassword ? '隐藏密码' : '显示密码'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === 'login' ? (
                <LogIn className="size-4" />
              ) : (
                <UserPlus className="size-4" />
              )}
              {mode === 'login' ? '登录' : '注册'}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              {mode === 'login' ? '还没有账号？' : '已有账号？'}
              <button
                type="button"
                onClick={switchMode}
                className="text-primary hover:underline ml-1 font-medium"
                disabled={isLoading}
              >
                {mode === 'login' ? '立即注册' : '返回登录'}
              </button>
            </p>

            <p className="text-xs text-muted-foreground text-center">
              <Link to="/" className="hover:text-foreground hover:underline">
                返回首页
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
