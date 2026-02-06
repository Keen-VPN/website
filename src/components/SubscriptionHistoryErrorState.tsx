import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Server,
  Mail,
  Home,
} from "lucide-react";

interface SubscriptionHistoryErrorStateProps {
  error: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  loading?: boolean;
}

export function SubscriptionHistoryErrorState({
  error,
  onRetry,
  onGoHome,
  loading = false
}: SubscriptionHistoryErrorStateProps) {
  // Determine error type for better UX
  const getErrorInfo = (errorMessage: string) => {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        type: 'network',
        icon: WifiOff,
        title: 'Connection Problem',
        description: 'Unable to connect to our servers. Please check your internet connection and try again.',
        color: 'text-orange-500'
      };
    }
    
    if (message.includes('unauthorized') || message.includes('token') || message.includes('session')) {
      return {
        type: 'auth',
        icon: AlertCircle,
        title: 'Authentication Error',
        description: 'Your session has expired. Please sign in again to continue.',
        color: 'text-red-500'
      };
    }
    
    if (message.includes('server') || message.includes('500') || message.includes('503')) {
      return {
        type: 'server',
        icon: Server,
        title: 'Server Maintenance',
        description: 'Our servers are temporarily unavailable. Please try again in a few minutes.',
        color: 'text-blue-500'
      };
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return {
        type: 'notfound',
        icon: AlertCircle,
        title: 'Data Not Found',
        description: 'The requested subscription data could not be found.',
        color: 'text-yellow-500'
      };
    }
    
    // Generic error
    return {
      type: 'generic',
      icon: AlertCircle,
      title: 'Something went wrong',
      description: 'An unexpected error occurred while loading your subscription history.',
      color: 'text-red-500'
    };
  };

  const errorInfo = getErrorInfo(error);
  const Icon = errorInfo.icon;

  const handleContactSupport = () => {
    const subject = encodeURIComponent('Subscription History Error');
    const body = encodeURIComponent(`Hello KeenVPN Support Team,

I'm experiencing an issue with the subscription history page:

Error: ${error}
Time: ${new Date().toISOString()}

Please assist me with resolving this issue.

Thank you!`);
    
    window.open(`mailto:support@vpnkeen.com?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <Card className="border-destructive/50 shadow-glow text-center py-12">
      <CardContent>
        <div className="max-w-md mx-auto">
          {/* Error Icon */}
          <div className="relative mb-6">
            <Icon className={`h-16 w-16 mx-auto mb-4 ${errorInfo.color}`} />
            {errorInfo.type === 'network' && (
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                <Wifi className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Error Content */}
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {errorInfo.title}
          </h3>
          <p className="text-muted-foreground mb-4">
            {errorInfo.description}
          </p>

          {/* Error Details */}
          <div className="mb-6">
            <Badge variant="outline" className="text-xs font-mono max-w-full">
              <span className="truncate">{error}</span>
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && (
              <Button 
                onClick={onRetry} 
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            )}
            
            <Button variant="outline" onClick={handleContactSupport}>
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
            
            {onGoHome && (
              <Button variant="ghost" onClick={onGoHome}>
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            )}
          </div>

          {/* Additional Help */}
          {errorInfo.type === 'network' && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg text-left">
              <p className="text-sm font-medium text-foreground mb-2">Troubleshooting tips:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Check your internet connection</li>
                <li>• Try refreshing the page</li>
                <li>• Disable VPN or proxy temporarily</li>
                <li>• Clear browser cache and cookies</li>
              </ul>
            </div>
          )}

          {errorInfo.type === 'auth' && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Your session may have expired. Try signing out and signing back in to resolve this issue.
              </p>
            </div>
          )}

          {errorInfo.type === 'server' && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                We're working to resolve this issue. Please check our status page or try again in a few minutes.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
