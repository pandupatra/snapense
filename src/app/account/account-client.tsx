"use client";

import { useEffect, useState, useCallback } from "react";
import { Crown, Loader2, Calendar, Scissors, TrendingUp, CheckCircle2, RefreshCw, CreditCard, History, User, Settings, LogOut, ArrowRight, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScanCounter } from "@/components/scan-counter";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SubscriptionInfo {
  id: string;
  type: "weekly" | "monthly" | "scan_pack_10" | "scan_pack_25";
  status: "pending" | "active" | "expired" | "cancelled";
  startedAt: string;
  expiresAt: string;
  scansIncluded: number;
  scansUsed: number;
}

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  subscriptionTier: "free" | "premium";
  premiumExpiresAt: string | null;
}

interface ScanUsage {
  scannedAt: string;
  weekIdentifier: string;
}

interface PlanInfo {
  type: "weekly" | "monthly" | "scan_pack_10" | "scan_pack_25";
  name: string;
  description: string;
  price: number;
  period: string;
  icon: string;
  gradient: string;
  features: string[];
}

const PLANS: PlanInfo[] = [
  {
    type: "weekly",
    name: "Premium Weekly",
    description: "Unlimited receipt scanning for 7 days",
    price: 5000,
    period: "/week",
    icon: "📅",
    gradient: "from-purple-500 to-indigo-500",
    features: ["Unlimited scans", "Export to CSV/Sheets", "7 days access", "Priority support"],
  },
  {
    type: "monthly",
    name: "Premium Monthly",
    description: "Best value - Unlimited everything for 30 days",
    price: 15000,
    period: "/month",
    icon: "👑",
    gradient: "from-amber-500 to-orange-500",
    features: ["Unlimited scans", "Export to CSV/Sheets", "30 days access", "Priority support", "Save 50% vs weekly"],
  },
  {
    type: "scan_pack_10",
    name: "10 Scan Pack",
    description: "One-time purchase of 10 receipt scans",
    price: 10000,
    period: "",
    icon: "📸",
    gradient: "from-cyan-500 to-blue-500",
    features: ["10 receipt scans", "No expiration", "Use anytime", "One-time purchase"],
  },
  {
    type: "scan_pack_25",
    name: "25 Scan Pack",
    description: "One-time purchase of 25 receipt scans",
    price: 25000,
    period: "",
    icon: "📸",
    gradient: "from-emerald-500 to-teal-500",
    features: ["25 receipt scans", "No expiration", "Use anytime", "Best value", "Save 17%"],
  },
];

interface AccountPageClientProps {
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  subscriptionTier: "free" | "premium";
  premiumExpiresAt: string | null;
  paymentIntentVerified: boolean;
  mayarOrderId: string | null;
}

