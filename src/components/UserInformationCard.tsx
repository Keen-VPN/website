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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getUserProfileInformation,
  updateUserProfileInformation,
  type ProfileQuestion,
} from "@/auth";

interface UserInformationCardProps {
  sessionToken: string;
}

export function UserInformationCard({ sessionToken }: UserInformationCardProps) {
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
    setAnswers((current) => ({ ...current, [questionKey]: value }));
    setSavingKey(questionKey);

    const response = await updateUserProfileInformation(sessionToken, {
      [questionKey]: value,
    });
    setSavingKey(null);

    if (response.success) {
      setAnswers(response.answers);
      setIsComplete(response.isComplete);
      setLoadError(null);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>User information</CardTitle>
        <CardDescription>
          Optional details to personalize perks, offers, and recommendations.
          You can skip any question and update your answers later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile questions...
          </div>
        ) : loadError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm"
              onClick={() => void loadProfile()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            {isComplete ? (
              <p className="text-sm text-muted-foreground">
                Thanks — your profile is complete. You can change any answer
                below at any time.
              </p>
            ) : null}

            {questions.map((question) => (
              <div key={question.key} className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <Label className="text-base leading-snug">{question.label}</Label>
                  {savingKey === question.key ? (
                    <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
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
                        className="font-normal"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
