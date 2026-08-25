import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import { workspaceSectionSurface } from "@/components/workspace/workspace-ui";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getUserProfileInformation,
  updateUserProfileInformation,
  type ProfileQuestion,
  type UserProfileInformationResponse,
} from "@/auth";

function isProfileQuestionVisible(
  question: ProfileQuestion,
  answers: Record<string, string>,
): boolean {
  if (!question.showWhen) {
    return true;
  }
  const parentAnswer = answers[question.showWhen.questionKey];
  if (parentAnswer === undefined) {
    return false;
  }
  return question.showWhen.values.includes(parentAnswer);
}

function visibleProfileQuestions(
  questions: ProfileQuestion[],
  answers: Record<string, string>,
): ProfileQuestion[] {
  return questions.filter((question) =>
    isProfileQuestionVisible(question, answers),
  );
}

interface UserInformationCardProps {
  sessionToken: string;
  entrySource?: string;
  onProfileUpdated?: (profile: UserProfileInformationResponse) => void;
  /** workspace = old account UI; dashboard = new account dashboard cards */
  variant?: "workspace" | "dashboard";
}

export function UserInformationCard({
  sessionToken,
  entrySource = "web",
  onProfileUpdated,
  variant = "workspace",
}: UserInformationCardProps) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<ProfileQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadGeneration = useRef(0);

  const loadProfile = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setLoadError(null);

    const response = await getUserProfileInformation(sessionToken);
    if (generation !== loadGeneration.current) return;

    if (response.success) {
      setQuestions(response.questions);
      setAnswers(response.answers);
      setIsComplete(response.isComplete);
    } else {
      setLoadError(response.error ?? "Could not load profile information");
    }

    setLoading(false);
  }, [sessionToken]);

  useEffect(() => {
    void loadProfile();
    return () => {
      loadGeneration.current += 1;
    };
  }, [loadProfile]);

  async function handleAnswerChange(questionKey: string, value: string) {
    if (loadError || savingKey) return;

    const previous = answers[questionKey];
    const optimisticAnswers = { ...answers, [questionKey]: value };
    setAnswers(optimisticAnswers);
    setSavingKey(questionKey);

    const response = await updateUserProfileInformation(
      sessionToken,
      {
        [questionKey]: value,
      },
      entrySource,
    );
    setSavingKey(null);

    if (response.success) {
      setAnswers(response.answers);
      setIsComplete(response.isComplete);
      setLoadError(null);
      onProfileUpdated?.(response);
      return;
    }

    setAnswers((current) => {
      if (previous) {
        return { ...current, [questionKey]: previous };
      }
      return Object.fromEntries(
        Object.entries(current).filter(([key]) => key !== questionKey),
      );
    });

    toast({
      title: "Could not save your answer",
      description: response.error ?? "Please try again.",
      variant: "destructive",
    });
  }

  const isDashboard = variant === "dashboard";
  const mutedText = isDashboard ? "text-[#627086]" : "text-muted-foreground";
  const dangerText = isDashboard ? "text-[#d14343]" : "text-destructive";
  const primaryText = isDashboard ? "text-[#0f2040]" : "text-foreground";

  const body = loading ? (
    <div className={`flex items-center gap-2 text-sm ${mutedText}`}>
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading profile questions...
    </div>
  ) : loadError ? (
    <div className="space-y-2">
      <p className={`text-sm ${dangerText}`}>{loadError}</p>
      <Button
        type="button"
        variant="link"
        className={`h-auto p-0 text-sm ${primaryText}`}
        onClick={() => void loadProfile()}
      >
        Retry
      </Button>
    </div>
  ) : (
    <>
      {isComplete ? (
        <p className={`mb-4 text-sm ${mutedText}`}>
          Thanks — your profile is complete. You can change any answer below at
          any time.
        </p>
      ) : null}

      <div className="space-y-4">
        {visibleProfileQuestions(questions, answers).map((question) => (
          <div
            key={question.key}
            className={
              variant === "dashboard"
                ? "rounded-[10px] border border-[#eef2f7] bg-[#fafbfd] p-4"
                : workspaceSectionSurface
            }
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <Label
                  className={
                    variant === "dashboard"
                      ? "text-[14px] font-semibold leading-snug text-[#0f2040]"
                      : "text-base leading-snug"
                  }
                >
                  {question.label}
                </Label>
                {savingKey === question.key ? (
                  <Loader2
                    className={`mt-1 h-4 w-4 shrink-0 animate-spin ${mutedText}`}
                  />
                ) : null}
              </div>
              <RadioGroup
                value={answers[question.key] ?? ""}
                onValueChange={(value) =>
                  void handleAnswerChange(question.key, value)
                }
                className="space-y-2"
              >
                {question.options.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={option.value}
                      id={`${question.key}-${option.value}`}
                      disabled={Boolean(savingKey)}
                    />
                    <Label
                      htmlFor={`${question.key}-${option.value}`}
                      className={
                        variant === "dashboard"
                          ? "font-normal text-[#43516a]"
                          : "font-normal"
                      }
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (variant === "dashboard") {
    return (
      <section className="rounded-[15px] border border-[#e3e8f0] bg-white p-4 shadow-[0px_3px_4px_rgba(15,32,64,0.03)] sm:p-7">
        <div className="mb-5">
          <h2 className="text-[16px] font-semibold tracking-[-0.2px] text-[#0f2040]">
            User information
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[#627086]">
            Optional details to personalize perks, offers, and recommendations.
            You can skip any question and update your answers later.
          </p>
        </div>
        {body}
      </section>
    );
  }

  return (
    <WorkspacePanel
      title="User information"
      description="Optional details to personalize perks, offers, and recommendations. You can skip any question and update your answers later."
    >
      {body}
    </WorkspacePanel>
  );
}
