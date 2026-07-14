/** Mirrors backend vault-field.constants.ts — labels and input types for secure vault fields. */

export type VaultFieldKey =
  | "legal_full_name"
  | "date_of_birth"
  | "ssn"
  | "passport_number"
  | "drivers_license_number"
  | "home_address"
  | "mailing_address"
  | "employer_name"
  | "annual_income"
  | "occupation"
  | "bank_account_number"
  | "tax_id";

export type VaultFieldInputType =
  | "text"
  | "date"
  | "ssn"
  | "address"
  | "number";

export type VaultFieldCategory =
  | "IDENTITY"
  | "ADDRESS"
  | "EMPLOYMENT"
  | "FINANCIAL";

export interface VaultFieldDefinition {
  key: VaultFieldKey;
  category: VaultFieldCategory;
  label: string;
  inputType: VaultFieldInputType;
}

export const VAULT_FIELD_DEFINITIONS: VaultFieldDefinition[] = [
  {
    key: "legal_full_name",
    category: "IDENTITY",
    label: "Full Name",
    inputType: "text",
  },
  {
    key: "date_of_birth",
    category: "IDENTITY",
    label: "Date of Birth",
    inputType: "date",
  },
  {
    key: "ssn",
    category: "IDENTITY",
    label: "Social Security Number",
    inputType: "ssn",
  },
  {
    key: "passport_number",
    category: "IDENTITY",
    label: "Passport Number",
    inputType: "text",
  },
  {
    key: "drivers_license_number",
    category: "IDENTITY",
    label: "Driver's License Number",
    inputType: "text",
  },
  {
    key: "home_address",
    category: "ADDRESS",
    label: "Home Address",
    inputType: "address",
  },
  {
    key: "mailing_address",
    category: "ADDRESS",
    label: "Mailing Address",
    inputType: "address",
  },
  {
    key: "employer_name",
    category: "EMPLOYMENT",
    label: "Employer",
    inputType: "text",
  },
  {
    key: "annual_income",
    category: "EMPLOYMENT",
    label: "Annual Income",
    inputType: "number",
  },
  {
    key: "occupation",
    category: "EMPLOYMENT",
    label: "Occupation",
    inputType: "text",
  },
  {
    key: "bank_account_number",
    category: "FINANCIAL",
    label: "Bank Account Number",
    inputType: "text",
  },
  {
    key: "tax_id",
    category: "FINANCIAL",
    label: "Tax ID",
    inputType: "text",
  },
];

const FIELD_BY_KEY = new Map(
  VAULT_FIELD_DEFINITIONS.map((field) => [field.key, field]),
);

export function isVaultFieldKey(key: string): key is VaultFieldKey {
  return FIELD_BY_KEY.has(key as VaultFieldKey);
}

export function getVaultFieldDefinition(key: VaultFieldKey): VaultFieldDefinition;
export function getVaultFieldDefinition(key: string): VaultFieldDefinition | undefined;
export function getVaultFieldDefinition(key: string): VaultFieldDefinition | undefined {
  return FIELD_BY_KEY.get(key as VaultFieldKey);
}

export function getVaultFieldLabel(key: string): string {
  return getVaultFieldDefinition(key)?.label ?? key;
}

const SSN_PATTERN = /^\d{3}-\d{2}-\d{4}$/;

export function formatSsnInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/** Structured address stored as JSON in vault fields. */
export interface VaultAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export function emptyVaultAddress(): VaultAddress {
  return { line1: "", line2: "", city: "", state: "", postalCode: "" };
}

export function parseVaultAddress(value: string): VaultAddress {
  const trimmed = value.trim();
  if (!trimmed) return emptyVaultAddress();

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return {
      line1: typeof parsed.line1 === "string" ? parsed.line1 : "",
      line2: typeof parsed.line2 === "string" ? parsed.line2 : "",
      city: typeof parsed.city === "string" ? parsed.city : "",
      state: typeof parsed.state === "string" ? parsed.state : "",
      postalCode:
        typeof parsed.postalCode === "string" ? parsed.postalCode : "",
    };
  } catch {
    return emptyVaultAddress();
  }
}

