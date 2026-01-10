import { Trophy, Users, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
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
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Cub Scout Pinewood Derby</span>
            </div>
            
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

      <section className="py-16 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-center mb-12">
            What You Can Do
          </h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center" data-testid="card-feature-register">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2" data-testid="text-feature-register-title">Register Your Racer</h3>
                <p className="text-sm text-muted-foreground" data-testid="text-feature-register-desc">
                  Sign up your scout and their car for the upcoming derby event.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="card-feature-gallery">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2" data-testid="text-feature-gallery-title">View Gallery</h3>
                <p className="text-sm text-muted-foreground" data-testid="text-feature-gallery-desc">
                  Browse all registered participants and their creative car designs.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="card-feature-updates">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2" data-testid="text-feature-updates-title">Event Updates</h3>
                <p className="text-sm text-muted-foreground" data-testid="text-feature-updates-desc">
                  Stay informed about event dates, rules, and announcements.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="card-feature-security">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2" data-testid="text-feature-security-title">Secure Access</h3>
                <p className="text-sm text-muted-foreground" data-testid="text-feature-security-desc">
                  Your information is protected with secure authentication.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="py-8 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          Cub Scout Pinewood Derby Portal
        </div>
      </footer>
    </div>
  );
}
