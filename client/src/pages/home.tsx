import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy, Calendar, Users, Clock, Vote, UserPlus, Scale, Info } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { parseDateTime, formatLocalDate, getTimeUntil, getTimeUntilColor } from "@/lib/date-utils";
import type { DerbyEventWithDetails } from "@shared/schema";

type PeriodStatus = "pending" | "open" | "closed";

function getRegistrationStatus(event: DerbyEventWithDetails): PeriodStatus {
  if (!event.registrationStartDate || !event.registrationEndDate) return "closed";
  const now = new Date();
  const start = parseDateTime(event.registrationStartDate);
  const end = parseDateTime(event.registrationEndDate);
  if (!start || !end) return "closed";
  if (now < start) return "pending";
  if (now > end) return "closed";
  return "open";
}

function getVotingStatus(event: DerbyEventWithDetails): PeriodStatus {
  if (!event.votingStartDate || !event.votingEndDate) return "closed";
  const now = new Date();
  const start = parseDateTime(event.votingStartDate);
  const end = parseDateTime(event.votingEndDate);
  if (!start || !end) return "closed";
  if (now < start) return "pending";
  if (now > end) return "closed";
  return "open";
}

function getStatusLabel(status: PeriodStatus): string {
  switch (status) {
    case "pending": return "Upcoming";
    case "open": return "Open";
    case "closed": return "Closed";
  }
}

export default function Home() {
  usePageTitle("Home");
  const { data: activeEvent, isLoading } = useQuery<DerbyEventWithDetails>({
    queryKey: ["/api/events/active"],
  });

  if (isLoading) {
    return (
      <div>
        <div className="relative py-20">
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
    <div>
      <section className="relative overflow-hidden py-16 sm:py-24">
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
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                {activeEvent?.info && activeEvent.info.trim().length > 0 && (
                  <Link href="/info">
                    <Button size="lg" variant="secondary" className="gap-2" data-testid="button-info-hero">
                      <Info className="h-5 w-5" />
                      Info
                    </Button>
                  </Link>
                )}
                {registrationStatus === "open" && (
                  <Link href="/register">
                    <Button size="lg" className="gap-2" data-testid="button-register-hero">
                      <UserPlus className="h-5 w-5" />
                      Register Your Racer
                    </Button>
                  </Link>
                )}
                {votingStatus === "open" && (
                  <Link href="/vote">
                    <Button size="lg" className="gap-2" data-testid="button-vote-hero">
                      <Vote className="h-5 w-5" />
                      Cast Your Votes
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
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(activeEvent.registrationStartDate || activeEvent.registrationEndDate) && (
                <div className="hover-elevate rounded-xl border bg-card border-card-border text-card-foreground shadow-sm" style={{ position: 'relative' }}>
                  {registrationStatus !== "pending" && (
                    <Badge 
                      variant={registrationStatus === "open" ? "default" : "secondary"}
                      style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10 }}
                    >
                      {getStatusLabel(registrationStatus)}
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <UserPlus className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Registration</CardTitle>
                    <CardDescription>
                      {formatLocalDate(registrationStatus === "pending" ? activeEvent.registrationStartDate : activeEvent.registrationEndDate, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-4xl font-display font-bold ${
                      registrationStatus === "pending" 
                        ? getTimeUntilColor(activeEvent.registrationStartDate)
                        : registrationStatus === "open"
                          ? getTimeUntilColor(activeEvent.registrationEndDate)
                          : "text-primary"
                    }`}>
                      {registrationStatus === "pending" 
                        ? getTimeUntil(activeEvent.registrationStartDate)
                        : registrationStatus === "open"
                          ? getTimeUntil(activeEvent.registrationEndDate)
                          : ""}
                    </p>
                  </CardContent>
                </div>
              )}

              {activeEvent.weighInDate && (
                <Card className="hover-elevate">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Scale className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Weigh-in</CardTitle>
                    <CardDescription>
                      {formatLocalDate(activeEvent.weighInDate, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-4xl font-display font-bold ${getTimeUntilColor(activeEvent.weighInDate)}`}>
                      {getTimeUntil(activeEvent.weighInDate)}
                    </p>
                  </CardContent>
                </Card>
              )}

              {(activeEvent.votingStartDate || activeEvent.votingEndDate) && (
                <Link href="/vote" className="block hover-elevate rounded-xl border bg-card border-card-border text-card-foreground shadow-sm" style={{ position: 'relative' }} data-testid="link-voting-card">
                  {votingStatus !== "pending" && (
                    <Badge 
                      variant={votingStatus === "open" ? "default" : "secondary"}
                      style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10 }}
                    >
                      {getStatusLabel(votingStatus)}
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Vote className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Voting</CardTitle>
                    <CardDescription>
                      {formatLocalDate(votingStatus === "pending" ? activeEvent.votingStartDate : activeEvent.votingEndDate, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-4xl font-display font-bold ${
                      votingStatus === "pending" 
                        ? getTimeUntilColor(activeEvent.votingStartDate)
                        : votingStatus === "open"
                          ? getTimeUntilColor(activeEvent.votingEndDate)
                          : "text-primary"
                    }`}>
                      {votingStatus === "pending" 
                        ? getTimeUntil(activeEvent.votingStartDate)
                        : votingStatus === "open"
                          ? getTimeUntil(activeEvent.votingEndDate)
                          : ""}
                    </p>
                  </CardContent>
                </Link>
              )}

              {activeEvent.eventDate && (
                <Card className="hover-elevate">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Trophy className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Race Day</CardTitle>
                    <CardDescription>
                      {formatLocalDate(activeEvent.eventDate, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-4xl font-display font-bold ${getTimeUntilColor(activeEvent.eventDate)}`}>
                      {getTimeUntil(activeEvent.eventDate)}
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
