import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  adminFetchMe,
  adminLogout,
  type AdminMe,
} from "@/auth/backend";

interface AdminAuthContextValue {
  admin: AdminMe | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await adminFetchMe();
    setAdmin(r.ok && r.admin ? r.admin : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await adminLogout();
    setAdmin(null);
  }, []);

  const can = useCallback(
    (permission: string) => !!admin?.permissions.includes(permission),
    [admin],
  );

  const value = useMemo(
    () => ({ admin, loading, refresh, logout, can }),
    [admin, loading, refresh, logout, can],
  );

  return (
    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return ctx;
}
