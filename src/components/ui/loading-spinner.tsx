"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  isDarkMode?: boolean;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: "w-5 h-5",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

const dotSizeClasses = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

export function LoadingSpinner({
  size = "md",
  text,
  isDarkMode = false,
  fullScreen = false,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullScreen && "min-h-screen",
      )}
    >
      <div className={cn("relative", sizeClasses[size])}>
        <div
          className={cn(
            "absolute inset-0 rounded-full border-2 border-transparent animate-spin",
            isDarkMode
              ? "border-t-cyan-400 border-r-cyan-400/30"
              : "border-t-cyan-600 border-r-cyan-600/30",
          )}
          style={{ animationDuration: "0.8s" }}
        />
        <div
          className={cn(
            "absolute inset-1 rounded-full border-2 border-transparent animate-spin",
            isDarkMode
              ? "border-b-cyan-400/60 border-l-cyan-400/20"
              : "border-b-cyan-600/60 border-l-cyan-600/20",
          )}
          style={{ animationDuration: "1.2s", animationDirection: "reverse" }}
        />
        <div
          className={cn(
            "absolute inset-0 m-auto rounded-full",
            dotSizeClasses[size],
            isDarkMode ? "bg-cyan-400" : "bg-cyan-600",
            "animate-pulse",
          )}
        />
      </div>
      {text && (
        <p
          className={cn(
            "text-sm font-medium animate-pulse",
            isDarkMode ? "text-gray-400" : "text-gray-500",
          )}
        >
          {text}
        </p>
      )}
    </div>
  );
}
