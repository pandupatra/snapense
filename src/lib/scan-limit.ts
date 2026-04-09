/**
 * Scan limiting utilities for subscription system
 * Implements rolling 7-day window for free tier scan limits
 */

export interface WeekInfo {
  identifier: string; // "2025-W12"
  start: Date;
  end: Date;
}

/**
 * Get current week information based on ISO week numbering
 */
export function getCurrentWeekInfo(): WeekInfo {
  const now = new Date();

  // Get ISO week number (1-53)
  const tempDate = new Date(now);
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7)); // Adjust to Thursday
  const yearStart = new Date(tempDate.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = tempDate.getFullYear();

  // Get week start (Monday) and end (Sunday)
  const start = getWeekStart(now);
  const end = getWeekEnd(now);

  return {
    identifier: `${year}-W${Math.floor(weekNumber)}`,
    start,
    end,
  };
}

/**
 * Get Monday of the week for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return new Date(d);
}

/**
 * Get Sunday of the week for a given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Check if a given scan is within the current week window
 */
export function isScanInCurrentWeek(scanDate: Date): boolean {
  const weekInfo = getCurrentWeekInfo();
  return scanDate >= weekInfo.start && scanDate <= weekInfo.end;
}

/**
 * Format date as ISO week identifier
 */
export function formatWeekIdentifier(date: Date): string {
  const tempDate = new Date(date);
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
  const yearStart = new Date(tempDate.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = tempDate.getFullYear();
  return `${year}-W${Math.floor(weekNumber)}`;
}

/**
 * Get days remaining in the current week
 */
export function getDaysRemainingInWeek(): number {
  const weekEnd = getCurrentWeekInfo().end;
  const now = new Date();
  const diff = weekEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Get the date when the scan week will reset
 */
export function getScanResetDate(): Date {
  return getCurrentWeekInfo().end;
}
