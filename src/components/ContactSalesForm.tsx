import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import {
  ContactSalesForm,
  contactSalesSchema,
} from "@/constants/contact-enterprise";
import { BACKEND_URL } from "@/auth/backend";

interface ContactSalesDialogProps {
  children: React.ReactNode;
}

export function ContactSalesDialog({ children }: ContactSalesDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [referenceId, setReferenceId] = useState<string>("");

  const form = useForm<ContactSalesForm>({
    resolver: zodResolver(contactSalesSchema),
    defaultValues: {
      companyName: "",
      workEmail: "",
      teamSize: 50,
      hasConsent: true,
      useCase: "",
    },
  });

  const onSubmit = async (data: ContactSalesForm) => {
    setIsSubmitting(true);
    setSubmitStatus("idle");

    // Clear any existing server-side validation errors
    form.clearErrors();

    try {
      // TODO: Replace with actual API endpoint URL from environment
      const response = await fetch(`${BACKEND_URL}/sales-contact/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        setReferenceId(result.referenceId || `REF-${Date.now()}`);
        setSubmitStatus("success");
        form.reset();
      } else if (response.status === 400) {
        // Handle validation errors
        try {
          const errorData = await response.json();

          // Check if we have validation errors array (direct format)
          if (Array.isArray(errorData) && errorData.length > 0) {
            let hasValidationErrors = false;

            errorData.forEach((error: { field: string; message: string }) => {
              if (error.field && error.message) {
                const fieldName = error.field as keyof ContactSalesForm;

                form.setError(fieldName, {
                  type: "server",
                  message: error.message,
                });
                hasValidationErrors = true;
              }
            });

            if (hasValidationErrors) {
              setIsSubmitting(false);
              return;
            }
          }

          // Handle nested errors format
          if (errorData.errors && Array.isArray(errorData.errors)) {
            let hasValidationErrors = false;

            errorData.errors.forEach(
              (error: { field: string; message: string }) => {
                if (error.field && error.message) {
                  form.setError(error.field as keyof ContactSalesForm, {
                    type: "server",
                    message: error.message,
                  });
                  hasValidationErrors = true;
                }
              }
            );

            if (hasValidationErrors) {
              setIsSubmitting(false);
              return;
            }
          }

          // Handle validationErrors format (your backend format)
          if (
            errorData.validationErrors &&
            Array.isArray(errorData.validationErrors)
          ) {
            let hasValidationErrors = false;

            errorData.validationErrors.forEach(
              (error: { field: string; message: string }) => {
                if (error.field && error.message) {
                  form.setError(error.field as keyof ContactSalesForm, {
                    type: "server",
                    message: error.message,
                  });
                  hasValidationErrors = true;
                }
              }
            );

            if (hasValidationErrors) {
              setIsSubmitting(false);
              return;
            }
          }

          // Handle single error object format
          if (errorData.field && errorData.message) {
            form.setError(errorData.field as keyof ContactSalesForm, {
              type: "server",
              message: errorData.message,
            });

            setIsSubmitting(false);
            return;
          }
        } catch (parseError) {
          console.error("Error parsing validation errors:", parseError);
        }
        // If we can't parse validation errors, show generic error
        setSubmitStatus("error");
      } else {
        console.error("Failed to submit contact form:", response.statusText);
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSubmitStatus("idle");
    setReferenceId("");
  };

  if (submitStatus === "success") {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-primary" />
              <DialogTitle>Request Submitted Successfully</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Thank you for your interest in KeenVPN Enterprise! We've received
              your request and our sales team will contact you within 24 hours.
            </p>
            {referenceId && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">
                  Reference ID: {referenceId}
                </p>
                <p className="text-xs text-muted-foreground">
                  Please keep this reference ID for your records.
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              For urgent matters, please contact our support team directly.
            </p>
            <Button
              onClick={handleClose}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (submitStatus === "error") {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <DialogTitle>Submission Failed</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              We're sorry, but there was an error submitting your request.
              Please try again or contact our support team directly.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  form.clearErrors();
                  setSubmitStatus("idle");
                }}
              >
                Try Again
              </Button>
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contact Sales</DialogTitle>
          <DialogDescription>
            Get in touch with our sales team to discuss Enterprise solutions for
            your organization. We'll respond within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Name */}
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corporation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Work Email */}
              <FormField
                control={form.control}
                name="workEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john.doe@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Team Size */}
            <FormField
              control={form.control}
              name="teamSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Size *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="50"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Number of users who will need VPN access
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Use Case */}
            <FormField
              control={form.control}
              name="useCase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Use Case</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about your VPN requirements (e.g., remote team access, secure client connections, etc.)"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Help us understand your specific needs
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
