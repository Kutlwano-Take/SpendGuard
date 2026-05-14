import { Activity, Cpu, DollarSign, GitBranch } from "lucide-react";
import { SectionHeader } from "./Dashboard";

export function Engineering() {
  const stats = [
    { icon: DollarSign, key: "R0.45", value: "per 1k requests", sub: "Average cost" },
    { icon: Activity, key: "99.99%", value: "uptime SLO", sub: "Multi-AZ target" },
    { icon: Cpu, key: "Auto", value: "scaling", sub: "Zero ops" },
    { icon: GitBranch, key: "CI/CD", value: "GitHub Actions", sub: "Deploy in under 2m" },
  ];

  return (
    <section className="px-4 py-28">
      <SectionHeader
        eyebrow="Engineering"
        title={
          <>
            Built like the <span className="text-gradient-aurora">team behind it</span>.
          </>
        }
        sub="Production-grade decisions, observable infrastructure, and a codebase that reads like it was built by hand."
      />

      <div className="mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.key} className="glass-strong rounded-3xl p-6">
            <div className="bg-violet-azure grid h-10 w-10 place-items-center rounded-xl">
              <stat.icon className="h-5 w-5 text-white" />
            </div>
            <div className="text-gradient-gold font-display mt-5 text-3xl">{stat.key}</div>
            <div className="mt-1 text-sm font-medium">{stat.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="glass mx-auto mt-6 max-w-6xl rounded-3xl p-7">
        <div className="mb-4 text-sm font-medium">Pipeline</div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
          {[
            "push -> main",
            "lint + build",
            "bundle frontend",
            "deploy assets",
            "invalidate CDN",
            "smoke test",
            "watch alarms",
          ].map((step, index, all) => (
            <span key={step} className="flex items-center gap-3">
              <span className="glass rounded-full px-3 py-1.5 text-foreground">{step}</span>
              {index < all.length - 1 ? <span className="text-gold">{">"}</span> : null}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
