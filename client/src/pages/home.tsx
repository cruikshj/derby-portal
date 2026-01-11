import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy, Calendar, Users, Clock, ArrowRight, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { parseLocalDate, formatLocalDate } from "@/lib/date-utils";
import type { DerbyEventWithDetails } from "@shared/schema";

type PeriodStatus = "pending" | "open" | "closed";

function getRegistrationStatus(event: DerbyEventWithDetails): PeriodStatus {
  if (!event.registrationStartDate || !event.registrationEndDate) return "closed";
  const now = new Date();
  const start = parseLocalDate(event.registrationStartDate);
  const end = parseLocalDate(event.registrationEndDate);
  if (!start || !end) return "closed";
  if (now < start) return "pending";
  if (now > end) return "closed";
  return "open";
}

function getVotingStatus(event: DerbyEventWithDetails): PeriodStatus {
  if (!event.votingStartDate || !event.votingEndDate) return "closed";
  const now = new Date();
  const start = parseLocalDate(event.votingStartDate);
  const end = parseLocalDate(event.votingEndDate);
  if (!start || !end) return "closed";
  if (now < start) return "pending";
  if (now > end) return "closed";
  return "open";
}

function getStatusLabel(status: PeriodStatus): string {
  switch (status) {
    case "pending": return "Pending";
    case "open": return "Open";
    case "closed": return "Closed";
  }
}

function getTimeUntil(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = parseLocalDate(dateStr);
  if (!date) return "";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

export default function Home() {
  const { data: activeEvent, isLoading } = useQuery<DerbyEventWithDetails>({
    queryKey: ["/api/events/active"],
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

  const registrationStatus = activeEvent ? getRegistrationStatus(activeEvent) : "closed";
  const votingStatus = activeEvent ? getVotingStatus(activeEvent) : "closed";

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 sm:py-24">
        <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.08]" style={{
          backgroundImage: `repeating-conic-gradient(from 0deg, currentColor 0deg 90deg, transparent 90deg 180deg)`,
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(135deg, black 0%, transparent 60%)',
          WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 60%)',
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
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
                      {formatLocalDate(activeEvent.eventDate, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {(activeEvent.registrationStartDate || activeEvent.registrationEndDate) && (
                  <Badge variant={registrationStatus === "open" ? "default" : "secondary"} className="text-sm px-4 py-2">
                    Registration {getStatusLabel(registrationStatus)}
                  </Badge>
                )}
                {(activeEvent.votingStartDate || activeEvent.votingEndDate) && (
                  <Badge variant={votingStatus === "open" ? "default" : "secondary"} className="text-sm px-4 py-2">
                    Voting {getStatusLabel(votingStatus)}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                {registrationStatus === "open" && (
                  <Link href="/register">
                    <Button size="lg" className="gap-2" data-testid="button-register-hero">
                      Register Your Racer
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
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
            <div className="flex flex-nowrap justify-center gap-6">
              <Card className="hover-elevate flex-1">
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

              <Card className="hover-elevate flex-1">
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

              {(activeEvent.registrationStartDate || activeEvent.registrationEndDate) && (
                <Card className="hover-elevate flex-1">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Registration {getStatusLabel(registrationStatus)}</CardTitle>
                    {registrationStatus !== "closed" && (
                      <CardDescription>
                        {registrationStatus === "pending" ? "Starts in" : "Time remaining"}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-display font-bold text-primary">
                      {registrationStatus === "pending" 
                        ? getTimeUntil(activeEvent.registrationStartDate)
                        : registrationStatus === "open"
                          ? getTimeUntil(activeEvent.registrationEndDate)
                          : ""}
                    </p>
                  </CardContent>
                </Card>
              )}

              {(activeEvent.votingStartDate || activeEvent.votingEndDate) && (
                <Card className="hover-elevate flex-1">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Vote className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Voting {getStatusLabel(votingStatus)}</CardTitle>
                    {votingStatus !== "closed" && (
                      <CardDescription>
                        {votingStatus === "pending" ? "Starts in" : "Time remaining"}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-display font-bold text-primary">
                      {votingStatus === "pending" 
                        ? getTimeUntil(activeEvent.votingStartDate)
                        : votingStatus === "open"
                          ? getTimeUntil(activeEvent.votingEndDate)
                          : ""}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
