import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import type { ProfileQuestion } from "@/auth";
import type { WorkflowQuestionDefinition } from "@/auth/backend";
import {
  WorkflowQuestionField,
} from "@/components/WorkflowQuestionFields";
import { VaultFieldInput } from "@/components/VaultFieldInput";
import {
  getVaultFieldDefinition,
  getVaultFieldLabel,
  isSensitiveVaultField,
  isVaultFieldKey,
} from "@/lib/vault-fields";
import { humanizeWorkflowKey } from "@/lib/workflow-ui";

interface WorkflowMissingInputFieldsProps {
  visibleQuestionKeys: string[];
  inputQuestions?: WorkflowQuestionDefinition[];
  questionByKey: Map<string, ProfileQuestion>;
  answers: Record<string, string>;
  onAnswerChange: (key: string, value: string) => void;
  disabled?: boolean;
  idPrefix: string;
}

export function WorkflowMissingInputFields({
  visibleQuestionKeys,
  inputQuestions,
  questionByKey,
  answers,
  onAnswerChange,
  disabled,
  idPrefix,
}: WorkflowMissingInputFieldsProps) {
  return (
    <>
      {visibleQuestionKeys.map((key) => {
        const richQuestion = inputQuestions?.find((q) => q.key === key);
        if (richQuestion) {
          return (
            <WorkflowQuestionField
              key={key}
              question={richQuestion}
              value={answers[key] ?? ""}
              onChange={(value) => onAnswerChange(key, value)}
              disabled={disabled}
              idPrefix={idPrefix}
            />
          );
        }

        if (isVaultFieldKey(key)) {
          const vaultField = getVaultFieldDefinition(key);
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={`${idPrefix}-${key}`}>{vaultField.label}</Label>
              <VaultFieldInput
                id={`${idPrefix}-${key}`}
                inputType={vaultField.inputType}
                value={answers[key] ?? ""}
                onChange={(value) => onAnswerChange(key, value)}
                disabled={disabled}
                sensitive={isSensitiveVaultField(key)}
              />
              <p className="text-xs text-muted-foreground">
                Stored encrypted in your secure vault.
              </p>
            </div>
          );
        }

        const question = questionByKey.get(key);
        const label =
          question?.label ?? getVaultFieldLabel(key) ?? humanizeWorkflowKey(key);
        return (
          <div key={key} className="space-y-2">
            {question?.options?.length ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium leading-none">{label}</legend>
                <RadioGroup
                  value={answers[key] ?? ""}
                  onValueChange={(value) => onAnswerChange(key, value)}
                  className="space-y-1.5"
                >
                  {question.options.map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <RadioGroupItem
                        value={option.value}
                        id={`${idPrefix}-${key}-${option.value}`}
                        disabled={disabled}
                      />
                      <Label
                        htmlFor={`${idPrefix}-${key}-${option.value}`}
                        className="font-normal"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </fieldset>
            ) : (
              <>
                <Label htmlFor={`${idPrefix}-${key}`}>{label}</Label>
                <Input
                  id={`${idPrefix}-${key}`}
                  value={answers[key] ?? ""}
                  onChange={(e) => onAnswerChange(key, e.target.value)}
                  disabled={disabled}
                />
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
