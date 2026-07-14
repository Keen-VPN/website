import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import type { VaultAddress, VaultFieldInputType } from "@/lib/vault-fields";
import {
  formatSsnInput,
  parseVaultAddress,
  serializeVaultAddress,
} from "@/lib/vault-fields";

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

function AddressFields({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const address = parseVaultAddress(value);
  const idPrefix = id ?? "vault-address";

  function update(patch: Partial<VaultAddress>) {
    onChange(serializeVaultAddress({ ...address, ...patch }));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-line1`}>Street address</Label>
        <Input
          id={`${idPrefix}-line1`}
          value={address.line1}
          onChange={(e) => update({ line1: e.target.value })}
          disabled={disabled}
          placeholder="123 Main St"
          autoComplete="street-address"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-line2`}>
          Apt, suite, etc.{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id={`${idPrefix}-line2`}
          value={address.line2 ?? ""}
          onChange={(e) => update({ line2: e.target.value })}
          disabled={disabled}
          placeholder="Apt 4B"
          autoComplete="address-line2"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-city`}>City</Label>
          <Input
            id={`${idPrefix}-city`}
            value={address.city}
            onChange={(e) => update({ city: e.target.value })}
            disabled={disabled}
            placeholder="Austin"
            autoComplete="address-level2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-state`}>State</Label>
          <Input
            id={`${idPrefix}-state`}
            value={address.state}
            onChange={(e) => update({ state: e.target.value })}
            disabled={disabled}
            placeholder="TX"
            autoComplete="address-level1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-postal`}>ZIP / postal code</Label>
        <Input
          id={`${idPrefix}-postal`}
          value={address.postalCode}
          onChange={(e) => update({ postalCode: e.target.value })}
          disabled={disabled}
          placeholder="78701"
          autoComplete="postal-code"
          className="sm:max-w-[12rem]"
        />
      </div>
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
      <AddressFields
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
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
