import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Link2, Lock, UserRound, Users } from "lucide-react";
import { LinkedAccounts } from "@/components/LinkedAccounts";
import { MembershipSharingCard } from "@/components/MembershipSharingCard";
import { ConnectedDevicesCard } from "@/components/ConnectedDevicesCard";
import { WorkflowsCard } from "@/components/WorkflowsCard";
import { SecureVaultCard } from "@/components/SecureVaultCard";
import { AiAssistantCard } from "@/components/AiAssistantCard";
import { UserInformationCard } from "@/components/UserInformationCard";
import { EmailPreferencesCard } from "@/components/EmailPreferencesCard";
import { cn } from "@/lib/utils";
import { trackWorkspaceEvent } from "@/lib/product-analytics";
import { useToast } from "@/hooks/use-toast";

export type AccountWorkspaceTab = "perks" | "vault" | "profile" | "connections";

const TAB_HASH: Record<string, AccountWorkspaceTab> = {
  vault: "vault",
  applications: "perks",
};

const TAB_QUERY: Record<string, AccountWorkspaceTab> = {
  perks: "perks",
  applications: "perks",
  vault: "vault",
  profile: "profile",
  connections: "connections",
};

const TAB_META: Record<
  AccountWorkspaceTab,
  { label: string; description: string; icon: typeof Gift }
> = {
  perks: {
    label: "Perks",
    description: "Applications and your AI assistant",
    icon: Gift,
  },
  vault: {
    label: "Vault",
    description: "Encrypted personal details for perks",
    icon: Lock,
  },
  profile: {
    label: "Profile",
    description: "Your information and email preferences",
    icon: UserRound,
  },
  connections: {
    label: "Connections",
    description: "Linked accounts, devices, and sharing",
    icon: Link2,
  },
};

const WORKSPACE_BODY_HEIGHT =
  "h-[min(28rem,calc(100dvh-20rem))] sm:h-[min(32rem,calc(100dvh-18rem))]";

