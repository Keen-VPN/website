import {
  ArrowRightLeft,
  Gauge,
  MessageSquareText,
  Share2,
} from "lucide-react";

const productHighlights = [
  {
    icon: ArrowRightLeft,
    title: "Membership Transfer",
    description:
      "Switch from another VPN without wasting paid time. Submit your current plan details and we’ll review the remaining time.",
  },
  {
    icon: Share2,
    title: "Referral Link Sharing",
    description:
      "Share KeenVPN with people you trust using a simple referral link when the referral experience is available.",
  },
  {
    icon: MessageSquareText,
    title: "OTPBuddy",
    description:
      "A companion tool that helps route one-time passcodes from email to SMS, so important login codes are easier to receive.",
  },
  {
    icon: Gauge,
    title: "Connection Speed",
    description:
      "See speed context before connecting and after the VPN is active, so the connection experience feels clear.",
  },
];

const ProductHighlights = () => {
  return (
    <section className="bg-background py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                More ways KeenVPN works for you
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                From switching providers to sharing referrals, receiving OTP
                codes, and checking connection speed, KeenVPN gives you more
                control over the VPN experience.
              </p>
            </div>

            <div className="divide-y divide-border border-y border-border">
              {productHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="grid grid-cols-[auto_1fr] gap-4 py-6"
                  >
                    <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductHighlights;