/** Serialize address fields to the JSON string the vault API expects. */
export function serializeVaultAddress(address: VaultAddress): string {
  // Do not trim here — this runs on every keystroke while editing. Trimming
  // would strip intentional trailing spaces as the user types (e.g. "123 " →
  // "123"), which jumps the cursor and makes multi-word fields hard to edit.
  const line1 = address.line1;
  const line2 = address.line2 ?? "";
  const city = address.city;
  const state = address.state;
  const postalCode = address.postalCode;

  if (!line1 && !line2 && !city && !state && !postalCode) {
    return "";
  }

  const payload: VaultAddress = { line1, city, state, postalCode };
  if (line2) payload.line2 = line2;
  return JSON.stringify(payload);
}

/** Trim address field values for vault persistence / API submit. */
export function normalizeVaultAddressValue(value: string): string {
  const address = parseVaultAddress(value);
  return serializeVaultAddress({
    line1: address.line1.trim(),
    line2: address.line2?.trim() ?? "",
    city: address.city.trim(),
    state: address.state.trim(),
    postalCode: address.postalCode.trim(),
  });
}

/** Normalize a vault field value before validation + persistence. */
export function normalizeVaultFieldValueForSave(
  fieldKey: string,
  value: string,
): string {
  if (getVaultFieldDefinition(fieldKey)?.inputType === "address") {
    return normalizeVaultAddressValue(value);
  }
  return value.trim();
}

export function isValidSsn(value: string): boolean {
  return SSN_PATTERN.test(value.trim());
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_VAULT_FIELD_VALUE_LENGTH = 4096;

const SENSITIVE_VAULT_FIELD_KEYS = new Set<VaultFieldKey>([
  "passport_number",
  "drivers_license_number",
  "bank_account_number",
  "tax_id",
]);

export function isSensitiveVaultField(key: string): boolean {
  return (
    key === "ssn" || SENSITIVE_VAULT_FIELD_KEYS.has(key as VaultFieldKey)
  );
}

/** Mirrors backend validateVaultFieldValue — returns an error message or null. */
export function getVaultFieldValidationError(
  fieldKey: string,
  value: string,
): string | null {
  if (!isVaultFieldKey(fieldKey)) return null;

  const trimmed = value.trim();
  if (!trimmed) return "Value is required";
  if (trimmed.length > MAX_VAULT_FIELD_VALUE_LENGTH) {
    return "Value exceeds maximum allowed length";
  }

  switch (fieldKey) {
    case "ssn":
      if (!SSN_PATTERN.test(trimmed)) {
        return "SSN must be in ###-##-#### format";
      }
      break;
    case "date_of_birth":
      if (!ISO_DATE_PATTERN.test(trimmed)) {
        return "Date of birth must be in YYYY-MM-DD format";
      }
      break;
    case "annual_income":
      if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
        return "Annual income must be a valid number";
      }
      break;
    case "home_address":
    case "mailing_address":
      try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        if (typeof parsed.line1 !== "string" || !parsed.line1.trim()) {
          return "Street address is required";
        }
        if (typeof parsed.city !== "string" || !parsed.city.trim()) {
          return "City is required";
        }
        if (typeof parsed.state !== "string" || !parsed.state.trim()) {
          return "State is required";
        }
        if (
          typeof parsed.postalCode !== "string" ||
          !parsed.postalCode.trim()
        ) {
          return "ZIP / postal code is required";
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          return "Please fill in all address fields";
        }
        return error instanceof Error ? error.message : "Invalid address";
      }
      break;
    default:
      break;
  }

  return null;
}

export function getVaultAnswersValidationError(
  keys: string[],
  answers: Record<string, string>,
): string | null {
  for (const key of keys) {
    if (!isVaultFieldKey(key)) continue;
    const value = normalizeVaultFieldValueForSave(key, answers[key] ?? "");
    if (!value) continue;
    const error = getVaultFieldValidationError(key, value);
    if (error) {
      const label = getVaultFieldLabel(key);
      return `${label}: ${error}`;
    }
  }
  return null;
}
