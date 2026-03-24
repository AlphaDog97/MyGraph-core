import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AuthSession,
  AuthUser,
  getCurrentSession,
  getCurrentUser,
  loginWithEmail,
  loginWithGitHubOAuth,
  logoutCurrentSession,
  registerWithEmail,
} from "./service";

export type AuthMode = "guest" | "authenticated";

type AuthContextValue = {
  user: AuthUser | null;
  session: AuthSession | null;
  authMode: AuthMode;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchAuthState() {
  const session = await getCurrentSession();
  const user = session ? await getCurrentUser() : null;
  return { session, user };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchAuthState();
      setSession(next.session);
      setUser(next.user);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const callback = url.searchParams.get("auth_callback");
    if (!callback) return;

    void refreshAuth().finally(() => {
      url.searchParams.delete("auth_callback");
      window.history.replaceState({}, "", url.toString());
    });
  }, [refreshAuth]);

  const signUp = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        await registerWithEmail(email, password);
        const next = await fetchAuthState();
        setSession(next.session);
        setUser(next.user);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      const next = await fetchAuthState();
      setSession(next.session);
      setUser(next.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithGitHub = useCallback(async () => {
    await loginWithGitHubOAuth();
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await logoutCurrentSession();
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      authMode: user ? "authenticated" : "guest",
      loading,
      signUp,
      signIn,
      signInWithGitHub,
      signOut,
      refreshAuth,
    }),
    [user, session, loading, signUp, signIn, signInWithGitHub, signOut, refreshAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
