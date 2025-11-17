import { z } from "zod";

// Disposable email domains for basic spam protection
export const disposableEmailDomains = [
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "temp-mail.org",
  "throwaway.email",
];

export const contactSalesSchema = z.object({
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
  hasConsent: z.boolean().default(true),
  useCase: z
    .string()
    .max(500, "Use case must be less than 500 characters")
    .optional(),
});

export type ContactSalesForm = z.infer<typeof contactSalesSchema>;
