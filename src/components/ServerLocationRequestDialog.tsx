import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { submitServerLocationPreference } from "@/auth/backend";
import { trackServerPageEvent } from "@/lib/product-analytics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRegion?: string;
}

export function ServerLocationRequestDialog({
  open,
  onOpenChange,
  initialRegion = "",
}: Props) {
  const { toast } = useToast();
  const [region, setRegion] = useState(initialRegion);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) {
      setSubmitted(false);
      setRegion("");
      setReason("");
      return;
    }

    setSubmitted(false);
    setRegion(initialRegion);
    setReason("");
  }, [open, initialRegion]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const onSubmit = async () => {
    const trimmedRegion = region.trim();
    const trimmedReason = reason.trim();
    if (!trimmedRegion || !trimmedReason) {
      toast({
        title: "Fill in all fields",
        description: "Tell us which region you need and why.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitServerLocationPreference({
        region: trimmedRegion,
        reason: trimmedReason,
      });
      if (res.success) {
        setRegion("");
        setReason("");
        setSubmitted(true);
        trackServerPageEvent("server_location_requested", {
          region: trimmedRegion,
        });
      } else {
        toast({
          title: "Could not submit",
          description: res.error ?? "Try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {submitted ? "Request submitted" : "Request a new VPN location"}
          </DialogTitle>
          {!submitted ? (
            <DialogDescription>
              Tell us where you need a server. We expand based on user demand.
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {submitted ? (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-6 text-center">
            <CheckCircle2
              className="mx-auto mb-3 h-10 w-10 text-green-500"
              aria-hidden
            />
            <p className="text-lg font-semibold text-foreground">
              You&apos;re all set
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your request is recorded. We review every submission as we
              expand our server network.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sl-region">Region or country</Label>
              <Input
                id="sl-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Poland, Warsaw"
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sl-reason">Why do you need this location?</Label>
              <Textarea
                id="sl-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Travel, work, streaming, privacy, etc."
                rows={4}
                maxLength={2000}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {submitted ? (
            <Button type="button" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void onSubmit()}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit request"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
