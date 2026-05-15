import { useState, type FormEvent } from "react";
import { LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type AuthView = "sign-in" | "sign-up" | "confirm";

export function AuthPanel() {
  const auth = useAuth();
  const [view, setView] = useState<AuthView>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [message, setMessage] = useState<string | null>(auth.error);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (view === "sign-in") {
        await auth.signIn(email, password);
        return;
      }

      if (view === "sign-up") {
        const result = await auth.signUp(email, password);
        setPendingEmail(result.email);
        setView(result.needsConfirmation ? "confirm" : "sign-in");
        setMessage(result.needsConfirmation ? "Check your email for the confirmation code." : "Account created. You can sign in now.");
        return;
      }

      await auth.confirmSignUp(pendingEmail || email, code);
      setView("sign-in");
      setMessage("Email confirmed. Sign in to continue.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  const title =
    view === "sign-in" ? "Sign in to SpendGuard" : view === "sign-up" ? "Create your account" : "Confirm your email";

  return (
    <div className="glass-strong shadow-elevated mx-auto max-w-5xl rounded-3xl p-6 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="flex flex-col justify-between">
          <div>
            <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="text-gold h-3.5 w-3.5" />
              Cognito-protected workspace
            </div>
            <h3 className="font-display mt-5 text-3xl font-semibold md:text-4xl">{title}</h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Your expenses are loaded through the authenticated API and partitioned by your Cognito user ID.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              "JWT auth",
              "User-scoped data",
              "No finance localStorage",
            ].map((item) => (
              <div key={item} className="glass rounded-2xl p-4 text-sm">
                <Sparkles className="text-gold mb-3 h-4 w-4" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-3xl p-5" data-testid="auth-form">
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm">
              Email
              <span className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-gold/70"
                  placeholder="you@example.com"
                  required
                  data-testid="auth-email"
                />
              </span>
            </label>

            {view !== "confirm" ? (
              <label className="grid gap-2 text-sm">
                Password
                <span className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-gold/70"
                    placeholder="Minimum 8 characters"
                    required
                    data-testid="auth-password"
                  />
                </span>
              </label>
            ) : (
              <label className="grid gap-2 text-sm">
                Confirmation code
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-gold/70"
                  placeholder="123456"
                  required
                  data-testid="auth-code"
                />
              </label>
            )}
          </div>

          {message ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-muted-foreground" data-testid="auth-message">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="bg-aurora shadow-glow-gold mt-5 w-full rounded-full px-5 py-3 text-sm font-medium text-primary-foreground transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="auth-submit"
          >
            {loading ? "Working..." : view === "sign-in" ? "Sign in" : view === "sign-up" ? "Create account" : "Confirm email"}
          </button>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            {view === "sign-in" ? (
              <button type="button" onClick={() => setView("sign-up")} className="transition hover:text-foreground">
                Create an account
              </button>
            ) : (
              <button type="button" onClick={() => setView("sign-in")} className="transition hover:text-foreground">
                Back to sign in
              </button>
            )}

            <button type="button" onClick={auth.signInDemo} className="transition hover:text-foreground" data-testid="demo-sign-in">
              Use local demo
            </button>
          </div>

          {!auth.hasCognitoConfig ? (
            <div className="mt-4 text-xs leading-relaxed text-warning">
              Cognito environment variables are missing. Demo mode is available for local review.
            </div>
          ) : (
            <div className="mt-4 text-xs text-muted-foreground">Region: {auth.region}</div>
          )}
        </form>
      </div>
    </div>
  );
}
