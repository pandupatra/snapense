"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth } from "@/lib/auth";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
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

export function SignInButton() {
  const signIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  return (
    <button
      onClick={signIn}
      className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Sign in with Google
    </button>
  );
}

export function UserButton() {
  const { user } = useUser();

  if (!user) return null;

  const signOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors">
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            {user.name?.[0]?.toUpperCase()}
          </div>
        )}
        <span className="text-sm">{user.name}</span>
      </button>

      <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
        <div className="p-2">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <hr className="border-border" />
        <button
          onClick={signOut}
          className="w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
