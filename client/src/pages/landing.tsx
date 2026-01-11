import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/use-page-title";

export default function Landing() {
  usePageTitle("Welcome");
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20 sm:py-32">
        <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.08]" style={{
          backgroundImage: `repeating-conic-gradient(from 0deg, currentColor 0deg 90deg, transparent 90deg 180deg)`,
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(135deg, black 0%, transparent 60%)',
          WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 60%)',
        }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight mb-6" data-testid="text-landing-title">
              Pinewood Derby Portal
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10" data-testid="text-landing-description">
              Register your racer, view the gallery, check results, and stay updated with all derby events. Sign in to get started.
            </p>
            
            <a href="/api/login" data-testid="button-login-hero">
              <Button size="lg" className="gap-2 text-lg px-8">
                <Shield className="h-5 w-5" />
                Sign In to Continue
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
