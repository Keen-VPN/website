import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { WorkflowQuestionDefinition } from "@/auth/backend";

const OTHER_RADIO_VALUE = "__other__";

/** Answers are always plain strings (see backend WorkflowVaultPort contract) —
 * multi-select selections are stored as a single comma-joined string. */
export function isWorkflowQuestionVisible(
  question: WorkflowQuestionDefinition,
  answers: Record<string, string>,
): boolean {
  if (!question.showWhen) return true;
  const parentAnswer = answers[question.showWhen.questionKey];
  if (parentAnswer === undefined || parentAnswer.trim() === "") return false;
  const parentTokens = parentAnswer
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  return question.showWhen.values.some((value) =>
    parentTokens.includes(value),
  );
}

/** Ordered keys to render while WAITING_FOR_INPUT — includes missing keys even
 * without rich question metadata so users can always answer required fields. */
export function getVisibleWorkflowQuestionKeys(params: {
  missingInputKeys: string[];
  inputQuestions?: WorkflowQuestionDefinition[];
  answers: Record<string, string>;
}): string[] {
  const { missingInputKeys, inputQuestions, answers } = params;
  if (!inputQuestions?.length) return missingInputKeys;
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const question of inputQuestions) {
    if (
      !seen.has(question.key) &&
      (missingInputKeys.includes(question.key) ||
        isWorkflowQuestionVisible(question, answers))
    ) {
      seen.add(question.key);
      ordered.push(question.key);
    }
  }
  for (const key of missingInputKeys) {
    if (!seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }
  return ordered;
}

function parseMultiSelectValue(
  value: string,
  options: NonNullable<WorkflowQuestionDefinition["options"]>,
): { selected: Set<string>; other: string } {
  const optionValues = new Set(options.map((o) => o.value));
  const tokens = value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const selected = new Set(tokens.filter((t) => optionValues.has(t)));
  const other = tokens.filter((t) => !optionValues.has(t)).join(", ");
  return { selected, other };
}

function buildMultiSelectValue(
  selected: Set<string>,
  options: NonNullable<WorkflowQuestionDefinition["options"]>,
  other: string,
): string {
  const ordered = options
    .filter((o) => selected.has(o.value))
    .map((o) => o.value);
  const trimmedOther = other.trim();
  return [...ordered, ...(trimmedOther ? [trimmedOther] : [])].join(", ");
}

interface WorkflowQuestionFieldProps {
  question: WorkflowQuestionDefinition;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  idPrefix?: string;
}

/** Renders a single workflow question field (email/text/single_select/multi_select,
 * with optional "Other" free text) — shared between WorkflowsCard and the Perks-page
 * workflow dialog so every client renders the same intake form from one definition. */
export function WorkflowQuestionField({
  question,
  value,
  onChange,
  disabled,
  idPrefix,
}: WorkflowQuestionFieldProps) {
  const fieldId = `${idPrefix ?? "wq"}-${question.key}`;
  const options = question.options ?? [];
  const isKnownSingleValue = options.some((o) => o.value === value);
  const [singleOtherSelected, setSingleOtherSelected] = useState(
    () => question.allowOther && value.length > 0 && !isKnownSingleValue,
  );

  useEffect(() => {
    const opts = question.options ?? [];
    if (!question.allowOther) {
      setSingleOtherSelected(false);
      return;
    }
    setSingleOtherSelected(
      value.length > 0 && !opts.some((option) => option.value === value),
    );
  }, [question.allowOther, question.options, value]);

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{question.label}</Label>
      {question.helpText ? (
        <p className="text-xs text-muted-foreground">{question.helpText}</p>
      ) : null}

      {question.type === "email" || question.type === "text" ? (
        <Input
          id={fieldId}
          type={question.type === "email" ? "email" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      ) : null}

      {question.type === "single_select" ? (
        <RadioGroup
          value={
            singleOtherSelected
              ? OTHER_RADIO_VALUE
              : isKnownSingleValue
                ? value
                : ""
          }
          onValueChange={(next) => {
            if (next === OTHER_RADIO_VALUE) {
              setSingleOtherSelected(true);
              onChange("");
              return;
            }
            setSingleOtherSelected(false);
            onChange(next);
          }}
          className="space-y-1.5"
        >
          {options.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem
                value={option.value}
                id={`${fieldId}-${option.value}`}
                disabled={disabled}
              />
              <Label
                htmlFor={`${fieldId}-${option.value}`}
                className="font-normal"
              >
                {option.label}
              </Label>
            </div>
          ))}
          {question.allowOther ? (
            <div className="flex items-center gap-2">
              <RadioGroupItem
                value={OTHER_RADIO_VALUE}
                id={`${fieldId}-other`}
                disabled={disabled}
              />
              <Label htmlFor={`${fieldId}-other`} className="font-normal">
                Other
              </Label>
            </div>
          ) : null}
          {singleOtherSelected ? (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Please specify"
              disabled={disabled}
              className="mt-1"
            />
          ) : null}
        </RadioGroup>
      ) : null}

      {question.type === "multi_select"
        ? (() => {
            const { selected, other } = parseMultiSelectValue(value, options);
            return (
              <div className="space-y-1.5">
                {options.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`${fieldId}-${option.value}`}
                      checked={selected.has(option.value)}
                      disabled={disabled}
                      onCheckedChange={(checked) => {
                        const next = new Set(selected);
                        if (checked) next.add(option.value);
                        else next.delete(option.value);
                        onChange(buildMultiSelectValue(next, options, other));
                      }}
                    />
                    <Label
                      htmlFor={`${fieldId}-${option.value}`}
                      className="font-normal"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
                {question.allowOther ? (
                  <div className="flex items-center gap-2 pt-1">
                    <Label
                      htmlFor={`${fieldId}-other`}
                      className="whitespace-nowrap text-sm font-normal text-muted-foreground"
                    >
                      Other:
                    </Label>
                    <Input
                      id={`${fieldId}-other`}
                      value={other}
                      onChange={(e) =>
                        onChange(
                          buildMultiSelectValue(
                            selected,
                            options,
                            e.target.value,
                          ),
                        )
                      }
                      disabled={disabled}
                    />
                  </div>
                ) : null}
              </div>
            );
          })()
        : null}
    </div>
  );
}
