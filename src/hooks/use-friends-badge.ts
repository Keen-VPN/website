import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchFriendsDashboard,
  fetchFriendsNotifications,
  getSessionToken,
} from "@/auth/backend";

export interface FriendsBadgeState {
  pendingReceived: number;
  unreadNotifications: number;
  totalBadge: number;
  loading: boolean;
  enabled: boolean;
}

const POLL_INTERVAL_MS = 60_000;

export function useFriendsBadge(options?: { poll?: boolean }): FriendsBadgeState {
  const poll = options?.poll ?? true;
  const { user, getSessionToken: authGetSessionToken } = useAuth();
  const [state, setState] = useState<FriendsBadgeState>({
    pendingReceived: 0,
    unreadNotifications: 0,
    totalBadge: 0,
    loading: false,
    enabled: false,
  });
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const sessionToken = authGetSessionToken() ?? getSessionToken();
    if (!user || !sessionToken) {
      setState({
        pendingReceived: 0,
        unreadNotifications: 0,
        totalBadge: 0,
        loading: false,
        enabled: false,
      });
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const isCurrent = () => requestRef.current === requestId;

    setState((prev) => ({ ...prev, loading: true }));

    const [dashboardRes, notificationsRes] = await Promise.all([
      fetchFriendsDashboard(sessionToken),
      fetchFriendsNotifications(sessionToken),
    ]);

    if (!isCurrent()) return;

    if (!dashboardRes.ok) {
      setState({
        pendingReceived: 0,
        unreadNotifications: 0,
        totalBadge: 0,
        loading: false,
        enabled: false,
      });
      return;
    }

    const dashboard = dashboardRes.data as {
      counts?: { pendingReceived?: number };
    };
    const pendingReceived = dashboard.counts?.pendingReceived ?? 0;
    const unreadNotifications = notificationsRes.ok
      ? ((notificationsRes.data as { unreadCount?: number })?.unreadCount ?? 0)
      : 0;

    setState({
      pendingReceived,
      unreadNotifications,
      totalBadge: pendingReceived + unreadNotifications,
      loading: false,
      enabled: true,
    });
  }, [authGetSessionToken, user]);

  useEffect(() => {
    if (!poll) return;

    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [poll, refresh]);

  return state;
}
