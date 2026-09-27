import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** 允许访问的角色列表，不填则登录即可访问 */
  roles?: string[];
}

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // 仅用于副作用占位，实际逻辑在渲染分支中处理
  }, [user, isLoading, roles]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate to="/login" state={{ from: location.pathname }} replace />
    );
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
