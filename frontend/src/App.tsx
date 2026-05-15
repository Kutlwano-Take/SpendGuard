import { Architecture } from "@/components/site/Architecture";
import { CTA } from "@/components/site/CTA";
import { Dashboard } from "@/components/site/Dashboard";
import { Engineering } from "@/components/site/Engineering";
import { Hero } from "@/components/site/Hero";
import { Insights } from "@/components/site/Insights";
import { Nav } from "@/components/site/Nav";
import { Security } from "@/components/site/Security";
import { SmartFeatures } from "@/components/site/SmartFeatures";
import { AuthProvider } from "@/lib/auth-context";

function App() {
  return (
    <AuthProvider>
      <main className="min-h-screen">
        <Nav />
        <Hero />
        <Dashboard />
        <Insights />
        <SmartFeatures />
        <Architecture />
        <Security />
        <Engineering />
        <CTA />
      </main>
    </AuthProvider>
  );
}

export default App;
