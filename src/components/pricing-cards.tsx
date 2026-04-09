"use client";

import { useState } from "react";
import { Check, Crown, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { getAllPlans } from "@/lib/pricing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface PricingCardsProps {
  onClose?: () => void;
}

export function PricingCards({ onClose }: PricingCardsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const allPlans = getAllPlans();

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment");
      }

      if (data.success && data.checkoutUrl && data.checkoutUrl.length > 0) {
        // Redirect to Mayar payment page in same tab
        window.location.href = data.checkoutUrl;
      } else {
        // Log full response for debugging
        console.error("Payment API response:", data);
        throw new Error(data.error || "No payment URL received");
      }
    } catch (error) {
      console.error("Subscribe error:", error);
      alert(error instanceof Error ? error.message : "Failed to initiate payment");
    } finally {
      setLoading(null);
    }
  };

  // Separate subscription plans from scan packs
  const subscriptionPlans = allPlans.filter(
    (p) => p.id === "weekly" || p.id === "monthly",
  );
  const scanPacks = allPlans.filter(
    (p) => p.id === "scan_pack_10" || p.id === "scan_pack_25",
  );

  return (
    <div className="space-y-6">
      {/* Subscription Plans */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Premium Plans
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {subscriptionPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.isPopular
                  ? "border-amber-500 shadow-md shadow-amber-500/10"
                  : ""
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                    <Crown className="h-3 w-3" />
                    Best Value
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {plan.priceFormatted}
                  </span>
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading !== null}
                  className="w-full"
                  variant={plan.isPopular ? "default" : "outline"}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating payment...
                    </>
                  ) : (
                    "Subscribe"
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Scan Packs */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          One-Time Scan Packs
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {scanPacks.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  <span className="text-2xl font-bold">
                    {plan.priceFormatted}
                  </span>
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading !== null}
                  variant="outline"
                  className="w-full"
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating payment...
                    </>
                  ) : (
                    "Buy Now"
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
