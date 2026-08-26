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
} from "@/auth";

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
        className="max-h-[min(90dvh,720px)] gap-0 overflow-hidden border-[#e3e8f0] bg-white p-0 text-[#0f2040] shadow-[0px_16px_40px_rgba(15,32,64,0.16)] sm:max-w-lg sm:rounded-[16px]"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        hideCloseButton
      >
        <DialogHeader className="space-y-2 border-b border-[#e3e8f0] px-5 py-5 text-left sm:px-6">
          <DialogTitle className="text-[18px] font-semibold leading-snug text-[#0f2040] sm:text-[20px]">
            {question}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed !text-[#627086] sm:text-[14px]">
            This helps us understand which channels bring people to KeenVPN.
            Optional — you can skip and update later in your account.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-[#627086]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading options...
            </div>
          ) : (
            <div className="space-y-4">
              <RadioGroup
                value={selectedSource}
                onValueChange={setSelectedSource}
                className="max-h-[min(40vh,280px)] space-y-2 overflow-y-auto pr-1"
              >
                {options.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center gap-3 rounded-[8px] border border-[#e3e8f0] bg-[#f8fafc] px-3 py-2.5"
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`signup-source-${option.value}`}
                      disabled={saving}
                      className="border-[#0f2040] text-[#0f2040]"
                    />
                    <Label
                      htmlFor={`signup-source-${option.value}`}
                      className="flex-1 cursor-pointer font-normal text-[#0f2040]"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {selectedSource === "other" ? (
                <div className="space-y-2">
                  <Label
                    htmlFor="signup-source-other"
                    className="text-[13px] font-semibold text-[#0f2040]"
                  >
                    Please tell us more
                  </Label>
                  <Input
                    id="signup-source-other"
                    value={otherText}
                    onChange={(event) => setOtherText(event.target.value)}
                    placeholder="Where did you hear about KeenVPN?"
                    disabled={saving}
                    className="h-11 rounded-[8px] border-[#dbe2ec] bg-white text-[14px] text-[#0f2040] placeholder:text-[#8d9ab1]"
                  />
                </div>
              ) : null}

              {error ? (
                <p className="text-sm text-[#d14343]">{error}</p>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 border-t border-[#e3e8f0] px-5 py-4 sm:justify-between sm:px-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => void handleSkip()}
            disabled={loading || saving}
            className="h-10 rounded-[8px] text-[13px] font-semibold text-[#627086] hover:bg-[#f5f7fb] hover:text-[#0f2040]"
          >
            Skip for now
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading || saving || !selectedSource}
            className="h-10 rounded-[8px] bg-[#0f2040] px-5 text-[13px] font-semibold text-white hover:bg-[#0f2040]/90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