function resolveTabFromLocation(
  search: string,
  hash: string,
): AccountWorkspaceTab {
  const params = new URLSearchParams(search);
  if (
    params.get("tab") === "connections" ||
    params.get("business") === "upgraded"
  ) {
    return "connections";
  }

  const hashKey = hash.replace(/^#/, "");
  if (hashKey && TAB_HASH[hashKey]) {
    return TAB_HASH[hashKey];
  }

  const queryTab = new URLSearchParams(search).get("tab");
  if (queryTab && TAB_QUERY[queryTab]) {
    return TAB_QUERY[queryTab];
  }

  return "perks";
}

function tabFromHash(hash: string): AccountWorkspaceTab | null {
  const hashKey = hash.replace(/^#/, "");
  if (hashKey && TAB_HASH[hashKey]) {
    return TAB_HASH[hashKey];
  }
  return null;
}

function hashForTab(tab: AccountWorkspaceTab): string | null {
  if (tab === "vault") return "vault";
  if (tab === "perks") return "applications";
  return null;
}

interface AccountWorkspaceProps {
  sessionToken: string;
  authProvider?: string;
  linkedProviders: {
    google: { linked: boolean; email?: string };
    apple: { linked: boolean; email?: string };
  } | null;
  onLinkedAccountsUpdate: () => void;
}

export function AccountWorkspace({
  sessionToken,
  authProvider,
  linkedProviders,
  onLinkedAccountsUpdate,
}: AccountWorkspaceProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const impressionTrackedRef = useRef(false);
  const businessUpgradeHandledRef = useRef(false);
  const [activeTab, setActiveTab] = useState<AccountWorkspaceTab>(() =>
    resolveTabFromLocation(location.search, location.hash),
  );
  const lastTrackedTabRef = useRef<AccountWorkspaceTab>(activeTab);
  const [mountedTabs, setMountedTabs] = useState<Set<AccountWorkspaceTab>>(
    () => new Set([resolveTabFromLocation(location.search, location.hash)]),
  );

  useEffect(() => {
    if (impressionTrackedRef.current) return;
    impressionTrackedRef.current = true;
    trackWorkspaceEvent("workspace_impression", {
      entry_section: activeTab,
      navigation_path: `${location.pathname}${location.search}${location.hash}`,
    });
  }, [activeTab, location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (lastTrackedTabRef.current === activeTab) return;
    lastTrackedTabRef.current = activeTab;
    trackWorkspaceEvent("workspace_feature_opened", {
      section: activeTab,
      navigation_path: `${location.pathname}${location.search}${location.hash}`,
    });
  }, [activeTab, location.hash, location.pathname, location.search]);

  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("business") !== "upgraded") return;

    if (!businessUpgradeHandledRef.current) {
      businessUpgradeHandledRef.current = true;
      toast({
        title: "Business plan updated",
        description:
          "Invite your teammates in the Team section — you are charged when they accept.",
      });
    }

    params.set("tab", "connections");
    params.delete("business");
    const nextSearch = params.toString();
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`, {
      replace: true,
    });
  }, [location.hash, location.pathname, location.search, navigate, toast]);

  const syncLocationToTab = useCallback(
    (tab: AccountWorkspaceTab) => {
      const params = new URLSearchParams(location.search);
      params.set("tab", tab);
      params.delete("business");
      const nextHash = hashForTab(tab);
      const nextSearch = params.toString();
      const nextUrl = `${location.pathname}?${nextSearch}${
        nextHash ? `#${nextHash}` : ""
      }`;
      navigate(nextUrl, { replace: true });
    },
    [location.pathname, location.search, navigate],
  );

  useEffect(() => {
    const nextTab = resolveTabFromLocation(location.search, location.hash);
    setActiveTab((current) => (current === nextTab ? current : nextTab));

    const params = new URLSearchParams(location.search);
    if (params.get("business") === "upgraded") return;

    const hashTab = tabFromHash(location.hash);
    if (!hashTab) return;

    const queryTab = params.get("tab");
    if (queryTab === hashTab) return;

    params.set("tab", hashTab);
    const nextHash = hashForTab(hashTab);
    navigate(
      `${location.pathname}?${params.toString()}${
        nextHash ? `#${nextHash}` : ""
      }`,
      { replace: true },
    );
  }, [location.search, location.hash, location.pathname, navigate]);

  useEffect(() => {
    const hashKey = location.hash.replace(/^#/, "");
    if (!hashKey || !TAB_HASH[hashKey]) return;

    const anchor = document.getElementById(hashKey);
    if (!anchor) return;

    const frame = window.requestAnimationFrame(() => {
      anchor.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, activeTab]);

  useEffect(() => {
    const activePanel = bodyScrollRef.current?.querySelector<HTMLElement>(
      '[role="tabpanel"][data-state="active"]',
    );
    activePanel?.scrollTo({ top: 0 });
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    const tab = value as AccountWorkspaceTab;
    setActiveTab(tab);
    syncLocationToTab(tab);
  };

  const activeMeta = TAB_META[activeTab];

  const tabPanelClassName = cn(
    "absolute inset-0 mt-0 overflow-y-auto overscroll-contain p-4 sm:p-5",
    "focus-visible:outline-none",
    "data-[state=inactive]:hidden",
  );

  return (
    <Card className="mt-10 overflow-hidden border-accent/40 bg-gradient-card shadow-card">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-2xl">Workspace</CardTitle>
        <CardDescription>
          Manage perks, your secure vault, profile, and connected accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid h-10 w-full grid-cols-4 gap-1 rounded-lg bg-muted/50 p-1">
            {(Object.keys(TAB_META) as AccountWorkspaceTab[]).map((tab) => {
              const meta = TAB_META[tab];
              const Icon = meta.icon;
              return (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className={cn(
                    "flex h-8 items-center justify-center gap-1.5 rounded-md px-1.5 text-xs font-medium sm:px-2 sm:text-sm",
                    "text-muted-foreground",
                    "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                  )}
                >
                  <Icon className="hidden h-3.5 w-3.5 shrink-0 sm:block" />
                  <span className="truncate">{meta.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div
            className={cn(
              "mt-4 flex flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/15",
              WORKSPACE_BODY_HEIGHT,
            )}
          >
            <div className="shrink-0 border-b border-border/50 px-4 py-2.5 sm:px-5">
              <h3 className="text-sm font-semibold text-foreground sm:text-base">
                {activeMeta.label}
              </h3>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {activeMeta.description}
              </p>
            </div>

            <div ref={bodyScrollRef} className="relative min-h-0 flex-1">
              <TabsContent
                value="perks"
                forceMount={mountedTabs.has("perks") ? true : undefined}
                className={cn(tabPanelClassName, "space-y-4")}
              >
                <div id="applications" className="scroll-mt-24 space-y-4">
                  <WorkflowsCard sessionToken={sessionToken} />
                  <AiAssistantCard sessionToken={sessionToken} />
                </div>
              </TabsContent>

              <TabsContent
                value="vault"
                forceMount={mountedTabs.has("vault") ? true : undefined}
                className={tabPanelClassName}
              >
                <div id="vault" className="scroll-mt-24">
                  <SecureVaultCard sessionToken={sessionToken} />
                </div>
              </TabsContent>

              <TabsContent
                value="profile"
                forceMount={mountedTabs.has("profile") ? true : undefined}
                className={cn(tabPanelClassName, "space-y-4")}
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  <UserInformationCard sessionToken={sessionToken} />
                  <EmailPreferencesCard sessionToken={sessionToken} />
                </div>
              </TabsContent>

              <TabsContent
                value="connections"
                forceMount={mountedTabs.has("connections") ? true : undefined}
                className={cn(tabPanelClassName, "space-y-4")}
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  <LinkedAccounts
                    sessionToken={sessionToken}
                    currentProvider={authProvider}
                    providers={linkedProviders}
                    onUpdate={onLinkedAccountsUpdate}
                  />
                  <ConnectedDevicesCard sessionToken={sessionToken} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground sm:text-sm">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>Membership sharing for business plans</span>
                  </div>
                  <MembershipSharingCard sessionToken={sessionToken} />
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
