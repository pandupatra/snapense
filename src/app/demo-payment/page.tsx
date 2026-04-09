"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crown, Check, Loader2 } from "lucide-react";

function DemoPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const externalId = searchParams.get("externalId") || "";
  const amount = searchParams.get("amount") || "0";

  // Simulate webhook after successful payment
  const simulateWebhook = async () => {
    try {
      // Call the webhook endpoint to simulate payment completion
      const response = await fetch("/api/mayar/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `demo_${externalId}`,
          externalId: externalId,
          amount: parseInt(amount) || 0,
          status: "paid",
          paidAt: new Date().toISOString(),
          signature: "demo_signature", // In demo mode, we skip signature verification
        }),
      });

      if (response.ok) {
        console.log("[Demo Payment] Webhook simulated successfully");
      } else {
        console.error("[Demo Payment] Webhook simulation failed");
      }
    } catch (error) {
      console.error("[Demo Payment] Webhook simulation error:", error);
    }
  };

  const handlePayment = async (success: boolean) => {
    setIsProcessing(true);

    if (success) {
      // Simulate payment completion
      await simulateWebhook();
      setIsSuccess(true);

      // Redirect after showing success
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } else {
      // Cancel payment
      router.push("/");
    }

    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1115] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {!isSuccess ? (
          <>
            <div className="flex flex-col items-center mb-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
                <Crown className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Demo Payment</h1>
              <p className="text-gray-500 dark:text-gray-400 text-center">
                This is a demo payment page for testing purposes.
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                <span className="font-semibold">Rp {parseInt(amount).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Reference:</span>
                <span className="font-mono text-sm">{externalId.slice(0, 20)}...</span>
              </div>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
              In production, this would redirect to the actual Mayar.id payment page
              where users can pay via QRIS, e-wallet, or bank transfer.
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => handlePayment(true)}
                disabled={isProcessing}
                className="w-full bg-cyan-600 hover:bg-cyan-500"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Simulate Successful Payment"
                )}
              </Button>
              <Button
                onClick={() => handlePayment(false)}
                disabled={isProcessing}
                variant="outline"
                className="w-full"
              >
                Cancel Payment
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Payment Successful!</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
              Your premium access has been activated.
            </p>
            <p className="text-sm text-gray-400">Redirecting to home...</p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function DemoPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-[#0f1115] flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <DemoPaymentContent />
    </Suspense>
  );
}
