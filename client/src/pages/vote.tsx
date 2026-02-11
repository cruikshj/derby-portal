import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy, Vote as VoteIcon, ChevronRight, ChevronLeft, Check, Loader2, Lock, LogIn, AlertCircle } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { parseDateTime, formatLocalDate } from "@/lib/date-utils";
import type { DerbyEventWithDetails, EventVoteWithDetails } from "@shared/schema";

type VotingStatus = "not_started" | "open" | "closed" | "no_vote";

function getVotingWindowStatus(event: DerbyEventWithDetails): VotingStatus {
  if (!event.votingStartDate || !event.votingEndDate) return "no_vote";
  const now = new Date();
  const start = parseDateTime(event.votingStartDate);
  const end = parseDateTime(event.votingEndDate);
  if (!start || !end) return "no_vote";
  if (now < start) return "not_started";
  if (now > end) return "closed";
  return "open";
}

type ParticipantBallotStatus = {
  registrationId: string;
  participantName: string;
  hasVoted: boolean;
};

type CategoryEntry = {
  registrationId: string;
  carName: string;
  carPictureUrl: string | null;
};

function VotingFlow({
  eventVote,
  participant,
  categories,
  eventId,
  onComplete,
}: {
  eventVote: EventVoteWithDetails;
  participant: ParticipantBallotStatus;
  categories: { id: string; name: string; description: string | null }[];
  eventId: string;
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const votableCategories = categories.filter((cat) => {
    const entries = (eventVote.categoryEntries || []).filter(
      (e) => e.votingCategoryId === cat.id && e.registrationId !== participant.registrationId
    );
    return entries.length > 0;
  });

  const currentCategory = votableCategories[step];
  const isLastStep = step === votableCategories.length - 1;
  const isReview = step === votableCategories.length;

  const getEntriesForCategory = (categoryId: string): CategoryEntry[] => {
    return (eventVote.categoryEntries || [])
      .filter((e) => e.votingCategoryId === categoryId && e.registrationId !== participant.registrationId)
      .map((e) => ({
        registrationId: e.registrationId,
        carName: e.registration?.carName || "Unknown Car",
        carPictureUrl: e.registration?.carPictureUrl || null,
      }));
  };

  const submitMutation = useMutation({
    mutationFn: () => {
      const votes = Object.entries(selections).map(([votingCategoryId, selectedRegistrationId]) => ({
        votingCategoryId,
        selectedRegistrationId,
      }));
      return apiRequest("POST", `/api/vote/${eventVote.id}/ballots`, {
        voterRegistrationId: participant.registrationId,
        votes,
      });
    },
    onSuccess: () => {
      toast({ title: "Votes Submitted", description: `${participant.participantName}'s votes have been recorded.` });
      onComplete();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to submit votes.", variant: "destructive" });
    },
  });

  if (votableCategories.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">No Categories Available</h3>
          <p className="text-muted-foreground">
            There are no voting categories available for {participant.participantName} right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isReview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review Your Votes</CardTitle>
          <CardDescription>
            Voting as {participant.participantName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {votableCategories.map((cat) => {
            const selectedId = selections[cat.id];
            const entries = getEntriesForCategory(cat.id);
            const selected = entries.find((e) => e.registrationId === selectedId);
            return (
              <div
                key={cat.id}
                className="flex items-center gap-3 p-3 rounded-md border"
                data-testid={`review-vote-${cat.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{cat.name}</p>
                  {selected ? (
                    <div className="flex items-center gap-2 mt-1">
                      {selected.carPictureUrl && (
                        <div className="h-8 w-12 rounded bg-muted overflow-hidden flex-shrink-0">
                          <img src={selected.carPictureUrl} alt={selected.carName} className="w-full h-full object-contain" />
                        </div>
                      )}
                      <span className="text-sm text-muted-foreground">{selected.carName}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No selection (skipped)</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(votableCategories.indexOf(cat))}
                  data-testid={`button-change-vote-${cat.id}`}
                >
                  Change
                </Button>
              </div>
            );
          })}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(votableCategories.length - 1)} data-testid="button-review-back">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              data-testid="button-submit-votes"
            >
              {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Check className="h-4 w-4 mr-1" />
              Submit Votes
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const entries = getEntriesForCategory(currentCategory.id);
  const selectedId = selections[currentCategory.id];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{currentCategory.name}</CardTitle>
            {currentCategory.description && (
              <CardDescription>{currentCategory.description}</CardDescription>
            )}
          </div>
          <Badge variant="secondary" data-testid="badge-step-progress">
            {step + 1} / {votableCategories.length}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Voting as <span className="font-medium">{participant.participantName}</span> — pick your favorite
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {entries.map((entry) => {
            const isSelected = selectedId === entry.registrationId;
            return (
              <div
                key={entry.registrationId}
                className={`cursor-pointer rounded-md overflow-hidden border-2 transition-colors ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-transparent hover-elevate"
                }`}
                onClick={() =>
                  setSelections((prev) => ({
                    ...prev,
                    [currentCategory.id]: entry.registrationId,
                  }))
                }
                data-testid={`vote-car-${currentCategory.id}-${entry.registrationId}`}
              >
                <div className="aspect-[4/3] bg-muted overflow-hidden">
                  {entry.carPictureUrl ? (
                    <img
                      src={entry.carPictureUrl}
                      alt={entry.carName}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Trophy className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-2 text-center">
                  <p className="font-medium text-sm truncate">{entry.carName}</p>
                </div>
                {isSelected && (
                  <div className="flex justify-center pb-2">
                    <Badge variant="default">
                      <Check className="h-3 w-3 mr-1" />
                      Selected
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            data-testid="button-vote-prev"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            onClick={() => setStep(step + 1)}
            data-testid="button-vote-next"
          >
            {isLastStep ? "Review" : "Next"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VotePage() {
  usePageTitle("Vote");
  const { user, isLoading: authLoading, isAuthenticated, login } = useAuth();
  const { toast } = useToast();
  const [activeParticipant, setActiveParticipant] = useState<string | null>(null);

  const { data: activeEvent, isLoading: eventLoading } = useQuery<DerbyEventWithDetails>({
    queryKey: ["/api/events/active"],
  });

  const { data: eventVote, isLoading: voteLoading } = useQuery<EventVoteWithDetails | null>({
    queryKey: ["/api/events", activeEvent?.id, "vote"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${activeEvent!.id}/vote`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch vote");
      return response.json();
    },
    enabled: !!activeEvent?.id && isAuthenticated,
  });

  const { data: ballotStatuses, refetch: refetchBallots } = useQuery<ParticipantBallotStatus[]>({
    queryKey: ["/api/vote", eventVote?.id, "ballots", "me"],
    queryFn: async () => {
      const response = await fetch(
        `/api/vote/${eventVote!.id}/ballots/me?eventId=${activeEvent!.id}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch ballots");
      return response.json();
    },
    enabled: !!eventVote?.id && !!activeEvent?.id && isAuthenticated,
  });

  if (authLoading || eventLoading) {
    return (
      <div className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-6 w-72 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="py-12">
        <div className="max-w-md mx-auto px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <LogIn className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display font-semibold text-xl mb-2">Sign In to Vote</h2>
              <p className="text-muted-foreground mb-6">
                You need to sign in to cast your votes for the Pinewood Derby car designs.
              </p>
              <Button onClick={login} data-testid="button-login-vote">Sign In</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!activeEvent) {
    return (
      <div className="py-12">
        <div className="max-w-md mx-auto px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <VoteIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display font-semibold text-xl mb-2">No Active Event</h2>
              <p className="text-muted-foreground">
                There is no active event with voting available right now.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const votingWindowStatus = getVotingWindowStatus(activeEvent);

  if (votingWindowStatus === "not_started") {
    return (
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>Voting Not Open Yet</CardTitle>
              <CardDescription>
                Voting for {activeEvent.name} is not open yet.
                {activeEvent.votingStartDate && activeEvent.votingEndDate && (
                  <span className="block mt-2">
                    Voting period: {formatLocalDate(activeEvent.votingStartDate)} - {formatLocalDate(activeEvent.votingEndDate)}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (votingWindowStatus === "closed" || votingWindowStatus === "no_vote") {
    return (
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>Voting Closed</CardTitle>
              <CardDescription>
                Voting for {activeEvent.name} is currently closed.
                {activeEvent.votingStartDate && activeEvent.votingEndDate && (
                  <span className="block mt-2">
                    Voting period: {formatLocalDate(activeEvent.votingStartDate)} - {formatLocalDate(activeEvent.votingEndDate)}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (voteLoading) {
    return (
      <div className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!eventVote || (eventVote.status !== "open" && eventVote.status !== "draft")) {
    return (
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>Voting Closed</CardTitle>
              <CardDescription>
                Voting for {activeEvent.name} is currently closed.
                {activeEvent.votingStartDate && activeEvent.votingEndDate && (
                  <span className="block mt-2">
                    Voting period: {formatLocalDate(activeEvent.votingStartDate)} - {formatLocalDate(activeEvent.votingEndDate)}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const votingNotYetStarted = activeEvent.votingStartDate && new Date() < new Date(activeEvent.votingStartDate);
  if (votingNotYetStarted) {
    return (
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>Voting Opens Soon</CardTitle>
              <CardDescription>
                Voting for {activeEvent.name} will open on {formatLocalDate(activeEvent.votingStartDate!)}.
                {activeEvent.votingEndDate && (
                  <span className="block mt-2">
                    Voting closes {formatLocalDate(activeEvent.votingEndDate)}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!ballotStatuses || ballotStatuses.length === 0) {
    return (
      <div className="py-12">
        <div className="max-w-md mx-auto px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <VoteIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display font-semibold text-xl mb-2">No Registrations Found</h2>
              <p className="text-muted-foreground mb-4">
                You need to have registered participants in this event to vote. Each registered participant gets one vote per category.
              </p>
              <Link href="/register">
                <Button data-testid="button-go-register">Register Now</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activeParticipantData = activeParticipant
    ? ballotStatuses.find((b) => b.registrationId === activeParticipant)
    : null;

  if (activeParticipantData && !activeParticipantData.hasVoted) {
    const categories = (activeEvent.votingCategories || []).filter((cat) => {
      const entries = (eventVote.categoryEntries || []).filter((e) => e.votingCategoryId === cat.id);
      return entries.length > 0;
    });

    return (
      <div className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setActiveParticipant(null)}
              data-testid="button-back-participants"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Participants
            </Button>
          </div>
          <VotingFlow
            eventVote={eventVote}
            participant={activeParticipantData}
            categories={categories}
            eventId={activeEvent.id}
            onComplete={() => {
              setActiveParticipant(null);
              refetchBallots();
            }}
          />
        </div>
      </div>
    );
  }

  const allVoted = ballotStatuses.every((b) => b.hasVoted);

  return (
    <div className="py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2">
            Vote for Your Favorites
          </h1>
          <p className="text-muted-foreground">
            {activeEvent.name} — Select a participant below to cast their votes
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Note: You will not be able to vote for your own car in any category.
          </p>
        </div>

        {allVoted && (
          <Card className="mb-6">
            <CardContent className="py-6 text-center">
              <Check className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="font-medium text-lg mb-1">All Votes Submitted</h3>
              <p className="text-sm text-muted-foreground">
                All of your participants have voted. Thank you for participating!
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {ballotStatuses.map((participant) => (
            <Card
              key={participant.registrationId}
              className={`${participant.hasVoted ? "" : "hover-elevate cursor-pointer"}`}
              onClick={() => !participant.hasVoted && setActiveParticipant(participant.registrationId)}
              data-testid={`participant-card-${participant.registrationId}`}
            >
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <VoteIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium" data-testid={`text-participant-name-${participant.registrationId}`}>
                      {participant.participantName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {participant.hasVoted ? "Votes submitted" : "Ready to vote"}
                    </p>
                  </div>
                </div>
                {participant.hasVoted ? (
                  <Badge variant="secondary" data-testid={`badge-voted-${participant.registrationId}`}>
                    <Check className="h-3 w-3 mr-1" />
                    Voted
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm" data-testid={`button-vote-${participant.registrationId}`}>
                    Cast Your Votes
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
