import { Bell, Brain, Database, Globe, Server, User } from "lucide-react";
import { SectionHeader } from "./Dashboard";

export function Architecture() {
  const nodes = [
    { icon: User, label: "User", sub: "Web and mobile" },
    { icon: Globe, label: "CloudFront", sub: "Edge CDN" },
    { icon: Server, label: "API Gateway", sub: "REST and WebSocket" },
    { icon: Database, label: "Lambda", sub: "Serverless compute" },
    { icon: Database, label: "DynamoDB", sub: "Single-digit ms" },
    { icon: Brain, label: "AI Services", sub: "Bedrock and Comprehend" },
    { icon: Bell, label: "SNS and SES", sub: "Real-time alerts" },
  ];

  return (
    <section id="architecture" className="relative px-4 py-28">
      <div className="grid-bg absolute inset-0 -z-10 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <SectionHeader
        eyebrow="Architecture"
        title={
          <>
            Serverless. Event-driven. <span className="text-gradient-aurora">Engineered for scale.</span>
          </>
        }
        sub="Every interaction flows through a hardened AWS pipeline with clear ownership and no generator branding."
      />

      <div className="glass-strong shadow-elevated mx-auto mt-14 max-w-6xl rounded-3xl p-6 md:p-10">
        <div className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-7">
          {nodes.map((node, index) => (
            <div key={node.label} className="flex items-center gap-3 md:flex-col">
              <div className="flex w-full flex-col items-center text-center">
                <div className="glass relative grid h-14 w-14 place-items-center rounded-2xl">
                  <node.icon className="h-5 w-5 text-foreground" />
                  <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
                </div>
                <div className="mt-2 text-xs font-medium">{node.label}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{node.sub}</div>
              </div>
              {index < nodes.length - 1 ? (
                <div className="relative hidden h-px flex-1 bg-gradient-to-r from-violet/40 to-azure/40 md:block">
                  <span className="bg-azure shadow-glow-violet absolute -top-1 right-0 h-2 w-2 rounded-full" />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Serverless",
              body: "No infrastructure to babysit. Lambda scales to zero and then back up on demand.",
            },
            {
              label: "Event-driven",
              body: "EventBridge orchestrates flows so every change triggers the right downstream behaviour.",
            },
            {
              label: "Globally fast",
              body: "Edge delivery and lightweight APIs keep p99 response times under control.",
            },
          ].map((card) => (
            <div key={card.label} className="glass rounded-2xl p-5">
              <div className="text-gold text-xs uppercase tracking-widest">{card.label}</div>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {[
            "Lambda",
            "API Gateway",
            "DynamoDB",
            "S3",
            "Cognito",
            "CloudFront",
            "SNS",
            "EventBridge",
            "Bedrock",
            "CloudWatch",
          ].map((token) => (
            <span key={token} className="glass rounded-full px-3 py-1 font-mono text-xs text-muted-foreground">
              {token}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
