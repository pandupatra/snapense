"use client";

import { useEffect, useState } from "react";
import { Crown, Loader2 } from "lucide-react";

interface ScanLimitInfo {
  tier: "free" | "premium";
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
  isPremium: boolean;
}

interface ScanCounterProps {
  className?: string;
  onClick?: () => void;
}

export function ScanCounter({ className = "", onClick }: ScanCounterProps) {
  const [scanInfo, setScanInfo] = useState<ScanLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScanInfo() {
      try {
        const response = await fetch("/api/scan-limit");
        if (!response.ok) {
          console.error("Failed to fetch scan limit");
          return;
        }
        const data = await response.json();
        setScanInfo(data);
      } catch (error) {
        console.error("Error fetching scan limit:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchScanInfo();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!scanInfo) {
    return null;
  }

  // Premium users see a badge
  if (scanInfo.isPremium) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          <Crown className="h-3 w-3" />
          Premium
        </span>
      </div>
    );
  }

  // Free users see remaining scans
  const { remaining, limit } = scanInfo;
  const isLow = remaining === 1;
  const isVeryLow = remaining === 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
          isVeryLow
            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            : isLow
              ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
              : "bg-muted text-muted-foreground"
        }`}
        onClick={isVeryLow && onClick ? onClick : undefined}
        title={isVeryLow ? "Upgrade to Premium for unlimited scans" : undefined}
      >
        {isVeryLow ? (
          <>
            No scans left
            <Crown className="h-3 w-3 ml-1" />
          </>
        ) : isLow ? (
          <>1 scan left</>
        ) : (
          <>{remaining} scans left</>
        )}
      </span>
    </div>
  );
}
