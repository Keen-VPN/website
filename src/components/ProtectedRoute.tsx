import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
}

const ProtectedRoute = ({ children, requireSubscription = false }: ProtectedRouteProps) => {
  const { user, subscription, loading, hasSessionToken } = useAuth();
  const location = useLocation();

  const isASWeb = (() => {
    const urlParams = new URLSearchParams(location.search);
    const detected = urlParams.get('asweb') === '1' || sessionStorage.getItem('asweb_session') === '1';
    if (detected) {
      sessionStorage.setItem('asweb_session', '1');
    }
    return detected;
  })();

  // During hard refresh, auth can briefly be unresolved while a session token
  // is still being validated. Keep the user on the current protected page,
  // but only while initialization is in progress to avoid infinite spinners.
  // For ASWeb flows, we also keep the user on the page while loading even if the
  // backend session token hasn't been persisted yet.
  if (loading && (user ? true : (hasSessionToken || isASWeb))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={isASWeb ? "/signin?asweb=1" : "/signin"} replace />;
  }

  if (requireSubscription && (!subscription || subscription.status !== 'active')) {
    return <Navigate to={isASWeb ? "/subscribe?asweb=1" : "/subscribe"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
