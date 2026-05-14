import type { ReactNode } from "react";
import {
  ArrowUpRight,
  Car,
  Coffee,
  Music,
  Plus,
  ShoppingBag,
  Zap,
} from "lucide-react";

export function Dashboard() {
  return (
    <section id="dashboard" className="relative px-4 py-28">
      <SectionHeader
        eyebrow="Dashboard"
        title={
          <>
            One glance. <span className="text-gradient-aurora">Total clarity.</span>
          </>
        }
        sub="Modular cards, depth, and motion. A workspace built for decisions, not data entry."
      />

      <div className="mx-auto mt-14 grid max-w-7xl gap-5 lg:grid-cols-3">
        <BalanceCard />
        <BudgetRingsCard />
        <HealthScoreCard />
        <TransactionsCard />
        <BudgetAlertsCard />
      </div>
    </section>
  );
}

function BalanceCard() {
  return (
    <div className="glass-strong shadow-elevated group relative overflow-hidden rounded-3xl p-7 lg:col-span-2">
      <div className="bg-violet/30 absolute -right-20 -top-20 h-72 w-72 rounded-full blur-3xl transition group-hover:bg-violet/40" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Total Balance
          </div>
          <div className="font-display mt-2 text-5xl md:text-6xl">
            R<span className="text-gradient-gold">12,847</span>
            <span className="text-2xl text-muted-foreground">.20</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm text-success">
            <ArrowUpRight className="h-4 w-4" />
            +R842 this week
          </div>
        </div>
        <button className="glass rounded-full px-4 py-2 text-sm transition hover:bg-white/10">
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add expense
          </span>
        </button>
      </div>

      <div className="relative mt-8 grid grid-cols-3 gap-4">
        {[
          { label: "Income", value: "R5,420", tone: "text-success" },
          { label: "Spent", value: "R3,210", tone: "text-warning" },
          { label: "Saved", value: "R1,940", tone: "text-azure" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div className={`font-display mt-1 text-xl ${stat.tone}`}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetRingsCard() {
  const rings = [
    { name: "Monthly", pct: 64, color: "oklch(0.85 0.15 85)" },
    { name: "Weekly", pct: 82, color: "oklch(0.62 0.22 295)" },
    { name: "Daily", pct: 41, color: "oklch(0.7 0.18 230)" },
  ];

  return (
    <div className="glass rounded-3xl p-6">
      <div className="text-sm font-medium">Budget Progress</div>
      <div className="mt-1 text-xs text-muted-foreground">Live across 3 horizons</div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {rings.map((ring) => {
          const circumference = 2 * Math.PI * 28;
          return (
            <div key={ring.name} className="flex flex-col items-center">
              <svg viewBox="0 0 70 70" className="-rotate-90 h-20 w-20">
                <circle
                  cx="35"
                  cy="35"
                  r="28"
                  stroke="oklch(1 0 0 / 8%)"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="35"
                  cy="35"
                  r="28"
                  stroke={ring.color}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (ring.pct / 100) * circumference}
                  strokeLinecap="round"
                />
              </svg>
              <div className="-mt-12 font-display text-lg">{ring.pct}%</div>
              <div className="mt-8 text-xs text-muted-foreground">{ring.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HealthScoreCard() {
  const score = 86;
  const circumference = 2 * Math.PI * 60;

  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl p-6">
      <div className="bg-gold/20 absolute -bottom-10 -right-10 h-48 w-48 rounded-full blur-3xl" />
      <div className="text-sm font-medium">Spending Health Score</div>
      <div className="mt-1 text-xs text-muted-foreground">Updated daily by AI</div>
      <div className="relative mt-4 grid place-items-center">
        <svg viewBox="0 0 140 140" className="-rotate-90 h-40 w-40">
          <circle cx="70" cy="70" r="60" stroke="oklch(1 0 0 / 6%)" strokeWidth="10" fill="none" />
          <circle
            cx="70"
            cy="70"
            r="60"
            stroke="url(#healthScoreGradient)"
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (score / 100) * circumference}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="healthScoreGradient" x1="0" x2="1">
              <stop offset="0%" stopColor="oklch(0.85 0.15 85)" />
              <stop offset="100%" stopColor="oklch(0.62 0.22 295)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-gradient-gold font-display text-5xl">{score}</div>
            <div className="mt-1 text-xs text-muted-foreground">Excellent</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionsCard() {
  const items = [
    { icon: Coffee, name: "Blue Bottle Coffee", cat: "Food", time: "2m ago", amt: "-R64.40" },
    {
      icon: ShoppingBag,
      name: "Checkers Hyper",
      cat: "Groceries",
      time: "1h ago",
      amt: "-R842.22",
    },
    { icon: Car, name: "Uber Trip", cat: "Transport", time: "3h ago", amt: "-R185.50" },
    { icon: Music, name: "Spotify Premium", cat: "Subs", time: "Yesterday", amt: "-R119.99" },
    { icon: Zap, name: "City Power", cat: "Utilities", time: "2d", amt: "-R941.10" },
  ];

  return (
    <div className="glass rounded-3xl p-6 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Recent Transactions</div>
          <div className="mt-1 text-xs text-muted-foreground">Auto-categorized in real time</div>
        </div>
        <button className="text-xs text-muted-foreground transition hover:text-foreground">
          View all {"->"}
        </button>
      </div>

      <div className="divide-y divide-white/5">
        {items.map((item) => (
          <div
            key={`${item.name}-${item.time}`}
            className="-mx-2 flex items-center gap-4 rounded-xl px-2 py-3 transition hover:bg-white/[0.02]"
          >
            <div className="glass grid h-10 w-10 shrink-0 place-items-center rounded-xl">
              <item.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{item.name}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {item.cat}
                <span className="rounded-full bg-violet/15 px-1.5 py-0.5 text-[10px] text-violet">
                  AI
                </span>
                <span>- {item.time}</span>
              </div>
            </div>
            <div className="font-mono text-sm">{item.amt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetAlertsCard() {
  const alerts = [
    { name: "Dining Out", used: 92, limit: "R4,000" },
    { name: "Subscriptions", used: 64, limit: "R800" },
    { name: "Shopping", used: 38, limit: "R3,000" },
  ];

  return (
    <div className="glass rounded-3xl p-6">
      <div className="text-sm font-medium">Budgets and Alerts</div>
      <div className="mt-1 text-xs text-muted-foreground">Proactive thresholds</div>
      <div className="mt-5 space-y-4">
        {alerts.map((alert) => {
          const color =
            alert.used > 85 ? "bg-warning" : alert.used > 60 ? "bg-azure" : "bg-success";

          return (
            <div key={alert.name}>
              <div className="mb-1.5 flex justify-between text-xs">
                <span>{alert.name}</span>
                <span className="font-mono text-muted-foreground">
                  {alert.used}% of {alert.limit}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div className={`h-full ${color}`} style={{ width: `${alert.used}%` }} />
              </div>
              {alert.used > 85 ? (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-warning">
                  <span className="bg-warning animate-pulse-ring h-1.5 w-1.5 rounded-full" />
                  Approaching limit - consider pausing
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: ReactNode;
  sub: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="glass inline-block rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {eyebrow}
      </div>
      <h2 className="font-display mt-5 text-4xl font-semibold leading-tight md:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-muted-foreground">{sub}</p>
    </div>
  );
}