export function AccountPageClient({
  userId,
  user,
  subscriptionTier,
  premiumExpiresAt,
  paymentIntentVerified,
  mayarOrderId,
}: AccountPageClientProps) {
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(paymentIntentVerified);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [paymentTimeout, setPaymentTimeout] = useState(false);
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch subscription info
        const subResponse = await fetch("/api/subscription");
        if (subResponse.ok) {
          const subData = await subResponse.json();
          setSubscription(subData);
        }

        // Fetch scan history
        const scanResponse = await fetch("/api/scan-history");
        if (scanResponse.ok) {
          const scanData = await scanResponse.json();
          setScanHistory(scanData.history || []);
        }
      } catch (error) {
        console.error("Error fetching account data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Check for payment return from Mayar (server-verified)
  useEffect(() => {
    if (paymentIntentVerified && mayarOrderId) {
      const checkPaymentStatus = async () => {
        try {
          const response = await fetch("/api/subscription");
          if (response.ok) {
            const subData = await response.json();
            setSubscription(subData);

            if (subData?.status === "active") {
              toast.success("Payment successful! Your subscription is now active.");
              setCheckingPayment(false);
              return true;
            }
          }
        } catch (error) {
          console.error("Error checking payment status:", error);
        }
        return false;
      };

      checkPaymentStatus();

      const pollInterval = 2000;
      const maxPollTime = 30000;
      let elapsed = 0;

      const timer = setInterval(async () => {
        elapsed += pollInterval;
        const confirmed = await checkPaymentStatus();

        if (confirmed || elapsed >= maxPollTime) {
          clearInterval(timer);
          setCheckingPayment(false);

          if (!confirmed && elapsed >= maxPollTime) {
            setPaymentTimeout(true);
          }
        }
      }, pollInterval);

      return () => clearInterval(timer);
    }
  }, [paymentIntentVerified, mayarOrderId]);

  // Manual payment status check
  const handleCheckStatus = async () => {
    if (!mayarOrderId) return;

    setCheckingStatus(true);
    try {
      const response = await fetch("/api/payment/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mayarOrderId }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.paymentStatus === "paid" || data.subscription?.status === "active") {
          toast.success("Payment confirmed! Your subscription is now active.");
          setPaymentTimeout(false);
          const subResponse = await fetch("/api/subscription");
          if (subResponse.ok) {
            const subData = await subResponse.json();
            setSubscription(subData);
          }
        } else {
          toast.info(data.message || "Payment is still being processed. Please try again in a moment.");
        }
      } else {
        toast.error(data.error || "Failed to check payment status");
      }
    } catch (error) {
      console.error("Manual check status error:", error);
      toast.error("Unable to check payment status. Please try again.");
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription || subscription.status !== "active") return;

    if (!confirm("Are you sure you want to cancel your subscription? You'll keep premium access until the end of your current billing period.")) {
      return;
    }

    setCancelling(true);

    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel subscription");
      }

      toast.success("Subscription cancelled successfully");
      setSubscription((prev) => prev ? { ...prev, status: "cancelled" as const } : null);
    } catch (error) {
      console.error("Cancel subscription error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const handleUpgrade = async (planType: PlanInfo["type"]) => {
    setUpgradingTo(planType);
    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType }),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        // Navigate to payment page
        window.location.href = data.checkoutUrl;
      } else if (data.errorType === "config" && data.error?.includes("Demo mode")) {
        // In demo mode, just show a success message
        toast.success("Demo mode: Would redirect to payment page in production");
        setUpgradingTo(null);
      } else {
        toast.error(data.error || "Failed to initiate payment");
        setUpgradingTo(null);
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Failed to initiate payment. Please try again.");
      setUpgradingTo(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPlanName = (type: string) => {
    return PLANS.find((p) => p.type === type)?.name || type;
  };

  const getPlanDetails = (type: string) => {
    return PLANS.find((p) => p.type === type);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      pending: "secondary",
      expired: "outline",
      cancelled: "outline",
    };

    const labels: Record<string, string> = {
      active: "Active",
      pending: "Pending",
      expired: "Expired",
      cancelled: "Cancelled",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPremium = subscriptionTier === "premium";
  const hasActiveSubscription = subscription?.status === "active";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0f1115] dark:to-[#1a1d24]">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
              <p className="text-muted-foreground mt-1">Manage your subscription and view your account details</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>

          {/* User Profile Card */}
          <Card className="border-none shadow-sm bg-white/50 dark:bg-gray-900/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{user.name || "User"}</h3>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <ScanCounter onClick={() => router.push("/#upgrade")} />
                  </div>
                </div>
                <div className="hidden sm:block text-right">
                  <Badge variant={isPremium ? "default" : "secondary"} className="gap-1">
                    <Crown className="h-3 w-3" />
                    {isPremium ? "Premium" : "Free"}
                  </Badge>
                  {isPremium && premiumExpiresAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Expires: {formatDate(premiumExpiresAt)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment status check */}
        {checkingPayment && (
          <Card className="mb-6 border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                  <div className="absolute inset-0 h-5 w-5 animate-ping opacity-75 rounded-full bg-amber-400/30" />
                </div>
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">Confirming your payment...</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">This usually takes a few seconds</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment timeout - show manual check option */}
        {paymentTimeout && !checkingPayment && (
          <Card className="mb-6 border-blue-500/50 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">Payment still processing</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your payment is being confirmed. You can check manually or refresh the page.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleCheckStatus}
                disabled={checkingStatus}
                size="sm"
                variant="outline"
                className="bg-white dark:bg-gray-800"
              >
                {checkingStatus ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check Status
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Subscription Section */}
        <section id="upgrade" className="mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Your Subscription</h2>
            <p className="text-muted-foreground mt-1">
              {hasActiveSubscription ? "Your current subscription details" : "Choose a plan that works for you"}
            </p>
          </div>

          {/* Active Subscription Card */}
          {hasActiveSubscription && subscription && (
            <Card className="mb-8 border-none shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{getPlanName(subscription.type)}</CardTitle>
                      <CardDescription className="text-base">
                        {getPlanDetails(subscription.type)?.description || ""}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(subscription.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Started</p>
                    <p className="font-semibold">{formatDate(subscription.startedAt)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Expires</p>
                    <p className="font-semibold">{formatDate(subscription.expiresAt)}</p>
                  </div>
                  {subscription.scansIncluded > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Scans Used</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                            style={{
                              width: `${Math.min(100, (subscription.scansUsed / subscription.scansIncluded) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold">
                          {subscription.scansUsed} / {subscription.scansIncluded}
                        </span>
                      </div>
                    </div>
                  )}
                  {(subscription.type === "weekly" || subscription.type === "monthly") && subscription.status === "active" && (
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="w-full"
                      >
                        {cancelling ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <Scissors className="mr-2 h-4 w-4" />
                            Cancel
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upgrade Options */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => {
              const isActive = subscription?.type === plan.type && hasActiveSubscription;
              const isLoading = upgradingTo === plan.type;

              return (
                <Card
                  key={plan.type}
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${
                    isActive ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} opacity-5`} />
                  <CardHeader className="relative">
                    <div className="flex items-center justify-between">
                      <div className="text-3xl">{plan.icon}</div>
                      {isActive && (
                        <Badge variant="default" className="bg-white/20 text-white hover:bg-white/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Current
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-2">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="mb-4">
                      <span className="text-3xl font-bold">Rp {plan.price.toLocaleString("id-ID")}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={isActive ? "outline" : "default"}
                      onClick={() => handleUpgrade(plan.type)}
                      disabled={isLoading || isActive}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isActive ? (
                        "Current Plan"
                      ) : (
                        <>
                          Upgrade
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Scan History */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-2xl font-bold tracking-tight">Scan History</h2>
            <p className="text-muted-foreground mt-1">Your recent receipt scans (last 20)</p>
          </div>

          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              {scanHistory.length === 0 ? (
                <div className="py-16 text-center">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-1">No scans yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start by scanning your first receipt to track expenses
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {scanHistory.map((scan, i) => (
                    <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                          <Camera className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">Receipt Scan</p>
                          <p className="text-sm text-muted-foreground">
                            Week {scan.weekIdentifier} • {formatDate(scan.scannedAt)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDate(scan.scannedAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Quick Actions */}
        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-bold tracking-tight">Quick Actions</h2>
            <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/")}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Back to App</p>
                    <p className="text-sm text-muted-foreground">View your bills</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Settings className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Settings</p>
                    <p className="text-sm text-muted-foreground">Coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
