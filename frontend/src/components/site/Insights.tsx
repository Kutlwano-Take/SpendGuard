import { Calendar, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { SectionHeader } from "./Dashboard";

export function Insights() {
  return (
    <section id="insights" className="relative px-4 py-28">
      <div className="grid-bg absolute inset-0 -z-10 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <SectionHeader
        eyebrow="Insights and Analytics"
        title={
          <>
            From data to <span className="text-gradient-aurora">decisions</span>.
          </>
        }
        sub="AI surfaces the moments that matter. Trends, comparisons, and actionable nudges."
      />

      <div className="mx-auto mt-14 grid max-w-7xl gap-5 lg:grid-cols-3">
        <TrendChart />
        <CategoryDonut />
        <AIInsightsFeed />
        <MonthlyComparison />
        <WeeklyReport />
      </div>
    </section>
  );
}

function TrendChart() {
  const data = [42, 38, 56, 48, 64, 58, 72, 68, 80, 74, 88, 82, 95, 90];
  const max = Math.max(...data);
  const points = data
    .map((value, index) => `${(index / (data.length - 1)) * 100},${100 - (value / max) * 85}`)
    .join(" ");

  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl p-7 lg:col-span-2">
      <div className="bg-violet/20 absolute -right-10 -top-10 h-72 w-72 rounded-full blur-3xl" />
      <div className="relative mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Spending Trend</div>
          <div className="mt-1 text-xs text-muted-foreground">14 days - auto-smoothed</div>
        </div>
        <div className="flex gap-1 text-xs">
          {["7d", "14d", "30d", "1y"].map((period, index) => (
            <button
              key={period}
              className={`rounded-full px-3 py-1 ${
                index === 1 ? "bg-aurora text-primary-foreground" : "glass text-muted-foreground"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox="0 0 100 100" className="h-64 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.85 0.15 85)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="oklch(0.85 0.15 85)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="trendStroke" x1="0" x2="1">
            <stop offset="0%" stopColor="oklch(0.85 0.15 85)" />
            <stop offset="100%" stopColor="oklch(0.62 0.22 295)" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map((axis) => (
          <line
            key={axis}
            x1="0"
            x2="100"
            y1={axis}
            y2={axis}
            stroke="oklch(1 0 0 / 5%)"
            strokeWidth="0.2"
          />
        ))}
        <polyline points={`0,100 ${points} 100,100`} fill="url(#trendFill)" />
        <polyline
          points={points}
          fill="none"
          stroke="url(#trendStroke)"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function CategoryDonut() {
  const categories = [
    { name: "Food", pct: 38, color: "oklch(0.85 0.15 85)" },
    { name: "Transport", pct: 22, color: "oklch(0.62 0.22 295)" },
    { name: "Subs", pct: 18, color: "oklch(0.7 0.18 230)" },
    { name: "Other", pct: 22, color: "oklch(0.74 0.18 155)" },
  ];

  let offset = 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="glass rounded-3xl p-6">
      <div className="text-sm font-medium">Category Breakdown</div>
      <div className="mt-1 text-xs text-muted-foreground">Where your money lives</div>
      <div className="relative mt-4 grid place-items-center">
        <svg viewBox="0 0 100 100" className="-rotate-90 h-44 w-44">
          <circle cx="50" cy="50" r={radius} stroke="oklch(1 0 0 / 6%)" strokeWidth="14" fill="none" />
          {categories.map((category) => {
            const length = (category.pct / 100) * circumference;
            const segment = (
              <circle
                key={category.name}
                cx="50"
                cy="50"
                r={radius}
                stroke={category.color}
                strokeWidth="14"
                fill="none"
                strokeDasharray={`${length} ${circumference}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return segment;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display text-2xl">R3,210</div>
            <div className="text-xs text-muted-foreground">spent</div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {categories.map((category) => (
          <div key={category.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: category.color }} />
              {category.name}
            </div>
            <span className="font-mono text-muted-foreground">{category.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIInsightsFeed() {
  const insights = [
    {
      icon: TrendingUp,
      tone: "warning",
      title: "Food spend up 18%",
      body: "Most of the lift came from delivery on weekdays. Cooking twice can save about R1,200 per month.",
    },
    {
      icon: TrendingDown,
      tone: "success",
      title: "Transport down 24%",
      body: "Your shift to transit is paying off. The current pattern is stronger than last month.",
    },
    {
      icon: Sparkles,
      tone: "violet",
      title: "Subscription drift detected",
      body: "Three streaming services overlap on content. Consolidating two of them saves about R220 monthly.",
    },
  ];

  return (
    <div className="glass rounded-3xl p-6 lg:col-span-2">
      <div className="mb-1 flex items-center gap-2">
        <div className="bg-aurora grid h-7 w-7 place-items-center rounded-lg">
          <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <div className="text-sm font-medium">AI Insights</div>
        <span className="ml-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Live
        </span>
      </div>
      <div className="mb-4 text-xs text-muted-foreground">Actionable, not just informative</div>
      <div className="grid gap-3 md:grid-cols-3">
        {insights.map((insight) => {
          const ringClass =
            insight.tone === "warning"
              ? "border-warning/30"
              : insight.tone === "success"
                ? "border-success/30"
                : "border-violet/30";
          const iconClass =
            insight.tone === "warning"
              ? "text-warning"
              : insight.tone === "success"
                ? "text-success"
                : "text-violet";

          return (
            <div key={insight.title} className={`glass rounded-2xl border p-4 ${ringClass}`}>
              <insight.icon className={`h-4 w-4 ${iconClass}`} />
              <div className="mt-3 text-sm font-medium">{insight.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {insight.body}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyComparison() {
  const months = [
    { month: "Jul", value: 62 },
    { month: "Aug", value: 78 },
    { month: "Sep", value: 54 },
    { month: "Oct", value: 88 },
    { month: "Nov", value: 70 },
    { month: "Dec", value: 95 },
  ];
  const max = Math.max(...months.map((item) => item.value));

  return (
    <div className="glass rounded-3xl p-6">
      <div className="text-sm font-medium">Monthly Comparison</div>
      <div className="mt-1 text-xs text-muted-foreground">Last 6 months</div>
      <div className="mt-6 flex h-40 items-end justify-between gap-2">
        {months.map((month, index) => (
          <div key={month.month} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="bg-violet-azure w-full rounded-t-lg transition hover:opacity-80"
              style={{
                height: `${(month.value / max) * 100}%`,
                opacity: index === months.length - 1 ? 1 : 0.6,
              }}
            />
            <div className="font-mono text-[10px] text-muted-foreground">{month.month}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyReport() {
  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl p-7 lg:col-span-2">
      <div className="bg-gold/15 absolute -left-20 -top-20 h-72 w-72 rounded-full blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="text-gold h-4 w-4" />
            <div className="text-sm font-medium">Weekly Financial Report</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Auto-generated - Mar 4 to Mar 10</div>
        </div>
        <button className="bg-aurora shadow-glow-gold rounded-full px-4 py-2 text-xs text-primary-foreground">
          Open report
        </button>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-4">
        {[
          { key: "Spent", value: "R842", tail: "-12% wow" },
          { key: "Top cat", value: "Food", tail: "R316" },
          { key: "Saved", value: "R230", tail: "Auto" },
          { key: "Insights", value: "4", tail: "2 actionable" },
        ].map((stat) => (
          <div key={stat.key} className="glass rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {stat.key}
            </div>
            <div className="font-display mt-1 text-xl">{stat.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{stat.tail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
