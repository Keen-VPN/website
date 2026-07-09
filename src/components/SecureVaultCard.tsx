import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronRight, Loader2, Lock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  deleteVaultField,
  getVaultFieldValue,
  getVaultOverview,
  upsertVaultField,
  type VaultFieldMetadata,
  type VaultOverviewSection,
} from "@/auth/backend";
import { VaultFieldInput } from "@/components/VaultFieldInput";
import {
  getVaultFieldValidationError,
  isSensitiveVaultField,
} from "@/lib/vault-fields";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  IDENTITY: "Identity",
  ADDRESS: "Address",
  EMPLOYMENT: "Employment",
  FINANCIAL: "Financial",
};

interface SecureVaultCardProps {
  sessionToken: string;
}

export function SecureVaultCard({ sessionToken }: SecureVaultCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [sections, setSections] = useState<VaultOverviewSection[]>([]);
  const [activeField, setActiveField] = useState<VaultFieldMetadata | null>(
    null,
  );
  const [editValue, setEditValue] = useState("");
  const [loadingFieldValue, setLoadingFieldValue] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldToDelete, setFieldToDelete] = useState<VaultFieldMetadata | null>(
    null,
  );
  const loadGeneration = useRef(0);
  const editRequestKeyRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setError(null);
    setFeatureDisabled(false);

    const res = await getVaultOverview(sessionToken);
    if (generation !== loadGeneration.current) return;

    if (!res.ok || !res.data) {
      if (res.status === 404) {
        setFeatureDisabled(true);
      } else {
        setError(res.error ?? "Could not load secure vault");
      }
      setLoading(false);
      return;
    }

    setSections(res.data.sections);
    setLoading(false);
  }, [sessionToken]);

  useEffect(() => {
    void load();
    return () => {
      loadGeneration.current += 1;
    };
  }, [load]);

  function closeFieldModal() {
    if (saving || loadingFieldValue) return;
    editRequestKeyRef.current = null;
    setActiveField(null);
    setEditValue("");
    setError(null);
  }

  async function openField(field: VaultFieldMetadata) {
    const requestedFieldKey = field.fieldKey;
    editRequestKeyRef.current = requestedFieldKey;
    setActiveField(field);
    setEditValue("");
    setError(null);
    setLoadingFieldValue(field.isStored);

    if (!field.isStored) {
      setLoadingFieldValue(false);
      return;
    }

    const res = await getVaultFieldValue(sessionToken, field.fieldKey);
    if (editRequestKeyRef.current !== requestedFieldKey) {
      return;
    }
    if (res.ok && res.data?.field) {
      setEditValue(res.data.field.value);
    } else {
      setError(res.error ?? `Failed to load ${field.label}`);
    }
    setLoadingFieldValue(false);
  }

  async function handleSave(field: VaultFieldMetadata) {
    const trimmed = editValue.trim();
    const validationError = getVaultFieldValidationError(field.fieldKey, trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await upsertVaultField(sessionToken, field.fieldKey, trimmed, true);
      if (!res.ok) {
        setError(res.error ?? "Failed to save field");
        return;
      }
      toast({ title: `${field.label} saved securely` });
      editRequestKeyRef.current = null;
      setActiveField(null);
      setEditValue("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(field: VaultFieldMetadata) {
    setSaving(true);
    setError(null);
    try {
      const res = await deleteVaultField(sessionToken, field.fieldKey);
      if (!res.ok) {
        setError(res.error ?? "Failed to delete field");
        return;
      }
      toast({ title: `${field.label} removed from vault` });
      editRequestKeyRef.current = null;
      setActiveField(null);
      setEditValue("");
      setFieldToDelete(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/90 px-4 py-6 text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading secure vault…
      </div>
    );
  }

  if (featureDisabled) {
    return null;
  }

  return (
    <>
      <div className="space-y-5">
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card px-4 py-4 shadow-sm sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/15 text-primary">
              <Shield className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                Secure Vault
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Store sensitive details encrypted. Partner applications only
                access vault fields after you explicitly approve each request.
              </p>
            </div>
          </div>
        </div>

        {error && !activeField ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {sections.map((section) => (
          <section
            key={section.category}
            className="rounded-xl border border-border/80 bg-muted/25 p-3 shadow-sm sm:p-4"
          >
            <h3 className="mb-3 border-b border-border/70 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/80">
              {CATEGORY_LABELS[section.category] ?? section.category}
            </h3>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {section.fields.map((field) => (
                <li key={field.fieldKey}>
                  <div
                    role="button"
                    tabIndex={saving ? -1 : 0}
                    aria-disabled={saving}
                    onClick={() => {
                      if (saving) return;
                      void openField(field);
                    }}
                    onKeyDown={(event) => {
                      if (saving) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void openField(field);
                      }
                    }}
                    className={cn(
                      "group flex h-full w-full cursor-pointer flex-col rounded-lg border p-3.5 text-left transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      saving && "pointer-events-none opacity-60",
                      field.isStored
                        ? "border-primary/30 bg-card shadow-sm hover:border-primary/50 hover:bg-card/95"
                        : "border-dashed border-muted-foreground/35 bg-background/70 hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                            field.isStored
                              ? "border-primary/25 bg-primary/10 text-primary"
                              : "border-border/80 bg-muted/60 text-muted-foreground",
                          )}
                        >
                          <Lock className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">
                          {field.label}
                        </span>
                      </div>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                        aria-hidden
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                      {field.isStored ? (
                        <Badge
                          variant="secondary"
                          className="border border-primary/20 bg-primary/10 text-[10px] text-primary"
                        >
                          {field.maskedPreview ?? "On file"}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-muted-foreground/40 bg-background/80 text-[10px] text-muted-foreground"
                        >
                          Not stored
                        </Badge>
                      )}
                      <span
                        className={cn(
                          "text-xs font-medium",
                          field.isStored
                            ? "text-muted-foreground"
                            : "text-primary",
                        )}
                      >
                        {field.isStored ? "Update" : "Add"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Dialog
        open={activeField !== null}
        onOpenChange={(open) => {
          if (!open) closeFieldModal();
        }}
      >
        <DialogContent className="sm:max-w-md">
          {activeField ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  {activeField.label}
                </DialogTitle>
                <DialogDescription>
                  {activeField.isStored
                    ? "Update this encrypted field in your vault."
                    : "Add this field to your secure vault."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-1">
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}

                {loadingFieldValue ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading secure value…
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor={`vault-${activeField.fieldKey}`}>
                      {activeField.label}
                    </Label>
                    <VaultFieldInput
                      id={`vault-${activeField.fieldKey}`}
                      inputType={activeField.inputType}
                      value={editValue}
                      onChange={setEditValue}
                      disabled={saving}
                      sensitive={isSensitiveVaultField(activeField.fieldKey)}
                    />
                  </div>
                )}
              </div>

              <DialogFooter
                className={cn(
                  "gap-2",
                  activeField.isStored
                    ? "flex-col sm:flex-row sm:justify-between"
                    : "sm:justify-end",
                )}
              >
                {activeField.isStored ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive sm:mr-auto"
                    onClick={() => setFieldToDelete(activeField)}
                    disabled={saving || loadingFieldValue}
                  >
                    Remove
                  </Button>
                ) : null}
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeFieldModal}
                    disabled={saving || loadingFieldValue}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleSave(activeField)}
                    disabled={saving || loadingFieldValue}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    Save
                  </Button>
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={fieldToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setFieldToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from vault?</AlertDialogTitle>
            <AlertDialogDescription>
              {fieldToDelete
                ? `This will permanently delete ${fieldToDelete.label} from your secure vault. Partner applications will need you to enter it again.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving || !fieldToDelete}
              onClick={(event) => {
                event.preventDefault();
                if (fieldToDelete) void handleDelete(fieldToDelete);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
