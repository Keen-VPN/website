import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  getSignupSourceStatus,
  updateSignupSource,
  type SignupSourceOption,
} from "@/auth/backend";

interface SignupSourceDialogProps {
  open: boolean;
  sessionToken: string;
  onCompleted: () => void;
}

export function SignupSourceDialog({
  open,
  sessionToken,
  onCompleted,
}: SignupSourceDialogProps) {
  const [question, setQuestion] = useState("How did you hear about KeenVPN?");
  const [options, setOptions] = useState<SignupSourceOption[]>([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [otherText, setOtherText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const response = await getSignupSourceStatus(sessionToken);
      if (cancelled) return;

      if (response.success) {
        setQuestion(response.question);
        setOptions(response.options);
        setSelectedSource(response.source ?? "");
        setOtherText(response.otherText ?? "");
      } else {
        setError(response.error ?? "Could not load signup question");
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, sessionToken]);

  async function handleSubmit() {
    if (!selectedSource) {
      setError("Please select an option or skip for now.");
      return;
    }
    if (selectedSource === "other" && otherText.trim().length < 2) {
      setError("Please tell us more when selecting Other.");
      return;
    }

    setSaving(true);
    setError(null);
    const response = await updateSignupSource(sessionToken, {
      source: selectedSource,
      otherText: selectedSource === "other" ? otherText.trim() : undefined,
    });
    setSaving(false);

    if (response.success) {
      onCompleted();
      return;
    }

    setError(response.error ?? "Could not save your answer.");
  }

  async function handleSkip() {
    setSaving(true);
    setError(null);
    const response = await updateSignupSource(sessionToken, { skipped: true });
    setSaving(false);

    if (response.success) {
      onCompleted();
      return;
    }

    setError(response.error ?? "Could not skip right now.");
  }

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{question}</DialogTitle>
          <DialogDescription>
            This helps us understand which channels bring people to KeenVPN.
            Optional — you can skip and update later in your account.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading options...
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup
              value={selectedSource}
              onValueChange={setSelectedSource}
              className="max-h-64 space-y-2 overflow-y-auto pr-1"
            >
              {options.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem
                    value={option.value}
                    id={`signup-source-${option.value}`}
                    disabled={saving}
                  />
                  <Label htmlFor={`signup-source-${option.value}`} className="font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {selectedSource === "other" ? (
              <div className="space-y-2">
                <Label htmlFor="signup-source-other">Please tell us more</Label>
                <Input
                  id="signup-source-other"
                  value={otherText}
                  onChange={(event) => setOtherText(event.target.value)}
                  placeholder="Where did you hear about KeenVPN?"
                  disabled={saving}
                />
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => void handleSkip()}
            disabled={loading || saving}
          >
            Skip for now
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading || saving || !selectedSource}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
