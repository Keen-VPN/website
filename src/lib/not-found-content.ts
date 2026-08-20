import { marketingSiteUrl } from "@/lib/site-urls";

/**
 * Shared 404 destination copy for the SPA NotFound page.
 * Keep in sync with public/404.html (static Netlify fallback).
 */
export const NOT_FOUND_DESTINATIONS = [
  {
    label: "Plans",
    title: "Pricing",
    description: "Compare plans and start a free trial.",
    href: marketingSiteUrl("/pricing.html"),
    external: true,
  },
  {
    label: "Account",
    title: "Sign in",
    description: "Open your KeenVPN account.",
    href: "/signin",
    external: false,
  },
  {
    label: "Coverage",
    title: "Server locations",
    description: "Browse countries and cities worldwide.",
    href: marketingSiteUrl("/server-locations/"),
    external: true,
  },
  {
    label: "Check",
    title: "My IP address",
    description: "See what the internet is seeing right now.",
    href: marketingSiteUrl("/my-ip-address"),
    external: true,
  },
] as const;
