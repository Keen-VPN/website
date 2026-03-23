import { Navigate } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from 'lucide-react';
import { getSessionToken } from '@/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
}

const ProtectedRoute = ({ children, requireSubscription = false }: ProtectedRouteProps) => {
  const { user, subscription, loading } = useAuth();
  const hasSessionToken = Boolean(getSessionToken());

  // During hard refresh, auth can briefly be unresolved while a session token
  // is still being validated. Keep the user on the current protected page.
  if (loading || (!user && hasSessionToken)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (requireSubscription && (!subscription || subscription.status !== 'active')) {
    return <Navigate to="/subscribe" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
