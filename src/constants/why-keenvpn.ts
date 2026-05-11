import {
  Activity,
  ArrowRightLeft,
  Eye,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface WhyKeenVpnPillar {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface WhyKeenVpnComparisonRow {
  feature: string;
  keenVpn: string;
  typicalVpn: string;
}

export const whyKeenVpnPillars: WhyKeenVpnPillar[] = [
  {
    icon: Eye,
    title: "Transparent by design",
    description:
      "KeenVPN makes connection status, subscription state, and account access easy to understand.",
  },
  {
    icon: Activity,
    title: "Built around real usage",
    description:
      "Connection insights and session tracking help the product improve around how people actually use VPNs.",
  },
  {
    icon: RefreshCw,
    title: "Less friction, faster starts",
    description:
      "Simple onboarding, email code sign-in, and clear plan actions keep setup moving without extra steps.",
  },
  {
    icon: ShieldCheck,
    title: "Protection for everyday networks",
    description:
      "KeenVPN is shaped around public Wi-Fi, mobile work, and the moments when protection should be simple.",
  },
];

export const whyKeenVpnBenefits: WhyKeenVpnPillar[] = [
  {
    icon: ArrowRightLeft,
    title: "Membership transfer",
    description:
      "Switching from another VPN is easier with a transfer request for remaining membership time.",
  },
  {
    icon: Smartphone,
    title: "iOS and macOS focus",
    description:
      "The experience is designed around Apple devices instead of feeling like a generic port.",
  },
  {
    icon: LockKeyhole,
    title: "Honest privacy posture",
    description:
      "The product avoids noisy claims and focuses on clear security, privacy, and account controls.",
  },
  {
    icon: Wifi,
    title: "Public network confidence",
    description:
      "A clean connection experience helps users stay protected when moving between networks.",
  },
];

export const whyKeenVpnComparison: WhyKeenVpnComparisonRow[] = [
  {
    feature: "Membership transfer",
    keenVpn: "Available",
    typicalVpn: "Usually unavailable",
  },
  {
    feature: "Connection visibility",
    keenVpn: "Clear status and session insight",
    typicalVpn: "Often hidden or vague",
  },
  {
    feature: "Onboarding",
    keenVpn: "Fast setup with minimal friction",
    typicalVpn: "More account and setup steps",
  },
  {
    feature: "Pricing communication",
    keenVpn: "Clear plan and subscription status",
    typicalVpn: "Can be harder to interpret",
  },
];
