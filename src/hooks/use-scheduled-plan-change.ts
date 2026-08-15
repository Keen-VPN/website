import { useCallback, useState } from "react";
import { getSessionToken } from "@/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PlanChangeResult {
  success: boolean;
  error?: string;
  message?: string;
}

interface ScheduledPlanChangeCopy {
  signInDescription: string;
  successTitle: string;
  successDescription: string;
  failureTitle: string;
  failureDescription: string;
}

interface UseScheduledPlanChangeOptions<
  TArgs extends unknown[],
  TEventName extends string,
> {
  perform: (token: string, ...args: TArgs) => Promise<PlanChangeResult>;
  trackEvent: (eventName: TEventName, source?: string) => void | Promise<void>;
  clickedEvent: TEventName;
  completedEvent: TEventName;
  copy: ScheduledPlanChangeCopy;
}

/** Shared auth, telemetry, toast, refresh, and loading lifecycle for scheduled plan changes. */
export function useScheduledPlanChange<
  TArgs extends unknown[],
  TEventName extends string,
>({
  perform,
  trackEvent,
  clickedEvent,
  completedEvent,
  copy,
}: UseScheduledPlanChangeOptions<TArgs, TEventName>) {
  const { refreshSubscription } = useAuth();
  const { toast } = useToast();
  const [changing, setChanging] = useState(false);

  const dispatchTracking = useCallback(
    (eventName: TEventName, source: string) => {
      try {
        void Promise.resolve(trackEvent(eventName, source)).catch(() => {
          // Analytics must never delay or fail a billing operation.
        });
      } catch {
        // Treat synchronous analytics failures as non-fatal too.
      }
    },
    [trackEvent],
  );

  const runChange = useCallback(
    async (source: string, ...args: TArgs) => {
      const token = getSessionToken();
      if (!token) {
        toast({
          title: "Sign in required",
          description: copy.signInDescription,
          variant: "destructive",
        });
        return { success: false as const, needsAuth: true };
      }

      try {
        setChanging(true);
        dispatchTracking(clickedEvent, source);
        const result = await perform(token, ...args);

        if (!result.success) {
          throw new Error(result.error || copy.failureDescription);
        }

        dispatchTracking(completedEvent, source);
        toast({
          title: copy.successTitle,
          description: result.message ?? copy.successDescription,
        });
        await refreshSubscription();
        return { success: true as const, needsAuth: false };
      } catch (error) {
        toast({
          title: copy.failureTitle,
          description:
            error instanceof Error ? error.message : copy.failureDescription,
          variant: "destructive",
        });
        return { success: false as const, needsAuth: false };
      } finally {
        setChanging(false);
      }
    },
    [
      clickedEvent,
      completedEvent,
      copy,
      dispatchTracking,
      perform,
      refreshSubscription,
      toast,
    ],
  );

  return { changing, runChange };
}
