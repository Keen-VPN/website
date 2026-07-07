import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import type { VaultFieldInputType } from "@/lib/vault-fields";
import { formatSsnInput } from "@/lib/vault-fields";

interface VaultFieldInputProps {
  inputType: VaultFieldInputType;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  /** Mask value with show/hide toggle (SSN always masked). */
  sensitive?: boolean;
}

function MaskedInput({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  inputMode,
  maxLength,
  revealLabel,
  hideLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputMode?: "numeric" | "decimal" | "text";
  maxLength?: number;
  revealLabel: string;
  hideLabel: string;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        type={revealed ? "text" : "password"}
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setRevealed((v) => !v)}
        disabled={disabled}
        aria-label={revealed ? hideLabel : revealLabel}
      >
        {revealed ? (
          <EyeOff className="h-4 w-4" aria-hidden />
        ) : (
          <Eye className="h-4 w-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}

export function VaultFieldInput({
  inputType,
  value,
  onChange,
  disabled,
  id,
  placeholder,
  sensitive = false,
}: VaultFieldInputProps) {
  if (inputType === "address") {
    return (
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={
          placeholder ??
          '{"line1":"...","city":"...","state":"...","postalCode":"..."}'
        }
        rows={3}
      />
    );
  }

  if (inputType === "ssn") {
    return (
      <MaskedInput
        id={id}
        value={value}
        onChange={(v) => onChange(formatSsnInput(v))}
        disabled={disabled}
        placeholder="###-##-####"
        inputMode="numeric"
        maxLength={11}
        revealLabel="Show SSN"
        hideLabel="Hide SSN"
      />
    );
  }

  if (sensitive) {
    return (
      <MaskedInput
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        revealLabel="Show value"
        hideLabel="Hide value"
      />
    );
  }

  return (
    <Input
      id={id}
      type={inputType === "date" ? "date" : inputType === "number" ? "text" : "text"}
      inputMode={inputType === "number" ? "decimal" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete="off"
    />
  );
}
