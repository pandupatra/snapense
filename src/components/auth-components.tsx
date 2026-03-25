"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth } from "@/lib/auth";
import { createAuthClient } from "better-auth/react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
});

interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const session = await authClient.getSession();
        setUser(session.data?.user as User || null);
      } catch (error) {
        console.error("Error fetching session:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useUser() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useUser must be used within AuthProvider");
  }
  return context;
}

// Shared hook for theme
function useThemeMode() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = !mounted || theme === "dark" || !theme;

  return { isDarkMode, setTheme, mounted };
}

export function SignInButton() {
  const { t } = useI18n();
  const { isDarkMode } = useThemeMode();
  const [isOpen, setIsOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  const resetForm = () => {
    setFormData({ name: "", email: "", password: "", confirmPassword: "" });
    setError("");
    setSuccess("");
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
    setSuccess("");
  };

  const getErrorMessage = (error: any, isSignUpMode: boolean): string => {
    const message = error?.message?.toLowerCase() || "";
    const status = error?.status;

    if (!isSignUpMode) {
      if (status === 401 || status === 400 || message.includes("invalid") || message.includes("incorrect")) {
        return t.auth.invalidCredentials;
      }
      if (message.includes("not found") || message.includes("user not found")) {
        return t.auth.userNotFound;
      }
      if (message.includes("password")) {
        return t.auth.incorrectPassword;
      }
      if (message.includes("email") && message.includes("verified")) {
        return t.auth.emailNotVerified;
      }
    }

    if (isSignUpMode) {
      if (message.includes("email") && (message.includes("exists") || message.includes("taken"))) {
        return t.auth.emailAlreadyExists;
      }
      if (message.includes("password")) {
        return t.auth.weakPassword;
      }
      if (message.includes("invalid") && message.includes("email")) {
        return t.auth.invalidEmail;
      }
    }

    if (message.includes("network") || message.includes("fetch")) {
      return t.auth.networkError;
    }

    return t.auth.generalError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (formData.password !== formData.confirmPassword) {
          setError(t.auth.passwordMismatch);
          setIsLoading(false);
          return;
        }
        if (formData.password.length < 8) {
          setError(t.auth.passwordTooShort);
          setIsLoading(false);
          return;
        }
        const result = await authClient.signUp.email({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          callbackURL: "/",
        });

        if (result.error) {
          setError(getErrorMessage(result.error, true));
          setIsLoading(false);
          return;
        }

        // Show verification screen
        setVerificationEmail(formData.email);
        setShowVerification(true);
        setError("");
        setIsLoading(false);
        return;
      } else {
        const result = await authClient.signIn.email({
          email: formData.email,
          password: formData.password,
          callbackURL: "/",
        });

        if (result.error) {
          setError(getErrorMessage(result.error, false));
          setIsLoading(false);
          return;
        }

        setIsOpen(false);
        resetForm();
        window.location.reload();
      }
    } catch (err: any) {
      setError(getErrorMessage(err, isSignUp));
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const result = await authClient.sendVerificationEmail({
        email: verificationEmail,
      });
      if (result.error) {
        setError("Failed to resend verification email");
      } else {
        setSuccess("Verification email sent! Please check your inbox.");
        setError("");
      }
    } catch (err) {
      setError("Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  const backToSignIn = () => {
    setShowVerification(false);
    setVerificationEmail("");
    setError("");
    setSuccess("");
    setIsSignUp(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "px-6 py-3 border rounded-lg transition-all",
          isDarkMode
            ? "border-gray-700 hover:bg-gray-800 text-gray-300"
            : "border-gray-200 hover:bg-gray-100 text-gray-700"
        )}
      >
        {t.auth.signIn}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => {
            setIsOpen(false);
            resetForm();
            setShowVerification(false);
            setVerificationEmail("");
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "rounded-2xl p-6 w-full max-w-md relative my-8 border",
              isDarkMode
                ? "bg-[#1a1d24] border-gray-800"
                : "bg-white border-gray-200 shadow-sm"
            )}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setIsOpen(false);
                resetForm();
                setShowVerification(false);
                setVerificationEmail("");
              }}
              className={cn(
                "absolute top-4 right-4 p-1 rounded-full transition-colors",
                isDarkMode
                  ? "hover:bg-gray-800 text-gray-500"
                  : "hover:bg-gray-100 text-gray-400"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Verification Screen */}
            {showVerification ? (
              <>
                {/* Mail Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                </div>

                {/* Header */}
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold tracking-tight mb-2">
                    Check your email
                  </h2>
                  <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                    We've sent a verification link to:
                  </p>
                  <p className="font-medium text-sm mt-1">{verificationEmail}</p>
                </div>

                {/* Success message */}
                {success && (
                  <div className={cn(
                    "text-sm p-3 rounded-lg flex items-start gap-2 mb-4",
                    "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                  )}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span>{success}</span>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className={cn(
                    "text-sm p-3 rounded-lg flex items-start gap-2 mb-4",
                    "bg-red-500/10 text-red-400 border border-red-500/20"
                  )}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Info message */}
                <div className={cn(
                  "text-sm p-4 rounded-lg mb-6",
                  isDarkMode ? "bg-gray-800/50 text-gray-300" : "bg-gray-50 text-gray-600"
                )}>
                  <p className="mb-2">📬 Check your inbox and spam folder</p>
                  <p>Click the link in the email to verify your account, then come back to sign in.</p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className={cn(
                      "w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                      "border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 4v6h6" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                        Resend Email
                      </>
                    )}
                  </button>
                  <button
                    onClick={backToSignIn}
                    className={cn(
                      "w-full px-4 py-3 rounded-lg font-medium transition-all",
                      isDarkMode
                        ? "text-gray-400 hover:bg-gray-800"
                        : "text-gray-500 hover:bg-gray-100"
                    )}
                  >
                    Back to Sign In
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Header */}
                <div className="mb-6 pr-8">
                  <h2 className="text-xl font-semibold tracking-tight mb-1">
                    {isSignUp ? t.auth.signUpTitle : t.auth.signInTitle}
                  </h2>
                  <p className={cn("text-sm", isDarkMode ? "text-gray-500" : "text-gray-500")}>
                    {isSignUp ? "Create your account to get started" : "Welcome back! Please sign in"}
                  </p>
                </div>

            {/* Google Sign In */}
            <button
              onClick={signInWithGoogle}
              className={cn(
                "w-full px-4 py-3 rounded-lg border transition-all flex items-center justify-center gap-2 mb-4",
                isDarkMode
                  ? "border-gray-700 hover:bg-gray-800 text-gray-300"
                  : "border-gray-200 hover:bg-gray-50 text-gray-700"
              )}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="font-medium">{t.auth.signInWithGoogle}</span>
            </button>

            {/* Divider */}
            <div className="relative mb-4">
              <div className={cn("absolute inset-0 flex items-center", isDarkMode ? "border-gray-800" : "border-gray-100")}>
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={cn("px-2 text-xs uppercase tracking-wider", isDarkMode ? "bg-[#1a1d24] text-gray-500" : "bg-white text-gray-400")}>
                  or continue with email
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    {t.auth.name}
                  </label>
                  <input
                    type="text"
                    required={isSignUp}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all",
                      isDarkMode
                        ? "bg-[#0f1115] border-gray-700 text-white placeholder:text-gray-600"
                        : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                    )}
                    placeholder="Enter your name"
                  />
                </div>
              )}
              <div>
                <label className={cn("block text-sm font-medium mb-1.5", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                  {t.auth.email}
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all",
                    isDarkMode
                      ? "bg-[#0f1115] border-gray-700 text-white placeholder:text-gray-600"
                      : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                  )}
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className={cn("block text-sm font-medium mb-1.5", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                  {t.auth.password}
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all",
                    isDarkMode
                      ? "bg-[#0f1115] border-gray-700 text-white placeholder:text-gray-600"
                      : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                  )}
                  placeholder="Enter your password"
                  minLength={8}
                />
              </div>
              {isSignUp && (
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    {t.auth.confirmPassword}
                  </label>
                  <input
                    type="password"
                    required={isSignUp}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all",
                      isDarkMode
                        ? "bg-[#0f1115] border-gray-700 text-white placeholder:text-gray-600"
                        : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                    )}
                    placeholder="Confirm your password"
                  />
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className={cn(
                  "text-sm p-3 rounded-lg flex items-start gap-2",
                  "bg-red-500/10 text-red-400 border border-red-500/20"
                )}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Success message */}
              {success && (
                <div className={cn(
                  "text-sm p-3 rounded-lg flex items-start gap-2",
                  "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                )}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span>{success}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                  "bg-cyan-600 hover:bg-cyan-500 text-white",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.common.loading}
                  </>
                ) : (
                  isSignUp ? t.auth.signUp : t.auth.signIn
                )}
              </button>
            </form>

            {/* Toggle sign in / sign up */}
            <p className={cn("text-center text-sm mt-6", isDarkMode ? "text-gray-500" : "text-gray-500")}>
              {isSignUp ? t.auth.hasAccount : t.auth.noAccount}{" "}
              <button
                type="button"
                onClick={switchMode}
                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                {isSignUp ? t.auth.signIn : t.auth.signUp}
              </button>
            </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function UserButton() {
  const { user } = useUser();
  const { t } = useI18n();
  const { isDarkMode } = useThemeMode();

  if (!user) return null;

  const signOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  return (
    <div className="relative group">
      <button
        className={cn(
          "flex items-center gap-2 p-1 rounded-full transition-colors",
          isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-200"
        )}
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name || "User"}
            className="w-8 h-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              isDarkMode
                ? "bg-cyan-900/30 text-cyan-400"
                : "bg-gray-200 text-gray-600"
            )}
          >
            {(user.name || user.email)?.[0]?.toUpperCase()}
          </div>
        )}
      </button>

      <div
        className={cn(
          "absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all border",
          isDarkMode
            ? "bg-[#1a1d24] border-gray-800"
            : "bg-white border-gray-200"
        )}
      >
        <div className={cn("p-3 border-b", isDarkMode ? "border-gray-800" : "border-gray-100")}>
          <p className="text-sm font-medium">{user.name || t.auth.user}</p>
          <p className={cn("text-xs mt-0.5", isDarkMode ? "text-gray-500" : "text-gray-400")}>{user.email}</p>
        </div>
        <button
          onClick={signOut}
          className={cn(
            "w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors",
            "text-red-400 hover:bg-red-500/10"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          {t.auth.signOut}
        </button>
      </div>
    </div>
  );
}
