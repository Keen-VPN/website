import { ArrowRight, CheckCircle2, Zap } from "lucide-react";

const FEATURES = [
  {
    title: "Find eligible claims",
    desc: "See settlements that may apply to you.",
    icon: CheckCircle2,
  },
  {
    title: "Follow simple steps",
    desc: "Clear guidance from discovery to submission.",
    icon: ArrowRight,
  },
  {
    title: "Track everything",
    desc: "View status, deadlines, and claim activity.",
    icon: Zap,
  },
] as const;

export default function DashboardClassAction() {
  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
      {/*
        Top-aligned two-column layout: left copy is intentionally shorter;
        the illustration on the right is taller and extends below the notice bar.
      */}
      <div className="mx-auto flex w-full max-w-[1140px] flex-col gap-10 lg:flex-row lg:items-start lg:gap-12 xl:gap-14">
        {/* Left — shorter content stack */}
        <div className="min-w-0 flex-1 lg:max-w-[520px]">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#fff4eb] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.8px] text-[#ed7d36]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ed7d36]" />
            Class Action
          </span>

          <h1 className="mt-4 text-[36px] font-bold leading-[1.1] tracking-[-1px] text-[#0f2040] sm:text-[42px]">
            Claims are
            <br />
            <span className="text-[#ed7d36]">coming soon.</span>
          </h1>

          <p className="mt-4 max-w-[460px] text-[15px] leading-[1.6] text-[#6b7890]">
            We&apos;re creating a simpler way to discover class action
            settlements you may qualify for, understand what they mean, and keep
            track of every claim from one place inside KeenVPN.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {FEATURES.map(({ title, desc, icon: Icon }) => (
              <div
                key={title}
                className="rounded-[12px] border border-[#e7edf5] bg-white px-3.5 py-3.5 shadow-[0_2px_8px_rgba(15,32,64,0.04)]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#fff4eb]">
                  <Icon className="h-4 w-4 text-[#ed7d36]" strokeWidth={2.5} />
                </div>
                <p className="mt-2.5 text-[13px] font-semibold leading-snug text-[#0f2040]">
                  {title}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#627086]">
                  {desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-[12px] border border-[#eadfcf] bg-[#fffaf3] px-4 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#0f2040] text-[13px] font-bold text-white">
              K
            </div>
            <p className="text-[13px] leading-relaxed text-[#43516a]">
              You don&apos;t need to do anything yet. When Class Action launches,
              available settlements will appear here automatically.
            </p>
          </div>
        </div>

        {/* Right — exact Figma illustration; clip JPEG's square black corner fill */}
        <div className="mx-auto w-full max-w-[440px] shrink-0 overflow-hidden rounded-[28px] lg:mx-0 lg:w-[440px] xl:w-[480px]">
          <img
            src="/dashboard/class-action-hero.png?v=3"
            alt="Class Action preview — deadlines, claim status, and settlement alerts"
            className="block h-auto w-full select-none"
            width={865}
            height={1024}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
