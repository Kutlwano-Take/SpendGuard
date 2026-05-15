import { Link } from "@tanstack/react-router";
import { Github, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function Nav() {
  const auth = useAuth();

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <div className="glass-strong mx-auto flex max-w-7xl items-center justify-between rounded-full px-5 py-3">
        <Link to="/" className="font-display flex items-center gap-2 font-semibold">
          <span className="bg-aurora shadow-glow-gold grid h-8 w-8 place-items-center rounded-lg">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          <span>SpendGuard</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#dashboard" className="transition hover:text-foreground">
            Dashboard
          </a>
          <a href="#insights" className="transition hover:text-foreground">
            Insights
          </a>
          <a href="#smart" className="transition hover:text-foreground">
            Intelligence
          </a>
          <a href="#architecture" className="transition hover:text-foreground">
            Architecture
          </a>
          <a href="#security" className="transition hover:text-foreground">
            Security
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {auth.session ? (
            <button
              type="button"
              onClick={auth.signOut}
              className="glass hidden items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground sm:inline-flex"
              data-testid="sign-out-btn"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : null}
          <a
            href="https://github.com/Kutlwano-Take/SpendGuard"
            target="_blank"
            rel="noreferrer"
            className="glass hidden items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground sm:inline-flex"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
          <a
            href="#dashboard"
            className="bg-aurora shadow-glow-gold inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {auth.session ? "Open App" : "Sign In"}
          </a>
        </div>
      </div>
    </header>
  );
}
