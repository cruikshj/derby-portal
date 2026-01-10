import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy, Calendar, Users, Clock, ArrowRight, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DerbyEventWithDetails } from "@shared/schema";

interface BandStatus {
  configured: boolean;
}

function isRegistrationOpen(event: DerbyEventWithDetails): boolean {
  if (!event.registrationStartDate || !event.registrationEndDate) return false;
  const now = new Date();
  const start = new Date(event.registrationStartDate);
  const end = new Date(event.registrationEndDate);
  return now >= start && now <= end;
}

function getTimeUntil(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return "Ended";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

export default function Home() {
  const { data: activeEvent, isLoading } = useQuery<DerbyEventWithDetails>({
    queryKey: ["/api/events/active"],
  });
  
  const { data: bandStatus } = useQuery<BandStatus>({
    queryKey: ["/api/band/status"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-8" />
            <Skeleton className="h-12 w-48" />
          </div>
        </div>
      </div>
    );
  }

  const registrationOpen = activeEvent ? isRegistrationOpen(activeEvent) : false;

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 sm:py-24">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Cub Scout Pack Event</span>
          </div>
          
          {activeEvent ? (
            <>
              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight mb-4">
                {activeEvent.name}
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                {activeEvent.description || "Get ready for an exciting day of racing, fun, and friendly competition!"}
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-10">
                {activeEvent.eventDate && (
                  <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg border">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="font-medium">
                      {new Date(activeEvent.eventDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                <Badge variant={registrationOpen ? "default" : "secondary"} className="text-sm px-4 py-2">
                  {registrationOpen ? "Registration Open" : "Registration Closed"}
                </Badge>
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                {registrationOpen && (
                  <Link href="/register">
                    <Button size="lg" className="gap-2" data-testid="button-register-hero">
                      Register Your Racer
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
                <Link href="/gallery">
                  <Button size="lg" variant="outline" className="gap-2" data-testid="button-gallery-hero">
                    <Trophy className="h-5 w-5" />
                    View Participants
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight mb-4">
                Pinewood Derby Portal
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                No active derby event at this time. Check back soon for upcoming events!
              </p>
            </>
          )}
        </div>
      </section>

      {activeEvent && (
        <section className="py-16 bg-card/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="hover-elevate">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Registered Racers</CardTitle>
                  <CardDescription>Scouts ready to compete</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-display font-bold text-primary">
                    {activeEvent.registrations?.length || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Dens Competing</CardTitle>
                  <CardDescription>Categories in the race</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-display font-bold text-primary">
                    {activeEvent.dens?.length || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Registration Ends</CardTitle>
                  <CardDescription>
                    {registrationOpen ? "Time remaining" : "Registration period"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-display font-bold text-primary">
                    {getTimeUntil(activeEvent.registrationEndDate)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl mb-4">Quick Links</h2>
            <p className="text-muted-foreground">Everything you need for the derby</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/register">
              <Card className="hover-elevate cursor-pointer h-full" data-testid="card-quick-register">
                <CardHeader className="text-center">
                  <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                  <CardTitle className="text-lg">Register</CardTitle>
                  <CardDescription>Sign up your racer</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/gallery">
              <Card className="hover-elevate cursor-pointer h-full" data-testid="card-quick-gallery">
                <CardHeader className="text-center">
                  <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
                  <CardTitle className="text-lg">Gallery</CardTitle>
                  <CardDescription>See all participants</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/rules">
              <Card className="hover-elevate cursor-pointer h-full" data-testid="card-quick-rules">
                <CardHeader className="text-center">
                  <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
                  <CardTitle className="text-lg">Rules</CardTitle>
                  <CardDescription>Read the guidelines</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            {bandStatus?.configured && (
              <Link href="/band">
                <Card className="hover-elevate cursor-pointer h-full" data-testid="card-quick-band">
                  <CardHeader className="text-center">
                    <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
                    <CardTitle className="text-lg">Band Updates</CardTitle>
                    <CardDescription>Latest posts & events</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
