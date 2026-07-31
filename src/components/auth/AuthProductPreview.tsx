import {
  BarChart3,
  Gift,
  Globe2,
  LockKeyhole,
  MapPin,
  Settings,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { serverLocations } from "@/constants/server-locations";

const previewLocations = Array.from(
  new Map(
    serverLocations
      .filter((location) => location.available)
      .map((location) => [location.countryCode, location]),
  ).values(),
).slice(0, 7);

const networkNodes = [
  { left: "18%", top: "34%", delay: "0ms" },
  { left: "31%", top: "48%", delay: "180ms" },
  { left: "46%", top: "29%", delay: "360ms" },
  { left: "56%", top: "55%", delay: "540ms" },
  { left: "67%", top: "38%", delay: "720ms" },
  { left: "78%", top: "61%", delay: "900ms" },
  { left: "86%", top: "27%", delay: "1080ms" },
];

export default function AuthProductPreview() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#e9e0ce] lg:flex lg:flex-col lg:justify-center lg:px-8 lg:py-12 xl:px-12">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 18%, rgba(232,92,4,0.14), transparent 24%), radial-gradient(circle at 82% 80%, rgba(58,124,165,0.2), transparent 30%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[820px]">
        <div className="mb-7 max-w-xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#0f2040]/10 bg-white/55 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#0f2040] backdrop-blur">
            <ShieldCheck className="h-4 w-4 text-[#e85c04]" />
            Private by design
          </div>
          <h2 className="text-3xl font-bold tracking-[-0.035em] text-[#0f2040] xl:text-4xl">
            One secure connection. A world of possibilities.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-[#4f5968] xl:text-base">
            Connect to trusted KeenVPN locations and keep your online activity
            protected wherever you go.
          </p>
        </div>

        <div
          aria-hidden="true"
          className="rounded-[2rem] border border-white/80 bg-[#f7f4ed] p-2.5 shadow-[0_30px_80px_rgba(15,32,64,0.24)] xl:rounded-[2.5rem] xl:p-3"
        >
          <div className="overflow-hidden rounded-[1.45rem] border border-white/10 bg-[#081827] xl:rounded-[1.9rem]">
            <div className="flex h-10 items-center justify-between border-b border-white/10 bg-[#091426] px-4 text-[10px] text-white/70">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-3.5 w-3.5 text-emerald-400" />
                <span>Protected</span>
                <span className="text-white/35">•</span>
                <span>53 Mbps</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-white">
                <img src="/logo-white.png" alt="" className="h-4 w-4" />
                KeenVPN
              </div>
            </div>

            <div className="grid min-h-[430px] grid-cols-[56px_170px_minmax(0,1fr)] xl:min-h-[500px] xl:grid-cols-[64px_210px_minmax(0,1fr)]">
              <div className="flex flex-col items-center gap-4 border-r border-white/10 bg-[#0b1727] py-5">
                <div className="rounded-xl bg-[#3a7ca5]/25 p-2.5 text-[#8cc5e8]">
                  <Globe2 className="h-5 w-5" />
                </div>
                <BarChart3 className="h-5 w-5 text-white/45" />
                <Gift className="h-5 w-5 text-white/45" />
                <Settings className="h-5 w-5 text-white/45" />
                <div className="mt-auto rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-2.5 text-emerald-300">
                  <Wifi className="h-5 w-5" />
                </div>
              </div>

              <div className="border-r border-white/10 bg-[#101c2b] p-3 xl:p-4">
                <div className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-white/45">
                  Search locations
                </div>
                <p className="mb-2 px-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                  Locations
                </p>
                <div className="space-y-2">
                  {previewLocations.map((location, index) => (
                    <div
                      key={location.id}
                      className={`rounded-lg border px-2.5 py-2 ${
                        index === 0
                          ? "border-[#3a7ca5]/45 bg-[#3a7ca5]/20"
                          : "border-white/5 bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[7px] font-bold text-white/75">
                          {location.countryCode}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-semibold text-white/85 xl:text-[11px]">
                            {location.country}
                          </p>
                          <p className="truncate text-[8px] text-white/35 xl:text-[9px]">
                            {location.city}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden bg-[#092130]">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-35"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                    backgroundSize: "42px 42px",
                  }}
                />
                <Globe2
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 h-[310px] w-[310px] -translate-x-1/2 -translate-y-1/2 text-[#6d8295]/25 xl:h-[390px] xl:w-[390px]"
                  strokeWidth={0.75}
                />
                <div className="absolute inset-x-[12%] top-1/2 h-px -rotate-12 bg-gradient-to-r from-transparent via-[#3a7ca5]/55 to-transparent" />
                <div className="absolute inset-y-[16%] left-1/2 w-px rotate-[28deg] bg-gradient-to-b from-transparent via-[#e85c04]/45 to-transparent" />

                {networkNodes.map((node, index) => (
                  <div
                    key={`${node.left}-${node.top}`}
                    className="absolute"
                    style={{ left: node.left, top: node.top }}
                  >
                    <span
                      className={`absolute -inset-2 animate-ping rounded-full opacity-40 motion-reduce:animate-none ${
                        index === 3 ? "bg-[#e85c04]" : "bg-sky-400"
                      }`}
                      style={{ animationDelay: node.delay }}
                    />
                    <span
                      className={`relative block h-2.5 w-2.5 rounded-full border border-white/60 shadow-[0_0_16px_currentColor] ${
                        index === 3
                          ? "bg-[#e85c04] text-[#e85c04]"
                          : "bg-sky-400 text-sky-400"
                      }`}
                    />
                  </div>
                ))}

                <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-emerald-300/20 bg-[#06131e]/80 px-4 py-2 text-[10px] font-semibold text-emerald-300 shadow-xl backdrop-blur">
                  <MapPin className="h-3.5 w-3.5" />
                  Connected securely
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
