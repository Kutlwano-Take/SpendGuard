import { Eye, FileCheck, Fingerprint, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { SectionHeader } from "./Dashboard";

export function Security() {
  const items = [
    { icon: Lock, title: "AES-256 at rest", body: "All records are encrypted in DynamoDB with KMS-managed keys." },
    { icon: ShieldCheck, title: "TLS 1.3 in transit", body: "End-to-end transport security protects every client and edge hop." },
    { icon: Fingerprint, title: "Cognito auth ready", body: "MFA, biometrics, and OAuth can slot in cleanly when needed." },
    { icon: Eye, title: "Privacy-first", body: "Data stays tenant-aware and insight generation does not leak across accounts." },
    { icon: KeyRound, title: "Least privilege IAM", body: "Each service owns only the permissions it needs to do its job." },
    { icon: FileCheck, title: "Audit-friendly logging", body: "CloudWatch and CloudTrail keep operations observable and reviewable." },
  ];

  return (
    <section id="security" className="px-4 py-28">
      <SectionHeader
        eyebrow="Security and Trust"
        title={
          <>
            Money deserves <span className="text-gradient-aurora">bank-grade trust</span>.
          </>
        }
        sub="Security is not a section in the deck. It is the default at every layer."
      />

      <div className="mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="glass flex gap-4 rounded-2xl p-6">
            <div className="bg-gold/15 text-gold grid h-10 w-10 shrink-0 place-items-center rounded-xl">
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{item.body}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
