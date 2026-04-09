/**
 * Mayar.id Payment Gateway Integration
 * https://mayar.id - Indonesian payment gateway
 *
 * API: POST /hl/v1/payment/create
 * Environments:
 * - Production: https://api.mayar.id
 * - Sandbox: https://api.mayar.club
 */

import { getConfig } from "./config";

function isDemoMode(): boolean {
  return process.env.MAYAR_DEMO_MODE === "true" || !process.env.MAYAR_API_KEY;
}

export interface MayarPaymentRequest {
  amount: number;
  description: string;
  expiredAt: string; // ISO 8601 datetime
  name: string; // Customer name
  email: string; // Customer email
  mobile: string; // Customer phone number
  redirectUrl?: string; // Redirect URL after payment
}

export interface MayarPaymentResponse {
  success: boolean;
  data?: {
    id: string;
    amount: number;
    status: "pending" | "paid" | "expired" | "failed";
    expiredAt: string;
    paymentUrl?: string;
    url?: string;
    checkoutUrl: string;
  };
  error?: string;
  environment?: "demo" | "sandbox" | "production";
}

/**
 * Create a payment link via Mayar.id API
 *
 * Endpoint: /hl/v1/payment/create
 */
export async function createMayarPayment(
  request: MayarPaymentRequest,
): Promise<MayarPaymentResponse> {
  const config = getConfig();
  const apiKey = config.mayarApiKey;

  // Demo mode for development/testing (no API key)
  if (isDemoMode() || !apiKey) {
    console.log("[Mayar API] Demo mode: Simulating payment creation", {
      amount: request.amount,
      description: request.description,
    });
    return {
      success: true,
      data: {
        id: `demo_${Date.now()}`,
        amount: request.amount,
        status: "pending",
        expiredAt: request.expiredAt,
        checkoutUrl: `/demo-payment?amount=${request.amount}`,
      },
      environment: "demo",
    };
  }

  const isSandbox = process.env.MAYAR_SANDBOX === "true";
  const baseUrl = isSandbox ? "https://api.mayar.club" : "https://api.mayar.id";
  const url = `${baseUrl}/hl/v1/payment/create`;

  // Request body format based on Mayar API
  const body = {
    name: request.name,
    email: request.email,
    amount: request.amount,
    mobile: request.mobile,
    redirectUrl: request.redirectUrl || `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/account`,
    description: request.description,
    expiredAt: request.expiredAt,
  };

  console.log(`[Mayar API] Creating payment (${isSandbox ? "SANDBOX" : "PROD"}):`, {
    url,
    amount: request.amount,
    email: request.email,
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json().catch(() => null);

    if (response.ok && responseData) {
      // Mayar returns: { statusCode, messages, data: { id, link } }
      const url = responseData.data?.link;

      return {
        success: true,
        data: {
          id: responseData.data?.id || `pay_${Date.now()}`,
          amount: request.amount,
          status: "pending",
          expiredAt: request.expiredAt,
          checkoutUrl: url,
        },
        environment: isSandbox ? "sandbox" : "production",
      };
    }

    // Handle errors
    const errorMsg = responseData?.message || responseData?.error || await response.text();
    console.error(`[Mayar API] Error ${response.status}:`, errorMsg);

    if (response.status === 401) {
      return {
        success: false,
        error: "Invalid API key. Check your MAYAR_API_KEY from https://web.mayar" + (isSandbox ? ".club" : ".id") + "/api-keys",
        environment: isSandbox ? "sandbox" : "production",
      };
    }

    return {
      success: false,
      error: `Mayar API error: ${errorMsg}`,
      environment: isSandbox ? "sandbox" : "production",
    };

  } catch (error) {
    console.error("[Mayar API] Network error:", error);
    return {
      success: false,
      error: "Could not connect to Mayar API. Check your network connection.",
      environment: isSandbox ? "sandbox" : "production",
    };
  }
}

/**
 * Calculate payment expiration time
 * Default: 24 hours from now
 */
export function calculatePaymentExpiration(
  hours: number = 24,
): string {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + hours);
  return expiration.toISOString();
}

/**
 * Get payment status from Mayar API
 * Endpoint: GET /hl/v1/payment/{id}
 */
export async function getPaymentStatus(
  paymentId: string,
): Promise<{ success: boolean; status?: string; error?: string }> {
  const config = getConfig();
  const apiKey = config.mayarApiKey;

  // Demo mode
  if (isDemoMode() || !apiKey) {
    console.log("[Mayar API] Demo mode: Simulating payment status check");
    // For demo payments, randomly return paid or unpaid
    const isPaid = Math.random() > 0.5;
    return {
      success: true,
      status: isPaid ? "paid" : "unpaid",
    };
  }

  const isSandbox = process.env.MAYAR_SANDBOX === "true";
  const baseUrl = isSandbox ? "https://api.mayar.club" : "https://api.mayar.id";
  const url = `${baseUrl}/hl/v1/payment/${paymentId}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    const responseData = await response.json().catch(() => null);

    if (response.ok && responseData?.data) {
      return {
        success: true,
        status: responseData.data.status, // "unpaid" | "paid"
      };
    }

    const errorMsg = responseData?.message || responseData?.error || await response.text();
    console.error(`[Mayar API] Status check error ${response.status}:`, errorMsg);

    return {
      success: false,
      error: `Failed to check payment status: ${errorMsg}`,
    };
  } catch (error) {
    console.error("[Mayar API] Status check network error:", error);
    return {
      success: false,
      error: "Could not connect to Mayar API",
    };
  }
}

/**
 * Verify Mayar webhook signature
 * Mayar sends signature in x-mayar-signature header
 * Format: sha256=<hex_digest>
 */
export function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string | null,
): boolean {
  const config = getConfig();
  const secret = config.mayarSecretKey;

  // Skip verification if no secret configured or demo mode
  if (!secret || isDemoMode()) {
    console.log("[Mayar Webhook] Signature verification skipped (no secret or demo mode)");
    return true;
  }

  if (!receivedSignature) {
    console.error("[Mayar Webhook] Missing signature header");
    return false;
  }

  try {
    // Import crypto for HMAC verification
    const crypto = require("crypto");

    // Compute HMAC-SHA256
    const expectedDigest = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const expectedSignature = `sha256=${expectedDigest}`;

    // Constant-time comparison to prevent timing attacks
    const cryptoTimingSafeEqual = (
      a: string,
      b: string,
    ): boolean => {
      if (a.length !== b.length) {
        return false;
      }
      return crypto.timingSafeEqual(
        Buffer.from(a),
        Buffer.from(b),
      );
    };

    const isValid = cryptoTimingSafeEqual(receivedSignature, expectedSignature);

    if (!isValid) {
      console.error("[Mayar Webhook] Signature mismatch", {
        received: receivedSignature.slice(0, 20) + "...",
        expected: expectedSignature.slice(0, 20) + "...",
      });
    }

    return isValid;
  } catch (error) {
    console.error("[Mayar Webhook] Signature verification error:", error);
    return false;
  }
}
