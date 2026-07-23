import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchMembershipSharingDashboard,
  inviteMembershipMember,
  resendMembershipInvite,
  revokeMembershipInvite,
  revokeMembershipMember,
  updateMembershipSeatCount,
} from "@/auth/backend";
import { MIN_BUSINESS_SEATS, MAX_BUSINESS_SEATS } from "@/constants/pricing";

export interface MembershipSharingMember {
  userId: string;
  email: string;
  displayName?: string | null;
  joinedAt: string;
}

export interface MembershipSharingPendingInvite {
  id: string;
  email: string;
  invitedAt: string;
  expiresAt: string;
}

export interface MembershipSharingDashboard {
  role: string;
  eligible: boolean;
  chargeOnAccept?: boolean;
  canManageSeats?: boolean;
  minSeats?: number;
  subscriptionId?: string;
  subscriptionStatus?: string;
  planId?: string | null;
  planName?: string | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  billingPeriod?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  seats?: {
    seatLimit: number;
    activeSeats: number;
    availableSeats: number;
    pendingInvites: number;
    prepaidAvailableSeats?: number;
    nextAcceptanceWillCharge?: boolean;
    canInvite?: boolean;
  } | null;
  membership?: {
    ownerEmail: string;
    ownerName?: string | null;
    planName?: string | null;
  } | null;
  members: MembershipSharingMember[];
  pendingInvites: MembershipSharingPendingInvite[];
  revokedInvites?: { id: string; email: string; revokedAt?: string | null }[];
}

export function useMembershipSharing(sessionToken: string | null) {
  const [dashboard, setDashboard] = useState<MembershipSharingDashboard | null>(
    null,
  );
  const [loading, setLoading] = useState(Boolean(sessionToken));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharingDisabled, setSharingDisabled] = useState(false);
  const [draftSeatCount, setDraftSeatCount] = useState<number | null>(null);
  const loadRequestRef = useRef(0);
  const activeSessionTokenRef = useRef(sessionToken);
  activeSessionTokenRef.current = sessionToken;

  const load = useCallback(async () => {
    if (!sessionToken) {
      setDashboard(null);
      setLoading(false);
      return;
    }

    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;

    setLoading(true);
    setError(null);
    setSharingDisabled(false);
    try {
      const res = await fetchMembershipSharingDashboard(sessionToken);
      if (!isCurrentRequest()) return;
      if (!res.ok) {
        if (res.error?.includes("not enabled")) {
          setDashboard(null);
          setSharingDisabled(true);
          setError(
            "Team invites are temporarily unavailable. Contact support@vpnkeen.com if you were charged for seats.",
          );
          return;
        }
        setError(res.error ?? "Could not load team sharing.");
        return;
      }
      const data = res.data as MembershipSharingDashboard;
      setDashboard(data);
      setDraftSeatCount(data.seats?.seatLimit ?? null);
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  }, [sessionToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = useCallback(
    async (email: string) => {
      if (!sessionToken) return false;
      const requestToken = sessionToken;
      setSubmitting(true);
      setError(null);
      try {
        const res = await inviteMembershipMember(requestToken, email);
        if (activeSessionTokenRef.current !== requestToken) return false;
        if (!res.ok) {
          setError(res.error ?? "Could not send invite.");
          return false;
        }
        setDashboard(res.data as MembershipSharingDashboard);
        return true;
      } finally {
        if (activeSessionTokenRef.current === requestToken) {
          setSubmitting(false);
        }
      }
    },
    [sessionToken],
  );

  const revokeMember = useCallback(
    async (userId: string) => {
      if (!sessionToken) return;
      const requestToken = sessionToken;
      setSubmitting(true);
      setError(null);
      try {
        const res = await revokeMembershipMember(requestToken, userId);
        if (activeSessionTokenRef.current !== requestToken) return;
        if (!res.ok) {
          setError(res.error ?? "Could not remove member.");
          return;
        }
        setDashboard(res.data as MembershipSharingDashboard);
      } finally {
        if (activeSessionTokenRef.current === requestToken) {
          setSubmitting(false);
        }
      }
    },
    [sessionToken],
  );

  const resendInvite = useCallback(
    async (inviteId: string) => {
      if (!sessionToken) return;
      const requestToken = sessionToken;
      setSubmitting(true);
      setError(null);
      try {
        const res = await resendMembershipInvite(requestToken, inviteId);
        if (activeSessionTokenRef.current !== requestToken) return;
        if (!res.ok) {
          setError(res.error ?? "Could not resend invite.");
          return;
        }
        setDashboard(res.data as MembershipSharingDashboard);
      } finally {
        if (activeSessionTokenRef.current === requestToken) {
          setSubmitting(false);
        }
      }
    },
    [sessionToken],
  );

  const cancelInvite = useCallback(
    async (inviteId: string) => {
      if (!sessionToken) return;
      const requestToken = sessionToken;
      setSubmitting(true);
      setError(null);
      try {
        const res = await revokeMembershipInvite(requestToken, inviteId);
        if (activeSessionTokenRef.current !== requestToken) return;
        if (!res.ok) {
          setError(res.error ?? "Could not cancel invite.");
          return;
        }
        setDashboard(res.data as MembershipSharingDashboard);
      } finally {
        if (activeSessionTokenRef.current === requestToken) {
          setSubmitting(false);
        }
      }
    },
    [sessionToken],
  );

  const updateSeats = useCallback(async () => {
    if (!sessionToken || draftSeatCount == null) return false;
    const requestToken = sessionToken;
    setSubmitting(true);
    setError(null);
    try {
      const res = await updateMembershipSeatCount(requestToken, draftSeatCount);
      if (activeSessionTokenRef.current !== requestToken) return false;
      if (!res.ok) {
        setError(res.error ?? "Could not update seat count.");
        return false;
      }
      await load();
      return true;
    } finally {
      if (activeSessionTokenRef.current === requestToken) {
        setSubmitting(false);
      }
    }
  }, [draftSeatCount, load, sessionToken]);

  const seats = dashboard?.seats;
  const canInvite =
    dashboard?.eligible &&
    (seats?.canInvite ?? (seats?.availableSeats ?? 0) > 0);
  const seatFloor = Math.max(
    dashboard?.minSeats ?? MIN_BUSINESS_SEATS,
    (seats?.activeSeats ?? 0) + (seats?.pendingInvites ?? 0),
  );
  const currentSeatLimit = seats?.seatLimit ?? seatFloor;
  const effectiveDraftSeats = Math.max(
    seatFloor,
    draftSeatCount ?? currentSeatLimit,
  );
  const seatsChanged = effectiveDraftSeats !== currentSeatLimit;

  return {
    dashboard,
    loading,
    submitting,
    error,
    sharingDisabled,
    draftSeatCount,
    setDraftSeatCount,
    load,
    invite,
    revokeMember,
    resendInvite,
    cancelInvite,
    updateSeats,
    canInvite,
    seatFloor,
    currentSeatLimit,
    effectiveDraftSeats,
    seatsChanged,
    MIN_BUSINESS_SEATS,
    MAX_BUSINESS_SEATS,
  };
}
