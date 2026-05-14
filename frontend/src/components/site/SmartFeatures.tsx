import { BellRing, Brain, ScanLine, Sparkles, Tags, TrendingUp } from "lucide-react";
import { SectionHeader } from "./Dashboard";

export function SmartFeatures() {
  const features = [
    {
      icon: Brain,
      title: "Predictive Insights",
      body: "Forecast cash flow, flag anomalies, and prepare for upcoming bills before they land.",
    },
    {
      icon: ScanLine,
      title: "Receipt OCR",
      body: "Snap a receipt and extract merchants, totals, taxes, and line items in seconds.",
    },
    {
      icon: Tags,
      title: "Auto-Categorization",
      body: "Machine-led tagging improves every time you confirm or correct a transaction.",
    },
    {
      icon: BellRing,
      title: "Real-time Alerts",
      body: "Get push, email, or SMS alerts the moment a budget threshold is crossed.",
    },
    {
      icon: TrendingUp,
      title: "Smart Forecasts",
      body: "Project end-of-month spend with confidence bands based on real behaviour.",
    },
    {
      icon: Sparkles,
      title: "Goal Coaching",
      body: "Receive focused nudges to hit savings targets without lifestyle whiplash.",
    },
  ];

  return (
    <section id="smart" className="px-4 py-28">
      <SectionHeader
        eyebrow="Intelligence"
        title={
          <>
            Six engines, <span className="text-gradient-aurora">one companion</span>.
          </>
        }
        sub="SpendGuard is not a ledger. It is a team of small, focused AIs working in your pocket."
      />

      <div className="mx-auto mt-14 grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="glass group relative overflow-hidden rounded-3xl p-7 transition hover:bg-white/[0.04]"
          >
            <div className="bg-violet/0 absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl transition group-hover:bg-violet/20" />
            <div className="relative">
              <div className="bg-violet-azure shadow-glow-violet grid h-11 w-11 place-items-center rounded-2xl">
                <feature.icon className="h-5 w-5 text-white" />
              </div>
              <div className="font-display mt-5 text-xl">{feature.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
