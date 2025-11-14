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

export type ContactSalesForm = z.infer<typeof contactSalesSchema>;

export const countries = [
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

export const contactMethods = ["Email", "Phone", "Video Call"];

export const timePreferences = [
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
