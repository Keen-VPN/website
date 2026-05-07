import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";
import AdminSidebarLayout from "@/components/admin/AdminSidebarLayout";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Support = lazy(() => import("./pages/Support"));
const SignIn = lazy(() => import("./pages/SignIn"));
const MagicLinkRequest = lazy(() => import("./pages/MagicLinkRequest"));
const MagicLinkVerify = lazy(() => import("./pages/MagicLinkVerify"));
const Subscribe = lazy(() => import("./pages/Subscribe"));
const Account = lazy(() => import("./pages/Account"));
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
const AdminProductEvents = lazy(
  () => import("./pages/admin/AdminProductEvents"),
);
const AdminSubscriptions = lazy(
  () => import("./pages/admin/AdminSubscriptions"),
);
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));

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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/support" element={<Support />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signin/magic" element={<MagicLinkRequest />} />
              <Route path="/auth/magic" element={<MagicLinkVerify />} />
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
                <Route path="product-events" element={<AdminProductEvents />} />
                <Route
                  path="membership-transfer"
                  element={<MembershipTransferAdmin />}
                />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="users" element={<AdminUsers />} />
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
