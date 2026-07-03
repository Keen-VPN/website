import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Loader2, Lock, Shield } from "lucide-react";
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
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
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

  async function startEdit(field: VaultFieldMetadata) {
    const requestedFieldKey = field.fieldKey;
    editRequestKeyRef.current = requestedFieldKey;
    setEditingKey(field.fieldKey);
    setEditValue("");
    setError(null);
    if (field.isStored) {
      const res = await getVaultFieldValue(sessionToken, field.fieldKey);
      if (editRequestKeyRef.current !== requestedFieldKey) {
        return;
      }
      if (res.ok && res.data?.field) {
        setEditValue(res.data.field.value);
      } else {
        setError(res.error ?? `Failed to load ${field.label}`);
      }
    }
  }

  function cancelEdit() {
    editRequestKeyRef.current = null;
    setEditingKey(null);
    setEditValue("");
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
      setEditingKey(null);
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
      if (editingKey === field.fieldKey) cancelEdit();
      setFieldToDelete(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Secure Vault
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (featureDisabled) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Secure Vault
        </CardTitle>
        <CardDescription>
          Store sensitive details encrypted. Partner applications only access
          vault fields after you explicitly approve each request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {sections.map((section) => (
          <div key={section.category} className="space-y-3">
            <h3 className="text-sm font-medium">
              {CATEGORY_LABELS[section.category] ?? section.category}
            </h3>
            <ul className="space-y-3">
              {section.fields.map((field) => {
                const isEditing = editingKey === field.fieldKey;
                return (
                  <li
                    key={field.fieldKey}
                    className="rounded-md border p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        <span className="font-medium text-sm">{field.label}</span>
                      </div>
                      {field.isStored ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {field.maskedPreview ?? "On file"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Not stored
                        </Badge>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <Label htmlFor={`vault-${field.fieldKey}`}>{field.label}</Label>
                        <VaultFieldInput
                          id={`vault-${field.fieldKey}`}
                          inputType={field.inputType}
                          value={editValue}
                          onChange={setEditValue}
                          disabled={saving}
                          sensitive={isSensitiveVaultField(field.fieldKey)}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => void handleSave(field)}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                            ) : null}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                          {field.isStored ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => setFieldToDelete(field)}
                              disabled={saving}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void startEdit(field)}
                        disabled={saving}
                      >
                        {field.isStored ? "Update" : "Add"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </CardContent>

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
    </Card>
  );
}
