"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = !mounted || theme === "dark" || !theme;

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");
      const email = searchParams.get("email");

      if (!token || !email) {
        setStatus("error");
        setMessage("Invalid verification link. Please request a new one.");
        return;
      }

      try {
        // Use the better-auth API endpoint for verification
        const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`, {
          method: "GET",
        });

        const data = await response.json();

        if (!response.ok || data.error) {
          setStatus("error");
          setMessage(data.error || "Verification failed. The link may have expired.");
        } else {
          setStatus("success");
          setMessage("Your email has been verified successfully! You can now sign in.");
          // Redirect to home after 3 seconds
          setTimeout(() => {
            router.push("/");
          }, 3000);
        }
      } catch (error: any) {
        setStatus("error");
        setMessage(error.message || "An error occurred during verification.");
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center p-4 transition-colors",
        isDarkMode ? "bg-[#0f1115]" : "bg-gray-50"
      )}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-2xl p-8 text-center",
          isDarkMode ? "bg-[#1a1d24]" : "bg-white shadow-sm border border-gray-200"
        )}
      >
        {/* Header with theme toggle */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setTheme(isDarkMode ? "light" : "dark")}
            className={cn(
              "p-2 rounded-full transition-colors",
              isDarkMode
                ? "hover:bg-gray-800 text-gray-400"
                : "hover:bg-gray-100 text-gray-500"
            )}
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20h2" />
                <path d="m6.34 17.66-1.41-1.41" />
                <path d="m19.07 4.93-1.41-1.41" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>
        </div>

        {/* Logo */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-cyan-400">Snapense</h1>
        </div>

        {/* Status Icon */}
        <div className="mb-6 flex justify-center">
          {status === "loading" && (
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          )}
          {status === "success" && (
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          )}
          {status === "error" && (
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          )}
        </div>

        {/* Message */}
        <h2 className="text-xl font-semibold mb-2">
          {status === "loading" && "Verifying your email..."}
          {status === "success" && "Email Verified!"}
          {status === "error" && "Verification Failed"}
        </h2>

        <p className={cn("mb-6", isDarkMode ? "text-gray-400" : "text-gray-500")}>
          {message}
        </p>

        {/* Actions */}
        {status === "error" && (
          <button
            onClick={() => router.push("/")}
            className={cn(
              "px-6 py-2 rounded-lg font-medium transition-colors",
              "bg-cyan-600 hover:bg-cyan-500 text-white"
            )}
          >
            Back to Sign In
          </button>
        )}

        {status === "success" && (
          <p className={cn("text-sm", isDarkMode ? "text-gray-500" : "text-gray-400")}>
            Redirecting you to sign in...
          </p>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0f1115]">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
