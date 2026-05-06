import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MembershipTransferPromo = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-background pb-4">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="max-w-5xl mx-auto rounded-lg border border-accent/30 bg-gradient-card p-5 shadow-card md:flex md:items-center md:justify-between md:gap-8 md:p-6">
          <div className="flex items-start gap-3 text-left md:gap-4">
            <div className="rounded-lg bg-primary/20 p-2.5 text-primary md:p-3">
              <ShieldCheck className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-primary">
                Switch without losing paid time
              </p>
              <h2 className="text-xl font-bold leading-tight text-foreground md:text-2xl">
                Already have a VPN? We’ll match your remaining time.
              </h2>
              <p className="mt-3 text-muted-foreground">
                We’ll match whatever time you have left on your current VPN at
                no extra cost.
              </p>
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Reviewed within 24 hours
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/pricing")}
            className="mt-6 w-full bg-primary text-primary-foreground hover:bg-primary/90 md:mt-0 md:w-auto md:flex-shrink-0"
            size="lg"
          >
            Switch to KeenVPN
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default MembershipTransferPromo;
