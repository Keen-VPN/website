import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  LogOut,
  Shield,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  History,
  RefreshCw,
  Mail,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { deleteAccount, getSessionToken } from "@/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "https://vpnkeen.netlify.app/api";

const Account = () => {
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, logout, subscription, refreshSubscription } =
    useAuth();

  useEffect(() => {
    if (!loading && user) {
      const urlParams = new URLSearchParams(window.location.search);
      const isASWebSession =
        urlParams.get("asweb") === "1" ||
        sessionStorage.getItem("asweb_session") === "1";

      if (isASWebSession && urlParams.get("asweb") === "1") {
        sessionStorage.setItem("asweb_session", "1");
      }
    }
  }, [user, loading]);

  const handleRefreshSubscription = async () => {
    setSubscriptionLoading(true);
    await refreshSubscription();
    setSubscriptionLoading(false);
  };

  const handleCancelSubscription = async () => {
    if (!user) return;
    try {
      setCancelling(true);
      const idToken = await user.getIdToken();
      const response = await fetch(`${BACKEND_URL}/subscription/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: "Subscription Cancelled",
          description: "Your session will remain active until the end of your billing period.",
        });
        await refreshSubscription();
      } else {
        throw new Error(data.error || "Failed to cancel subscription");
      }
    } catch (error) {
      toast({
        title: "Cancellation Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.email || !user?.uid) return;
    try {
      setDeleting(true);
      const result = await deleteAccount(user.email, user.uid);
      if (result.success) {
        toast({ title: "Account Deleted", description: "All data has been wiped." });
        await logout();
        navigate("/");
      } else {
        throw new Error(result.error || "Failed to delete account");
      }
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Zap className="h-10 w-10 text-primary animate-pulse mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Authorizing Session...</p>
      </div>
    );
  }

  if (!user) {
    navigate("/signin");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Dashboard Header */}
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-secondary/10 border border-secondary/20 mb-4">
                <Shield className="h-3 w-3 text-secondary" />
                <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Command Center</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tighter">My <span className="text-primary italic">Account.</span></h1>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-card/30 border border-border/50">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-black uppercase">{user.email?.charAt(0)}</span>
              </div>
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Active Session</p>
                <p className="text-sm font-bold truncate max-w-[200px]">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Primary Stats & Subscription */}
            <div className="lg:col-span-8 space-y-8">
              <Card className="border-border/50 bg-card/30 backdrop-blur-md rounded-[2rem] overflow-hidden">
                <CardHeader className="border-b border-border/50 p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-black uppercase tracking-tight">Subscription</CardTitle>
                      <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">Status and management</CardDescription>
                    </div>
                    {subscription?.status === "active" ? (
                      <Badge className="bg-secondary text-secondary-foreground font-black px-4 py-1.5 rounded-lg uppercase tracking-tighter">Premium Active</Badge>
                    ) : (
                      <Badge variant="outline" className="font-black px-4 py-1.5 rounded-lg uppercase tracking-tighter">No Active Plan</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  {subscriptionLoading ? (
                    <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : subscription ? (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 rounded-2xl bg-muted/30 border border-border/50">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Current Tier</p>
                          <p className="text-xl font-black text-foreground">{subscription.plan || "Individual"}</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-muted/30 border border-border/50">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Next Invoice</p>
                          <p className="text-xl font-black text-foreground">{formatDate(subscription.endDate)}</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-muted/30 border border-border/50">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Auto-Renew</p>
                          <p className={`text-xl font-black ${subscription.cancelAtPeriodEnd ? "text-rose-500" : "text-secondary"}`}>
                            {subscription.cancelAtPeriodEnd ? "Disabled" : "Active"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 pt-4">
                        <Button
                          onClick={() => navigate("/account/subscription-history")}
                          variant="outline"
                          className="h-12 px-6 rounded-xl border-2 font-black text-xs uppercase tracking-widest"
                        >
                          <History className="h-4 w-4 mr-2" />
                          Billing History
                        </Button>
                        <Button
                          onClick={handleRefreshSubscription}
                          variant="ghost"
                          className="h-12 px-6 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 hover:text-primary"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${subscriptionLoading ? 'animate-spin' : ''}`} />
                          Refresh Sync
                        </Button>
                        
                        {subscription.status === "active" && !subscription.cancelAtPeriodEnd && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" className="h-12 px-6 rounded-xl font-black text-xs uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-500/5">
                                Cancel Plan
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2rem] border-border/50 p-8">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-black tracking-tight uppercase">Wait. You'll lose access to:</AlertDialogTitle>
                                <AlertDialogDescription className="pt-4">
                                  <ul className="space-y-3">
                                    <li className="flex items-center gap-2 text-foreground font-bold"><XCircle className="h-4 w-4 text-rose-500" /> 10Gbps Dedicated Deal Nodes</li>
                                    <li className="flex items-center gap-2 text-foreground font-bold"><XCircle className="h-4 w-4 text-rose-500" /> DNS-Level Ad & Tracker Blocking</li>
                                    <li className="flex items-center gap-2 text-foreground font-bold"><XCircle className="h-4 w-4 text-rose-500" /> Regional Price Discovery Engine</li>
                                  </ul>
                                  <p className="mt-6 font-medium text-slate-500">Your plan will remain active until {formatDate(subscription.endDate)} if you proceed.</p>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="pt-8">
                                <AlertDialogCancel className="rounded-xl font-bold h-12">Keep Sovereignty</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelSubscription} className="bg-rose-500 text-white rounded-xl font-black h-12 px-8">Confirm Cancellation</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ) : (
                      <div className="text-center py-12 space-y-6">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active sovereignty detected.</p>
                        <Button onClick={() => navigate("/pricing")} variant="glow" size="lg">
                          Get Premium Protection
                        </Button>
                      </div>
                  )}
                </CardContent>
              </Card>

              {/* Security Insights Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-border/50 bg-card/30 backdrop-blur-md rounded-[2rem]">
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">System Logs</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 pt-0 space-y-4">
                    <div className="font-mono text-[10px] space-y-1 text-slate-500">
                      <p>[SYSTEM] Session established via {user.providerId || "google.com"}</p>
                      <p>[SECURITY] Blind-signatures active</p>
                      <p>[ACCOUNT] ID: {user.uid.substring(0, 12)}...</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/30 backdrop-blur-md rounded-[2rem]">
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Support Access</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 pt-0">
                    <Button variant="outline" className="w-full h-12 rounded-xl border-2 font-black text-xs uppercase tracking-widest" onClick={() => window.location.href = "mailto:support@vpnkeen.com"}>
                      <Mail className="h-4 w-4 mr-2" />
                      Contact Intelligence
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Column: Danger Zone & Actions */}
            <div className="lg:col-span-4 space-y-8">
              <div className="p-8 rounded-[2.5rem] bg-slate-900 border border-white/5 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary">Sovereignty Controls</h3>
                <Button onClick={logout} variant="outline" className="w-full h-12 rounded-xl border-white/10 hover:bg-white/5 font-black text-xs uppercase tracking-widest">
                  <LogOut className="h-4 w-4 mr-2" /> Terminate Session
                </Button>
                
                <div className="pt-6 border-t border-white/5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-4">Danger Zone</h4>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="w-full h-12 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/5 font-black text-xs uppercase tracking-widest text-left justify-start px-0">
                        <Trash2 className="h-4 w-4 mr-2" /> Wipe Account Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2rem] border-rose-500/20 p-8">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tight text-rose-500 uppercase">Irreversible Data Wipe</AlertDialogTitle>
                        <AlertDialogDescription className="pt-4 space-y-4">
                          <p className="font-bold text-foreground">This will permanently delete your identity and all associated sovereignty records.</p>
                          <div className="p-4 bg-rose-500/5 rounded-xl border border-rose-500/20 text-rose-200 text-xs leading-relaxed">
                            Once confirmed, your email, billing references, and preferences will be purged from our zero-knowledge database.
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="pt-8">
                        <AlertDialogCancel className="rounded-xl font-bold h-12">Abort</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} className="bg-rose-500 text-white rounded-xl font-black h-12 px-8">Confirm Deletion</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-primary">Pro Tip</span>
                </div>
                <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-tighter">
                  Use the browser extension to automatically detect regional price drops while you browse.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Account;
