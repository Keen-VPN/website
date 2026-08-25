import type { ReactNode } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";

type NavigateFn = (to: string) => void;

export function ClassActionRow({ navigate }: { navigate: NavigateFn }) {
  return (
    <button
      onClick={() => navigate("/class-action")}
      className="flex items-center gap-3 rounded-[13px] border border-[#e3e8f0] bg-white px-4 py-4 shadow-[0px_3px_4px_rgba(15,32,64,0.03)] transition-colors hover:bg-[#f5f7fb] sm:gap-4 sm:px-6 sm:py-[22px]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0f3f8] text-xl">
        📄
      </div>
      <div className="flex-1 text-left">
        <p className="text-[15px] font-semibold text-[#0f2040]">
          Class Action Claims
        </p>
        <p className="text-[13px] text-[#627086]">
          Track and file claims from data-breach settlements
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#627086]" />
    </button>
  );
}

export function QuickLinkCards({
  navigate,
  accountRoute = "/profile",
}: {
  navigate: NavigateFn;
  accountRoute?: string;
}) {
  const cards = [
    {
      title: "Set up devices",
      desc: "Get the KeenVPN app for every device you use to browse, work, and stay protected.",
      cta: "Download apps",
      route: "/downloads",
    },
    {
      title: "Account",
      desc: "Manage your account details, two-factor authentication.",
      cta: "Manage account",
      route: accountRoute,
    },
    {
      title: "Help & guides",
      desc: "Setup walkthroughs and troubleshooting for every KeenVPN app.",
      cta: "View guides",
      route: "/support",
    },
  ];

  return (
    <div className="flex w-full shrink-0 flex-col gap-3 xl:w-[310px]">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-[13px] border border-[#e3e8f0] bg-white px-5 py-4 shadow-[0px_3px_4px_rgba(15,32,64,0.03)]"
        >
          <p className="text-[14px] font-semibold text-[#0f2040]">
            {card.title}
          </p>
          <p className="mt-1 text-[13px] leading-[1.5] text-[#627086]">
            {card.desc}
          </p>
          <button
            onClick={() => navigate(card.route)}
            className="mt-3 flex items-center gap-1 text-[13px] font-semibold text-[#ed7d36] transition-opacity hover:opacity-80"
          >
            {card.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Shared layout for SubscribedHome / ExpiredHome: greeting, left column slot, class-action, quick links. */
export function DashboardHomeLayout({
  firstName,
  navigate,
  accountRoute = "/profile",
  children,
  leftExtra,
}: {
  firstName: string;
  navigate: NavigateFn;
  accountRoute?: string;
  children: ReactNode;
  leftExtra?: ReactNode;
}) {
  return (
    <div className="p-4 sm:p-6 lg:p-7">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.5px] text-[#071f3f] sm:text-[28px]">
          Welcome back, {firstName} 👋
        </h1>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {children}
          <ClassActionRow navigate={navigate} />
          {leftExtra}
        </div>

        <QuickLinkCards navigate={navigate} accountRoute={accountRoute} />
      </div>
    </div>
  );
}
