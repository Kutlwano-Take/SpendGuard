import { ArrowRight, Github, Sparkles } from "lucide-react";

export function CTA() {
  return (
    <section className="px-4 py-28">
      <div className="relative mx-auto max-w-5xl">
        <div className="bg-aurora absolute -inset-6 rounded-[3rem] opacity-30 blur-3xl" />
        <div className="glass-strong shadow-elevated relative overflow-hidden rounded-[2rem] p-10 text-center md:p-16">
          <div className="grid-bg absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="relative">
            <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="text-gold h-3 w-3" />
              Open-source build
            </div>
            <h2 className="font-display mt-6 text-4xl font-semibold leading-[1] md:text-6xl">
              Spend with <span className="text-gradient-aurora">intelligence</span>.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
              Explore the code, review the architecture, and keep pushing SpendGuard toward a sharper product story.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="https://github.com/Kutlwano-Take/SpendGuard"
                target="_blank"
                rel="noreferrer"
                className="bg-aurora shadow-glow-gold inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium text-primary-foreground transition hover:scale-[1.02]"
              >
                <Github className="h-4 w-4" />
                View on GitHub
              </a>
              <a
                href="#architecture"
                className="glass-strong inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium transition hover:bg-white/5"
              >
                See Architecture
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="mailto:hello@spendguard.app"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium text-muted-foreground transition hover:text-foreground"
              >
                Get in touch {"->"}
              </a>
            </div>
          </div>
        </div>

        <footer className="mt-14 text-center text-xs text-muted-foreground">
          <div>&copy; {new Date().getFullYear()} SpendGuard · Built on AWS · Designed for clarity</div>
        </footer>
      </div>
    </section>
  );
}
