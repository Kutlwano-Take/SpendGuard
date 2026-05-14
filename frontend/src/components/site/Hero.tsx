import { Activity, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-36">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-violet/30 animate-aurora absolute left-1/4 top-10 h-[42rem] w-[42rem] rounded-full blur-[140px]" />
        <div
          className="bg-azure/25 animate-aurora absolute right-1/4 top-32 h-[36rem] w-[36rem] rounded-full blur-[140px]"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="bg-gold/20 animate-aurora absolute bottom-[-5rem] left-1/3 h-[30rem] w-[30rem] rounded-full blur-[120px]"
          style={{ animationDelay: "6s" }}
        />
        <div className="grid-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      </div>

      <div className="mx-auto max-w-6xl text-center">
        <div className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground">
          <span className="bg-success animate-pulse-ring h-1.5 w-1.5 rounded-full" />
          Powered by AWS serverless and AI-native workflows
        </div>

        <h1 className="font-display mt-8 text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
          Your <span className="text-gradient-aurora">Intelligent</span>
          <br />
          Financial Companion
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          SpendGuard turns every transaction into clarity. Real-time tracking,
          automated categorization, and AI insights that help you decide, not
          just record.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#dashboard"
            className="bg-aurora shadow-glow-gold group inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium text-primary-foreground transition hover:scale-[1.02]"
          >
            Start Tracking
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </a>
          <a
            href="#insights"
            className="glass-strong inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium transition hover:bg-white/5"
          >
            View Insights
          </a>
          <a
            href="#architecture"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium text-muted-foreground transition hover:text-foreground"
          >
            Explore Architecture {"->"}
          </a>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: Activity, label: "Real-time", sub: "<200ms latency" },
            { icon: Sparkles, label: "AI-powered", sub: "Predictive insights" },
            { icon: ShieldCheck, label: "Bank-grade", sub: "Encrypted at rest" },
          ].map((badge) => (
            <div
              key={badge.label}
              className="glass flex items-center gap-3 rounded-2xl p-4 text-left"
            >
              <div className="bg-violet-azure grid h-9 w-9 shrink-0 place-items-center rounded-xl">
                <badge.icon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{badge.label}</div>
                <div className="truncate text-xs text-muted-foreground">{badge.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <HeroPreview />
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto mt-20 max-w-5xl">
      <div className="bg-aurora absolute -inset-4 rounded-[2rem] opacity-30 blur-3xl" />
      <div className="glass-strong shadow-elevated relative rounded-3xl p-2">
        <div className="bg-card/60 rounded-[1.25rem] p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Total Balance
              </div>
              <div className="font-display mt-1 text-4xl md:text-5xl">
                R <span className="text-gradient-gold">12,847.20</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="bg-success animate-pulse-ring h-2 w-2 rounded-full" />
              Last synced 2s ago
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <MiniStat label="Health Score" value="86" sub="Excellent" tone="gold" />
            <MiniStat label="This Month" value="R3,210" sub="-12% vs last" tone="violet" />
            <MiniStat label="Saved" value="R1,940" sub="Auto-routed" tone="azure" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <SparkCard />
            <CategoryCard />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "gold" | "violet" | "azure";
}) {
  const dot = tone === "gold" ? "bg-gold" : tone === "violet" ? "bg-violet" : "bg-azure";

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      </div>
      <div className="font-display mt-2 text-2xl">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function SparkCard() {
  const points = [22, 28, 25, 34, 30, 42, 38, 50, 46, 58, 54, 66];
  const max = Math.max(...points);
  const path = points
    .map((point, index) => `${(index / (points.length - 1)) * 100},${100 - (point / max) * 90}`)
    .join(" ");

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">Spending Trend</div>
        <div className="text-xs text-muted-foreground">12w</div>
      </div>
      <svg viewBox="0 0 100 100" className="h-32 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.62 0.22 295)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="oklch(0.62 0.22 295)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={`0,100 ${path} 100,100`} fill="url(#sparkFill)" />
        <polyline points={path} fill="none" stroke="oklch(0.85 0.15 85)" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

function CategoryCard() {
  const categories = [
    { name: "Food and Dining", pct: 38, color: "bg-gold" },
    { name: "Transport", pct: 22, color: "bg-violet" },
    { name: "Subscriptions", pct: 18, color: "bg-azure" },
    { name: "Other", pct: 22, color: "bg-muted-foreground/40" },
  ];

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">Top Categories</div>
        <div className="text-xs text-muted-foreground">This month</div>
      </div>
      <div className="space-y-3">
        {categories.map((category) => (
          <div key={category.name}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted-foreground">{category.name}</span>
              <span className="font-mono">{category.pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className={`h-full ${category.color}`} style={{ width: `${category.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
