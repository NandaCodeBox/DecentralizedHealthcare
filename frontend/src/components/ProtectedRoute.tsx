import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { authService } from '@/services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      // Check if demo mode is enabled
      const useDemo = process.env.NEXT_PUBLIC_USE_DEMO_API === 'true';
      const demoParam = router.query.demo === 'true';
      
      if (useDemo || demoParam) {
        // Demo mode - allow access without authentication
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // Check if auth is available
      if (!authService.isAuthAvailable()) {
        // Auth not configured - redirect to demo mode
        router.push('/?demo=true');
        return;
      }

      // Check authentication
      const authenticated = await authService.isAuthenticated();
      
      if (!authenticated) {
        // Not authenticated - redirect to login
        const returnUrl = router.asPath;
        router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        return;
      }
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}

// Higher-order component for easy use
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
