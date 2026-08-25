import { Button } from '@/components/ui/button';
import { WorkspacePanel } from '@/components/workspace/WorkspacePanel';
import {
  workspaceListRow,
  workspaceListSurface,
} from '@/components/workspace/workspace-ui';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useLinkedProviderActions } from '@/hooks/use-linked-provider-actions';

interface LinkedAccountsProps {
  sessionToken: string;
  currentProvider?: string;
  providers: {
    google: { linked: boolean; email?: string };
    apple: { linked: boolean; email?: string };
  } | null;
  onUpdate: () => void;
}

export function LinkedAccounts({ sessionToken, currentProvider, providers, onUpdate }: LinkedAccountsProps) {
  const { linking, unlinking, linkAccount, unlinkAccount } =
    useLinkedProviderActions({
      sessionToken,
      onUpdated: onUpdate,
      labels: 'link',
    });

  if (!providers) {
    return (
      <WorkspacePanel title="Linked Accounts">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
      </WorkspacePanel>
    );
  }

  const isGoogle = currentProvider === 'google.com' || currentProvider === 'google';
  const isApple = currentProvider === 'apple.com' || currentProvider === 'apple';

  const showGoogle = !isGoogle;
  const showApple = !isApple;

  if (!showGoogle && !showApple) return null;

  return (
    <WorkspacePanel title="Linked Accounts">
      <ul className={workspaceListSurface}>
        <li className={cn(workspaceListRow, "flex items-center justify-between")}>
          <span className="font-medium">{isGoogle ? 'Google' : 'Apple'}</span>
          <Badge variant="outline">Primary</Badge>
        </li>

        {showGoogle && (
          <li className={cn(workspaceListRow, "flex items-center justify-between")}>
            <span className="font-medium">Google</span>
            {providers.google.linked ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unlinking !== null}
                  >
                    {unlinking === 'google' ? 'Unlinking...' : 'Unlink'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unlink Google Account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The linked account will lose access to any shared subscription.
                      You can re-link later if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void unlinkAccount('google')}>
                      Unlink
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void linkAccount('google')}
                disabled={linking !== null}
              >
                {linking === 'google' ? 'Linking...' : 'Link Google Account'}
              </Button>
            )}
          </li>
        )}
        {showApple && (
          <li className={cn(workspaceListRow, "flex items-center justify-between")}>
            <span className="font-medium">Apple</span>
            {providers.apple.linked ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unlinking !== null}
                  >
                    {unlinking === 'apple' ? 'Unlinking...' : 'Unlink'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unlink Apple Account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The linked account will lose access to any shared subscription.
                      You can re-link later if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void unlinkAccount('apple')}>
                      Unlink
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void linkAccount('apple')}
                disabled={linking !== null}
              >
                {linking === 'apple' ? 'Linking...' : 'Link Apple Account'}
              </Button>
            )}
          </li>
        )}
      </ul>
    </WorkspacePanel>
  );
}
