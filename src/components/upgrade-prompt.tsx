"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PricingCards } from "./pricing-cards";
import { X, Crown, Lock } from "lucide-react";
import { Button } from "./ui/button";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "scan_limit" | "export";
}

export function UpgradePrompt({
  open,
  onOpenChange,
  reason = "scan_limit",
}: UpgradePromptProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            {reason === "scan_limit" ? (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30">
                <Crown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            )}
          </div>
          <DialogTitle className="text-xl">
            {reason === "scan_limit" ? "Weekly Scan Limit Reached" : "Premium Feature Locked"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {reason === "scan_limit" ? (
              <>
                You've used all <strong>5 free scans</strong> for this week.{" "}
                Your scans reset every 7 days.
                <br /><br />
                Upgrade to Premium for <strong>unlimited receipt scans</strong> and more.
              </>
            ) : (
              <>
                Export to CSV and Google Sheets is a <strong>Premium feature</strong>.
                <br /><br />
                Upgrade to unlock exports and all other premium features.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <PricingCards onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
