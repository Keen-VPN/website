import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Plus, X } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { serverLocationStats } from '@/constants/server-locations';
import { marketingSiteUrl } from '@/lib/site-urls';
import { cn } from '@/lib/utils';

interface FaqQuestion {
  q: string;
  a: string;
}

interface FaqCategory {
  id: string;
  title: string;
  accent: string;
  questions: FaqQuestion[];
}

const CATEGORIES: FaqCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    accent: 'text-[#ed7d36]',
    questions: [
      {
        q: 'How do I set up KeenVPN on a new device?',
        a: 'Download the app for your platform, sign in with your KeenVPN account, and allow the connection. Then select a server to get started.',
      },
      {
        q: 'How many devices can I use on one plan?',
        a: 'Device limits depend on your plan: Individual supports up to 3 simultaneous connections, while Business includes 5 connected devices per seat. Manage active devices from your account or in the app settings.',
      },
      {
        q: 'Will KeenVPN slow down my internet?',
        a: 'A small amount of overhead is normal with any VPN. KeenVPN is optimized for speed across our global network, and switching servers can improve performance if one location is congested.',
      },
    ],
  },
  {
    id: 'class-action',
    title: 'Class action alerts',
    accent: 'text-[#2f9e6b]',
    questions: [
      {
        q: 'How do class action alerts work?',
        a: 'When Class Action claims open in KeenVPN, we surface settlements that may apply to you and help you track deadlines and status. Claims features are rolling out — check the Class Action page for the latest.',
      },
      {
        q: 'How do I know if I qualify for a class action?',
        a: 'Qualification depends on each settlement’s criteria (for example, when you used a service or whether your data was in a breach). KeenVPN will highlight matches when claims are available for your account.',
      },
      {
        q: 'How do I claim a settlement?',
        a: 'Each settlement has its own claim steps and deadline. When available, KeenVPN will guide you through discovery, filing, and tracking so you can submit without digging through legal notices alone.',
      },
      {
        q: 'Will I get updates about my claim?',
        a: 'Yes. You can track claim status in the Class Action area, and you can manage Class Action email alerts from Profile → Email Preferences.',
      },
    ],
  },
  {
    id: 'devices-apps',
    title: 'Devices & apps',
    accent: 'text-[#7b61ff]',
    questions: [
      {
        q: 'Which platforms are supported?',
        a: 'KeenVPN is available for Windows, macOS, iOS, Android, and as a Chrome extension. Visit Downloads in your account dashboard for the latest store and installer links.',
      },
      {
        q: 'How do I install KeenVPN on my router?',
        a: 'Router setup varies by manufacturer. Check your router’s VPN / OpenVPN or WireGuard settings and use the configuration details from the KeenVPN app or support if your plan includes router setup.',
      },
      {
        q: 'How do I update the KeenVPN app?',
        a: 'On iOS and Android, update through the App Store or Google Play. On Windows and macOS, use the in-app update prompt or reinstall from Downloads to get the latest version.',
      },
      {
        q: "Why can't I find KeenVPN in my app store?",
        a: 'Availability can vary by region and store listing name. Use the official links on the Downloads page, or contact support@vpnkeen.com if a link does not open in your country.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy & security',
    accent: 'text-[#247cff]',
    questions: [
      {
        q: 'Does KeenVPN keep logs?',
        a: 'No. KeenVPN has a strict no-logs policy. We do not track, collect, or store browsing history or connection activity logs of your online activity.',
      },
      {
        q: 'What encryption does KeenVPN use?',
        a: 'KeenVPN uses military-grade IKEv2/IPSec with AES-256 encryption — the same class of protection used by enterprises and financial institutions.',
      },
      {
        q: 'Is KeenVPN safe to use on public Wi-Fi?',
        a: 'Yes. When connected, your traffic is encrypted end-to-end through the VPN tunnel, which protects you on café, hotel, and airport networks.',
      },
      {
        q: 'How does the Kill Switch work?',
        a: 'The Kill Switch blocks internet traffic if your VPN connection drops unexpectedly, so your real IP and data are not exposed while the tunnel is down.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & subscription',
    accent: 'text-[#ed7d36]',
    questions: [
      {
        q: 'How do I change my email address?',
        a: 'Open Profile in your account dashboard, then choose Change email under Account details. We send a verification link to the new address before the change is applied.',
      },
      {
        q: 'How do I cancel my subscription?',
        a: 'Go to Subscription in your dashboard. Stripe subscribers can manage or cancel billing from there; App Store purchases are cancelled in Apple subscription settings.',
      },
      {
        q: "I haven't received a verification email.",
        a: 'Check spam and promotions folders, then use Resend from the pending email change or sign-in screen. If nothing arrives within a few minutes, contact support@vpnkeen.com with the address you used.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    accent: 'text-[#ff4e97]',
    questions: [
      {
        q: "Why can't I connect to KeenVPN?",
        a: 'Confirm your internet works without the VPN, then try another server location and restart the app. Disable any other VPN software that might conflict, then try again.',
      },
      {
        q: "What should I do if a server isn't working?",
        a: `Switch to another location — we have servers across ${serverLocationStats.countries} countries. If a region stays offline, contact support with the city/server name and your platform.`,
      },
    ],
  },
];

function CategoryQuestions({
  category,
  defaultOpenQuestion,
}: {
  category: FaqCategory;
  defaultOpenQuestion?: string;
}) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpenQuestion}
      className="w-full"
    >
      {category.questions.map((item, index) => (
        <AccordionItem
          key={item.q}
          value={`${category.id}-${index}`}
          className="border-0 border-b border-[#ece8e1] last:border-b-0"
        >
          <AccordionTrigger
            className={cn(
              'group py-5 text-left text-[16px] font-semibold leading-6 text-[#0f2040] hover:no-underline',
              '[&>svg:last-child]:hidden',
            )}
          >
            <span className="pr-4 leading-snug">{item.q}</span>
            <span className={cn('relative h-4 w-4 shrink-0', category.accent)}>
              <Plus className="absolute inset-0 h-4 w-4 transition-opacity group-data-[state=open]:opacity-0" />
              <X className="absolute inset-0 h-4 w-4 opacity-0 transition-opacity group-data-[state=open]:opacity-100" />
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pr-8 text-[14px] leading-6 text-[#667795]">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function SupportFooter() {
  return (
    <footer className="border-t border-[#e5e0d6] py-8 sm:py-9">
      <div className="grid gap-8 px-6 sm:grid-cols-3 sm:gap-10 sm:px-10 lg:px-12">
        <div>
          <a
            href={marketingSiteUrl()}
            className="inline-flex items-center gap-2"
          >
            <img src="/logo.png" alt="" className="h-6 w-6 object-contain" />
            <span className="text-[15px] font-bold text-[#0f2040]">
              KeenVPN
            </span>
          </a>
          <p className="mt-3 text-[12px] leading-relaxed text-[#627086]">
            Secure, private, always protected.
          </p>
        </div>

        <div>
          <p className="text-[13px] font-semibold text-[#0f2040]">Company</p>
          <p className="mt-3 text-[12px] text-[#627086]">
            <a href={marketingSiteUrl('/')} className="hover:text-[#0f2040]">
              About us
            </a>
            <span aria-hidden> · </span>
            <a href={marketingSiteUrl('/')} className="hover:text-[#0f2040]">
              Careers
            </a>
            <span aria-hidden> · </span>
            <a href={marketingSiteUrl('/')} className="hover:text-[#0f2040]">
              Blog
            </a>
          </p>
        </div>

        <div>
          <p className="text-[13px] font-semibold text-[#0f2040]">Legal</p>
          <p className="mt-3 text-[12px] text-[#627086]">
            <a
              href={marketingSiteUrl('/privacy.html')}
              className="hover:text-[#0f2040]"
            >
              Privacy Policy
            </a>
            <span aria-hidden> · </span>
            <a
              href={marketingSiteUrl('/terms.html')}
              className="hover:text-[#0f2040]"
            >
              Terms
            </a>
            <span aria-hidden> · </span>
            <a
              href={marketingSiteUrl('/terms.html')}
              className="hover:text-[#0f2040]"
            >
              Refund Policy
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function DashboardSupport() {
  const [openCategory, setOpenCategory] = useState<string>('getting-started');

  return (
    <div className="min-h-screen bg-[#fffaf5]">
      <SEOHead
        title="Support — KeenVPN Help & FAQs"
        description="Quick answers to common KeenVPN questions about setup, devices, privacy, billing, and troubleshooting."
        canonical="https://vpnkeen.com/support"
      />

      <header className="border-b border-[#e5e0d6] bg-[#fffaf5]">
        <div className="flex h-[76px] items-center px-6 sm:px-10 lg:px-12">
          <Link
            to="/home"
            className="inline-flex items-center gap-2"
            aria-label="KeenVPN home"
          >
            <img
              src="/logo.png"
              alt=""
              className="h-7 w-7 shrink-0 object-contain"
            />
            <span className="text-[16px] font-bold tracking-tight text-[#0f2040]">
              KeenVPN
            </span>
          </Link>
        </div>
      </header>

      <main className="px-6 py-8 sm:px-10 sm:py-12 lg:px-12">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left column */}
          <aside className="lg:sticky lg:top-10">
            <p className="text-[13px] font-bold uppercase tracking-[0.3px] text-[#ff7900]">
              Frequently asked
            </p>
            <h1 className="mt-4 text-[46px] font-bold leading-[1.06] tracking-[-1.5px] text-[#0f2040] sm:text-[52px]">
              Quick answers to common questions.
            </h1>
            <p className="mt-5 max-w-[315px] text-[17px] leading-7 text-[#667795]">
              These are the questions KeenVPN users ask most. Find the answer
              fast in our support center.
            </p>

            <div className="mt-11 max-w-[344px] rounded-[21px] bg-[#123567] p-7 text-white">
              <p className="text-[19px] font-semibold tracking-[-0.4px]">
                Can&apos;t find what you need?
              </p>
              <p className="mt-4 text-[15px] leading-6 text-white/75">
                Our team is ready to help with any question you have.
              </p>
              <a
                href="mailto:support@vpnkeen.com"
                className="mt-7 inline-flex items-center gap-1 text-[15px] font-semibold text-[#ffbd33] transition-opacity hover:opacity-80"
              >
                Contact support →
              </a>
            </div>

            <div className="mt-16 flex justify-center lg:justify-start lg:pl-24">
              <ChevronDown className="h-5 w-5 text-[#ed7d36]" aria-hidden />
            </div>
          </aside>

          {/* Right column — single white FAQ card */}
          <div className="rounded-[24px] border border-[#edf0f5] bg-white px-8 py-7 shadow-[0px_12px_30px_rgba(15,32,64,0.04)] sm:px-8 md:px-8">
            <Accordion
              type="single"
              collapsible
              value={openCategory}
              onValueChange={setOpenCategory}
              className="w-full"
            >
              {CATEGORIES.map((category) => (
                <AccordionItem
                  key={category.id}
                  value={category.id}
                  className="border-[#ece8e1]"
                >
                  <AccordionTrigger
                    className={cn(
                      'group py-5 text-left hover:no-underline sm:py-6',
                      '[&>svg:last-child]:hidden',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[14px] font-bold uppercase tracking-[0.2px]',
                        category.accent,
                      )}
                    >
                      {category.title}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180',
                        category.accent,
                      )}
                    />
                  </AccordionTrigger>
                  <AccordionContent className="pb-2 pt-0">
                    <div className="border-t border-[#ece8e1]">
                      <CategoryQuestions
                        category={category}
                        defaultOpenQuestion={
                          category.id === 'getting-started'
                            ? 'getting-started-0'
                            : undefined
                        }
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </main>
      <SupportFooter />
    </div>
  );
}
