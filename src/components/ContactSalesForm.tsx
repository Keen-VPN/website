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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Disposable email domains for basic spam protection
const disposableEmailDomains = [
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "temp-mail.org",
  "throwaway.email",
];

const contactSalesSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
  workEmail: z
    .string()
    .email("Please enter a valid email address")
    .refine((email) => {
      const domain = email.split("@")[1];
      return !disposableEmailDomains.includes(domain?.toLowerCase());
    }, "Please use a work email address"),
  teamSize: z
    .number({ required_error: "Team size is required" })
    .int()
    .min(1, "Team size must be at least 1")
    .max(10000, "Team size must be less than 10,000"),
  countryRegion: z.string().min(1, "Please select your country/region"),
  hasConsent: z
    .boolean()
    .refine((val) => val === true, "You must agree to be contacted"),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 10,
      "Phone number must be at least 10 digits"
    ),
  useCase: z
    .string()
    .max(500, "Use case must be less than 500 characters")
    .optional(),
  preferredContactMethod: z.string().optional(),
  preferredContactTime: z.string().optional(),
  message: z
    .string()
    .max(1000, "Message must be less than 1000 characters")
    .optional(),
});

type ContactSalesForm = z.infer<typeof contactSalesSchema>;

const countries = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "France",
  "Australia",
  "Japan",
  "Singapore",
  "Netherlands",
  "Sweden",
  "Norway",
  "Denmark",
  "Switzerland",
  "Austria",
  "Belgium",
  "Finland",
  "Ireland",
  "New Zealand",
  "South Korea",
  "Other",
];

const contactMethods = ["Email", "Phone", "Video Call"];

const timePreferences = [
  "9 AM - 12 PM EST",
  "12 PM - 3 PM EST",
  "3 PM - 6 PM EST",
  "9 AM - 12 PM PST",
  "12 PM - 3 PM PST",
  "3 PM - 6 PM PST",
  "9 AM - 12 PM GMT",
  "12 PM - 3 PM GMT",
  "3 PM - 6 PM GMT",
  "Flexible",
];

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
      countryRegion: "",
      hasConsent: false,
      phone: "",
      useCase: "",
      preferredContactMethod: "Email",
      preferredContactTime: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactSalesForm) => {
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      // TODO: Replace with actual API endpoint URL from environment
      const response = await fetch(
        "http://localhost:3003/api/sales-contact/submit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setReferenceId(result.referenceId || `REF-${Date.now()}`);
        setSubmitStatus("success");
        form.reset();
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
              <CheckCircle className="h-6 w-6 text-green-500" />
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
            <Button onClick={handleClose} className="w-full">
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
              <Button variant="outline" onClick={() => setSubmitStatus("idle")}>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Country/Region */}
              <FormField
                control={form.control}
                name="countryRegion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country/Region *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Phone (Optional) */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1-555-123-4567"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional - for faster communication
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preferred Contact Method */}
              <FormField
                control={form.control}
                name="preferredContactMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Contact Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contactMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preferred Contact Time */}
              <FormField
                control={form.control}
                name="preferredContactTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Contact Time</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time preference" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timePreferences.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information you'd like to share..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Consent Checkbox */}
            <FormField
              control={form.control}
              name="hasConsent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      I agree to be contacted by KeenVPN's sales team *
                    </FormLabel>
                    <FormDescription>
                      We'll only use your information to respond to your inquiry
                      and provide relevant product information.
                    </FormDescription>
                    <FormMessage />
                  </div>
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
