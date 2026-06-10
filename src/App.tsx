import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import UtmCapture from "@/components/UtmCapture";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";
import AdminSidebarLayout from "@/components/admin/AdminSidebarLayout";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
// Lazy load pages for code splitting
const Switch = lazy(() => import("./pages/Switch"));
const Servers = lazy(() => import("./pages/Servers"));
const Index = lazy(() => import("./pages/Index"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Support = lazy(() => import("./pages/Support"));
const SignIn = lazy(() => import("./pages/SignIn"));
const MagicLinkRequest = lazy(() => import("./pages/MagicLinkRequest"));
const MagicLinkVerify = lazy(() => import("./pages/MagicLinkVerify"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Reactivate = lazy(() => import("./pages/Reactivate"));
const ContextualEmailUnsubscribe = lazy(
  () => import("./pages/ContextualEmailUnsubscribe"),
);
const ReferralLanding = lazy(() => import("./pages/ReferralLanding"));
const Referrals = lazy(() => import("./pages/Referrals"));
const Perks = lazy(() => import("./pages/Perks"));
const Subscribe = lazy(() => import("./pages/Subscribe"));
const Account = lazy(() => import("./pages/Account"));
const UpgradeAnnual = lazy(() => import("./pages/UpgradeAnnual"));
const SubscriptionHistory = lazy(() => import("./pages/SubscriptionHistory"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const AuthDebug = lazy(() => import("./pages/AuthDebug"));
const AppleDebug = lazy(() => import("./pages/AppleDebug"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MembershipTransferAdmin = lazy(
  () => import("./pages/admin/MembershipTransferAdmin"),
);
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminDomainInsights = lazy(
  () => import("./pages/admin/AdminDomainInsights"),
);
const AdminPerks = lazy(() => import("./pages/admin/AdminPerks"));
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
const AdminUserSessions = lazy(
  () => import("./pages/admin/AdminUserSessions"),
);
const AdminUtmAttribution = lazy(
  () => import("./pages/admin/AdminUtmAttribution"),
);
const AdminBroadcastEmail = lazy(
  () => import("./pages/admin/AdminBroadcastEmail"),
);
const AdminUserProfiles = lazy(
  () => import("./pages/admin/AdminUserProfiles"),
);
const AdminSignupSources = lazy(
  () => import("./pages/admin/AdminSignupSources"),
);

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <UtmCapture />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/switch" element={<Switch />} />
              <Route path="/servers" element={<Servers />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/support" element={<Support />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signin/magic" element={<MagicLinkRequest />} />
              <Route path="/auth/magic" element={<MagicLinkVerify />} />
              <Route path="/auth/verify-email" element={<VerifyEmail />} />
              <Route path="/reactivate" element={<Reactivate />} />
              <Route
                path="/email/unsubscribe"
                element={<ContextualEmailUnsubscribe />}
              />
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
              <Route path="/success" element={<PaymentSuccess />} />
              <Route path="/cancel" element={<PaymentCancel />} />
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
                <Route path="user-profiles" element={<AdminUserProfiles />} />
                <Route path="signup-sources" element={<AdminSignupSources />} />
                <Route
                  path="connection-engagement"
                  element={<AdminConnectionEngagement />}
                />
                <Route
                  path="membership-transfer"
                  element={<MembershipTransferAdmin />}
                />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="churn" element={<AdminChurn />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="utm-attribution" element={<AdminUtmAttribution />} />
                <Route path="broadcast-email" element={<AdminBroadcastEmail />} />
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
