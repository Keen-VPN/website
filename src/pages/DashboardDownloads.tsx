import {
  Monitor,
  Laptop,
  Smartphone,
  TabletSmartphone,
  Chrome,
} from "lucide-react";
import type { ReactNode } from "react";
import { APP_STORE_URLS, toNativeAppStoreSchemeUrl } from "@/constants/app-store-urls";
import { detectDevice } from "@/lib/device-detection";

interface DownloadItem {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  href?: string;
  comingSoon?: boolean;
  icon: ReactNode;
}

interface DownloadSection {
  title: string;
  description: string;
  items: DownloadItem[];
}

const CHROME_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/keenvpn-%E2%80%94-browser-protect/fdmiheabmohipekdgphijdboekojllfh";

const WINDOWS_STORE_URL =
  "https://apps.microsoft.com/store/detail/9NZZ9WCFKKBG?cid=DevShareMCLPCS";

const SECTIONS: DownloadSection[] = [
  {
    title: "Desktop apps",
    description:
      "Full-featured KeenVPN protection for work, browsing, and streaming.",
    items: [
      {
        id: "windows",
        title: "Windows",
        subtitle: "Windows 10 and 11 — Microsoft Store",
        cta: "Get app",
        href: WINDOWS_STORE_URL,
        icon: <Monitor className="h-5 w-5 text-dash-ink" />,
      },
      {
        id: "macos",
        title: "macOS",
        subtitle: "macOS 13 and higher",
        cta: "Download",
        href: APP_STORE_URLS.macos,
        icon: <Laptop className="h-5 w-5 text-dash-ink" />,
      },
    ],
  },
  {
    title: "Mobile apps",
    description:
      "Stay protected on mobile data, public Wi-Fi, and while travelling.",
    items: [
      {
        id: "android",
        title: "Android",
        subtitle: "Available on Google Play",
        cta: "Get app",
        href: APP_STORE_URLS.android,
        icon: <Smartphone className="h-5 w-5 text-dash-ink" />,
      },
      {
        id: "ios",
        title: "iOS",
        subtitle: "Available on App Store",
        cta: "Get app",
        href: APP_STORE_URLS.ios,
        icon: <TabletSmartphone className="h-5 w-5 text-dash-ink" />,
      },
    ],
  },
  {
    title: "Browser",
    description:
      "Encrypt your browsing and hide your IP on any network, in one click.",
    items: [
      {
        id: "chrome",
        title: "Chrome",
        subtitle: "Available on Chrome Web store",
        cta: "Add extension",
        href: CHROME_EXTENSION_URL,
        icon: <Chrome className="h-5 w-5 text-dash-ink" />,
      },
    ],
  },
];

function DownloadRow({ item }: { item: DownloadItem }) {
  const device = detectDevice();
  const useNativeScheme =
    Boolean(item.href) &&
    ((item.id === "macos" && device === "macos") ||
      (item.id === "ios" && device === "ios"));
  const href =
    item.href && useNativeScheme
      ? toNativeAppStoreSchemeUrl(item.href, device)
      : item.href;

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-dash-border bg-dash-surface-muted px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-dash-border bg-dash-surface">
          {item.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-dash-ink">{item.title}</p>
          <p className="text-[13px] text-dash-muted">{item.subtitle}</p>
        </div>
      </div>
      {item.comingSoon || !href ? (
        <span className="inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] border border-dash-border-strong bg-dash-surface px-4 text-[13px] font-semibold text-dash-muted sm:self-auto">
          {item.cta}
        </span>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] bg-dash-ink px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 sm:self-auto"
        >
          {item.cta}
        </a>
      )}
    </div>
  );
}

export default function DashboardDownloads() {
  return (
    <div className="p-4 sm:p-6 lg:p-7">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
        {SECTIONS.map((section) => (
          <section
            key={section.title}
            className="rounded-[15px] border border-dash-border bg-dash-surface px-4 py-5 shadow-dash-card sm:px-6 sm:py-6"
          >
            <div className="mb-5">
              <h2 className="text-[18px] font-bold text-dash-ink-deep">
                {section.title}
              </h2>
              <p className="mt-1 text-[14px] text-dash-muted">
                {section.description}
              </p>
            </div>
            <div
              className={
                section.items.length > 1
                  ? "grid gap-3 md:grid-cols-2"
                  : "grid gap-3"
              }
            >
              {section.items.map((item) => (
                <DownloadRow key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
