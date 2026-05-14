import { Link, Outlet, createRootRoute } from "@tanstack/react-router";

function RootComponent() {
  return <Outlet />;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-strong max-w-md rounded-3xl p-10 text-center shadow-elevated">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">404</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-foreground">
          This page is off-budget
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The route you asked for does not exist in this SpendGuard build.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center rounded-full bg-aurora px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow-gold transition hover:opacity-90"
        >
          Back to SpendGuard
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});
