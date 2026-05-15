import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearStoredSession,
  confirmCognitoSignUp,
  createDemoSession,
  getAuthReadiness,
  getStoredSession,
  refreshCognitoSession,
  signInWithCognito,
  signUpWithCognito,
  storeSession,
  type AuthSession,
  type SignUpResult,
} from "./auth";

type AuthStatus = "loading" | "signed-out" | "signed-in";

type AuthContextValue = {
  status: AuthStatus;
  session: AuthSession | null;
  error: string | null;
  hasCognitoConfig: boolean;
  region: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signInDemo: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const readiness = getAuthReadiness();

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const stored = getStoredSession();

      if (!stored) {
        if (active) {
          setStatus("signed-out");
        }
        return;
      }

      try {
        const shouldRefresh = stored.mode === "cognito" && stored.refreshToken && stored.expiresAt - Date.now() < 5 * 60 * 1000;
        const nextSession = shouldRefresh ? await refreshCognitoSession(stored) : stored;
        storeSession(nextSession);

        if (active) {
          setSession(nextSession);
          setStatus("signed-in");
        }
      } catch (bootstrapError) {
        clearStoredSession();
        if (active) {
          setSession(null);
          setError(readError(bootstrapError));
          setStatus("signed-out");
        }
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const nextSession = await signInWithCognito(email, password);
    storeSession(nextSession);
    setSession(nextSession);
    setStatus("signed-in");
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    return signUpWithCognito(email, password);
  }, []);

  const confirmSignUp = useCallback(async (email: string, code: string) => {
    setError(null);
    await confirmCognitoSignUp(email, code);
  }, []);

  const signInDemo = useCallback(() => {
    const nextSession = createDemoSession();
    storeSession(nextSession);
    setSession(nextSession);
    setStatus("signed-in");
    setError(null);
  }, []);

  const signOut = useCallback(() => {
    clearStoredSession();
    setSession(null);
    setStatus("signed-out");
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      error,
      hasCognitoConfig: readiness.hasCognitoConfig,
      region: readiness.region,
      signIn,
      signUp,
      confirmSignUp,
      signInDemo,
      signOut,
    }),
    [status, session, error, readiness.hasCognitoConfig, readiness.region, signIn, signUp, confirmSignUp, signInDemo, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
