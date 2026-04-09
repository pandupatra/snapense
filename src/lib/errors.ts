export type ActionErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION"
  | "NOT_FOUND"
  | "INTERNAL"
  | "NETWORK"
  | "RATE_LIMITED";

export class ActionError extends Error {
  constructor(
    public code: ActionErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ActionError";
  }
}

export function isActionError(error: unknown): error is ActionError {
  return error instanceof ActionError;
}

/**
 * Helper to create a standardized error from caught exceptions
 */
export function toActionError(error: unknown, context: string): ActionError {
  if (isActionError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Check for network-related errors
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return new ActionError("NETWORK", `${context}: Network error`, error.message);
    }
    return new ActionError("INTERNAL", `${context}: ${error.message}`, error);
  }

  return new ActionError("INTERNAL", `${context}: Unknown error`, error);
}

/**
 * Error thrown when a user exceeds rate limits
 */
export class RateLimitError extends ActionError {
  constructor(public resetAt: Date) {
    super(
      "RATE_LIMITED",
      `Too many requests. Try again after ${resetAt.toLocaleTimeString()}`,
      { resetAt: resetAt.toISOString() }
    );
    this.name = "RateLimitError";
  }
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}
