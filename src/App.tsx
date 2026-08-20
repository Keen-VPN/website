import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import UtmCapture from "@/components/UtmCapture";
import RedditPixelTracker from "@/components/RedditPixelTracker";
import ProtectedRoute from "@/components/ProtectedRoute";
import MarketingSiteRedirect from "@/components/MarketingSiteRedirect";
import { resolvePricingRouteDestination } from "@/auth/pricing-route";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";
import AdminSidebarLayout from "@/components/admin/AdminSidebarLayout";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
// Lazy load pages for code splitting
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const Pricing = lazy(() => import("./pages/Pricing"));
const SignIn = lazy(() => import("./pages/SignIn"));
const MagicLinkRequest = lazy(() => import("./pages/MagicLinkRequest"));
const MagicLinkVerify = lazy(() => import("./pages/MagicLinkVerify"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ChangeAuthEmail = lazy(() => import("./pages/ChangeAuthEmail"));
const Reactivate = lazy(() => import("./pages/Reactivate"));
const EmailPreferences = lazy(() => import("./pages/EmailPreferences"));
const ContextualEmailUnsubscribe = lazy(
  () => import("./pages/ContextualEmailUnsubscribe"),
);
const ReferralLanding = lazy(() => import("./pages/ReferralLanding"));
const Referrals = lazy(() => import("./pages/Referrals"));
const Friends = lazy(() => import("./pages/Friends"));
const FriendsAccept = lazy(() => import("./pages/FriendsAccept"));
const FriendsJoin = lazy(() => import("./pages/FriendsJoin"));
const Perks = lazy(() => import("./pages/Perks"));
const Subscribe = lazy(() => import("./pages/Subscribe"));
const Account = lazy(() => import("./pages/Account"));
const MembershipSharingAccept = lazy(
  () => import("./pages/MembershipSharingAccept"),
);
const UpgradeAnnual = lazy(() => import("./pages/UpgradeAnnual"));
const SubscriptionHistory = lazy(() => import("./pages/SubscriptionHistory"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const OpenApp = lazy(() => import("./pages/OpenApp"));
const AuthDebug = lazy(() => import("./pages/AuthDebug"));
const AppleDebug = lazy(() => import("./pages/AppleDebug"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MembershipTransferAdmin = lazy(
  () => import("./pages/admin/MembershipTransferAdmin"),
);
const AdminMembershipSharing = lazy(
  () => import("./pages/admin/AdminMembershipSharing"),
);
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminDomainInsights = lazy(
  () => import("./pages/admin/AdminDomainInsights"),
);
const AdminPerks = lazy(() => import("./pages/admin/AdminPerks"));
const AdminHotLinks = lazy(() => import("./pages/admin/AdminHotLinks"));
const AdminAffiliateLinks = lazy(
  () => import("./pages/admin/AdminAffiliateLinks"),
);
const AdminPerkRequests = lazy(() => import("./pages/admin/AdminPerkRequests"));
const AdminProductEvents = lazy(
  () => import("./pages/admin/AdminProductEvents"),
);
const AdminConnectionEngagement = lazy(
  () => import("./pages/admin/AdminConnectionEngagement"),
);
const AdminSubscriptions = lazy(
  () => import("./pages/admin/AdminSubscriptions"),
);
const AdminChurn = lazy(() => import("./pages/admin/AdminChurn"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserProfile = lazy(
  () => import("./pages/admin/AdminUserProfile"),
);
const AdminUserSessions = lazy(
  () => import("./pages/admin/AdminUserSessions"),
);
const AdminUtmAttribution = lazy(
  () => import("./pages/admin/AdminUtmAttribution"),
);
const AdminStickerCampaigns = lazy(
  () => import("./pages/admin/AdminStickerCampaigns"),
);
const AdminBroadcastEmail = lazy(
  () => import("./pages/admin/AdminBroadcastEmail"),
);
const AdminEmailUnsubscribes = lazy(
  () => import("./pages/admin/AdminEmailUnsubscribes"),
);
const AdminUserProfiles = lazy(
  () => import("./pages/admin/AdminUserProfiles"),
);
const AdminSignupSources = lazy(
  () => import("./pages/admin/AdminSignupSources"),
);
const AdminWorkflows = lazy(() => import("./pages/admin/AdminWorkflows"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const PricingRoute = () => {
  const { search } = useLocation();
  const { user, loading, hasSessionToken } = useAuth();
  const destination = resolvePricingRouteDestination({
    hasUser: Boolean(user),
    hasSessionToken,
    authLoading: loading,
    search,
  });

  if (destination === "loading") {
    return <PageLoader />;
  }

  return destination === "portal" ? (
    <Pricing />
  ) : (
    <MarketingSiteRedirect path="/pricing.html" />
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <UtmCapture />
          <RedditPixelTracker />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<MarketingSiteRedirect />} />
              <Route
                path="/switch"
                element={<MarketingSiteRedirect path="/transfer.html" />}
              />
              <Route
                path="/servers"
                element={<MarketingSiteRedirect path="/server-locations/" />}
              />
              <Route
                path="/pricing"
                element={<PricingRoute />}
              />
              <Route
                path="/privacy"
                element={<MarketingSiteRedirect path="/privacy.html" />}
              />
              <Route
                path="/terms"
                element={<MarketingSiteRedirect path="/terms.html" />}
              />
              <Route
                path="/support"
                element={<MarketingSiteRedirect path="/#faq" />}
              />
              {/* Public, no auth guard: Play requires this URL to work for users
                  who can no longer sign in or no longer have the app installed. */}
              <Route path="/delete-account" element={<DeleteAccount />} />
              <Route
                path="/my-ip-address"
                element={<MarketingSiteRedirect path="/my-ip-address" />}
              />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signin/magic" element={<MagicLinkRequest />} />
              <Route path="/auth/magic" element={<MagicLinkVerify />} />
              <Route path="/auth/verify-email" element={<VerifyEmail />} />
              <Route path="/auth/change-email" element={<ChangeAuthEmail />} />
              <Route path="/reactivate" element={<Reactivate />} />
              <Route
                path="/email/unsubscribe"
                element={<ContextualEmailUnsubscribe />}
              />
              <Route path="/email/preferences" element={<EmailPreferences />} />
              <Route path="/r/:token" element={<ReferralLanding />} />
              <Route
                path="/referrals"
                element={
                  <ProtectedRoute>
                    <Referrals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/friends"
                element={
                  <ProtectedRoute>
                    <Friends />
                  </ProtectedRoute>
                }
              />
              <Route path="/friends/accept" element={<FriendsAccept />} />
              <Route path="/friends/join/:token" element={<FriendsJoin />} />
              <Route
                path="/perks"
                element={
                  <ProtectedRoute>
                    <Perks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscribe"
                element={
                  <ProtectedRoute>
                    <Subscribe />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <Account />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upgrade-annual"
                element={
                  <ProtectedRoute>
                    <UpgradeAnnual />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account/subscription-history"
                element={
                  <ProtectedRoute>
                    <SubscriptionHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account/membership-sharing/accept"
                element={<MembershipSharingAccept />}
              />
              <Route path="/success" element={<PaymentSuccess />} />
              <Route path="/cancel" element={<PaymentCancel />} />
              <Route path="/open-app" element={<OpenApp />} />
              <Route path="/auth/debug" element={<AuthDebug />} />
              <Route path="/apple/debug" element={<AppleDebug />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <AdminAuthProvider>
                    <AdminProtectedRoute>
                      <AdminSidebarLayout />
                    </AdminProtectedRoute>
                  </AdminAuthProvider>
                }
              >
                <Route
                  index
                  element={<Navigate to="/admin/overview" replace />}
                />
                <Route path="overview" element={<AdminOverview />} />
                <Route path="users/:userId" element={<AdminUserProfile />} />
                <Route
                  path="user-sessions/:userId"
                  element={<AdminUserSessions />}
                />
                <Route path="product-events" element={<AdminProductEvents />} />
                <Route
                  path="domain-insights"
                  element={<AdminDomainInsights />}
                />
                <Route path="perks" element={<AdminPerks />} />
                <Route path="hot-links" element={<AdminHotLinks />} />
                <Route
                  path="affiliate-links"
                  element={<AdminAffiliateLinks />}
                />
                <Route path="perk-requests" element={<AdminPerkRequests />} />
                <Route path="user-profiles" element={<AdminUserProfiles />} />
                <Route path="workflows" element={<AdminWorkflows />} />
                <Route path="signup-sources" element={<AdminSignupSources />} />
                <Route
                  path="connection-engagement"
                  element={<AdminConnectionEngagement />}
                />
                <Route
                  path="membership-transfer"
                  element={<MembershipTransferAdmin />}
                />
                <Route
                  path="membership-sharing"
                  element={<AdminMembershipSharing />}
                />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="churn" element={<AdminChurn />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="utm-attribution" element={<AdminUtmAttribution />} />
                <Route
                  path="sticker-campaigns"
                  element={<AdminStickerCampaigns />}
                />
                <Route path="broadcast-email" element={<AdminBroadcastEmail />} />
                <Route
                  path="email-unsubscribes"
                  element={<AdminEmailUnsubscribes />}
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
