import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  ArrowRightLeft,
  CreditCard,
  Users,
} from "lucide-react";

function linkClass(isActive: boolean) {
  return [
    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
    isActive
      ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
  ].join(" ");
}

export default function AdminSidebarLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="sticky top-6 h-[calc(100vh-3rem)] w-72 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-[#0f172a]/95 via-[#111827]/90 to-[#020617]/95 p-4 text-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h1 className="text-base font-semibold tracking-tight text-white">KeenVPN Admin</h1>
            <p className="mt-1 text-xs text-white/70 break-all">{admin?.email}</p>
          </div>

          <nav className="mt-4 space-y-2">
            <NavLink to="/admin/overview" className={({ isActive }) => linkClass(isActive)}>
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </NavLink>
            <NavLink
              to="/admin/membership-transfer"
              className={({ isActive }) => linkClass(isActive)}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Membership Transfer
            </NavLink>
            <NavLink
              to="/admin/subscriptions"
              className={({ isActive }) => linkClass(isActive)}
            >
              <CreditCard className="h-4 w-4" />
              Subscriptions
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) => linkClass(isActive)}
            >
              <Users className="h-4 w-4" />
              Admin Users
            </NavLink>
          </nav>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/70">
              Navigate between admin modules quickly using the sidebar.
            </p>
          </div>

          <Button
            className="mt-4 w-full border-white/20 bg-white/10 text-white hover:bg-white/15"
            variant="outline"
            onClick={() => void signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </aside>

        <section className="min-w-0 flex-1">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
