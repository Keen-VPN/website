import { useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminCreateUser, adminUpdateOwnPassword } from "@/auth/backend";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const ROLES = [
  "SUPPORT_ADMIN",
  "BILLING_ADMIN",
  "READONLY_ADMIN",
  "SUPER_ADMIN",
] as const;

export default function AdminUsers() {
  const { admin } = useAdminAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("SUPPORT_ADMIN");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const isSuperAdmin = admin?.role === "SUPER_ADMIN";

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await adminCreateUser({
      email: email.trim(),
      name: name.trim(),
      password,
      role,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to create admin user");
      return;
    }
    setMessage("Admin user created.");
    setEmail("");
    setName("");
    setPassword("");
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await adminUpdateOwnPassword(currentPassword, newPassword);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to update password");
      return;
    }
    setMessage("Password updated. You may need to sign in again.");
    setCurrentPassword("");
    setNewPassword("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Admin Users</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Super admins can add admin users and update their own password.
        </p>
      </div>

      {!isSuperAdmin ? (
        <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
          You must be a SUPER_ADMIN to manage admin users.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={(e) => void createUser(e)} className="space-y-3 rounded-lg border border-border p-4">
          <h3 className="text-base font-semibold">Add Admin User</h3>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Temporary Password</Label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={!isSuperAdmin || busy}>
            {busy ? "Saving..." : "Create Admin"}
          </Button>
        </form>

        <form onSubmit={(e) => void updatePassword(e)} className="space-y-3 rounded-lg border border-border p-4">
          <h3 className="text-base font-semibold">Update My Password</h3>
          <div className="space-y-1">
            <Label>Current Password</Label>
            <Input
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          <div className="space-y-1">
            <Label>New Password</Label>
            <Input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          <Button type="submit" disabled={!isSuperAdmin || busy}>
            {busy ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
