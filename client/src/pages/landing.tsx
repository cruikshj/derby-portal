import { Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/use-page-title";
import { usePackName } from "@/hooks/use-pack-name";

export default function Landing() {
  usePageTitle("Welcome");
  const { packName } = usePackName();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20 sm:py-32 flex-1 flex items-center">
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

      {packName && (
        <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <a
                  href="/terms-of-service"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover-elevate px-2 py-1 rounded-md flex items-center gap-1"
                  data-testid="link-landing-terms"
                >
                  Terms of Service
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover-elevate px-2 py-1 rounded-md flex items-center gap-1"
                  data-testid="link-landing-privacy"
                >
                  Privacy Policy
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
