import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Car, User, Filter, AlertCircle, Info, Eye, Award, ArrowLeftRight } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DerbyEventWithDetails, RegistrationWithDen, EventVoteWithDetails } from "@shared/schema";

type DerbyEventWithPreview = DerbyEventWithDetails & { adminPreviewMode?: boolean };

function VotingResultsBanner({ eventId, votingCategories }: { eventId: string; votingCategories: { id: string; name: string; description: string | null }[] }) {
  const { data: publishedResults } = useQuery<EventVoteWithDetails | null>({
    queryKey: ["/api/events", eventId, "results"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/results`, { credentials: "include" });
      if (!response.ok) return null;
      return response.json();
    },
  });

  if (!publishedResults || publishedResults.status !== "published" || !publishedResults.results?.length) {
    return null;
  }

  return (
    <div className="mb-8" data-testid="voting-results-section">
      <div className="text-center mb-4">
        <h2 className="font-display font-bold text-2xl flex items-center justify-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          Voting Results
        </h2>
        <p className="text-sm text-muted-foreground">Design category winners</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(() => {
          const grouped: Record<string, typeof publishedResults.results> = {};
          for (const result of publishedResults.results) {
            if (!grouped[result.votingCategoryId]) grouped[result.votingCategoryId] = [];
            grouped[result.votingCategoryId].push(result);
          }
          return Object.entries(grouped).map(([categoryId, categoryResults]) => {
            const category = votingCategories.find((c) => c.id === categoryId);
            if (!category) return null;
            return (
              <Card key={categoryId} data-testid={`result-card-${categoryId}`}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary flex-shrink-0" />
                    <Badge variant="secondary" className="text-xs">{category.name}</Badge>
                  </div>
                  {categoryResults.map((result) => {
                    if (!result.registration) return null;
                    return (
                      <div key={result.id} className="flex items-center gap-3" data-testid={`text-winner-car-${result.votingCategoryId}-${result.winnerRegistrationId}`}>
                        <div className="h-14 w-18 rounded-md bg-muted overflow-hidden flex-shrink-0">
                          {result.registration.carPictureUrl ? (
                            <img
                              src={result.registration.carPictureUrl}
                              alt={result.registration.carName || ""}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Trophy className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {result.registration.carName || "Unknown Car"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.registration.participantName}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          });
        })()}
      </div>
    </div>
  );
}

function shouldShowVisibility(
  visibility: string | null | undefined,
  votingEndDate: string | null | undefined,
  defaultValue: boolean = false
): boolean {
  if (!visibility || visibility === "hide") {
    return false;
  }
  if (visibility === "show") {
    return true;
  }
  if (visibility === "show_after_voting") {
    if (!votingEndDate) {
      return defaultValue;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDateStr = typeof votingEndDate === "string" ? votingEndDate : String(votingEndDate);
    const endDate = new Date(endDateStr + "T23:59:59");
    return today > endDate;
  }
  return defaultValue;
}

function shouldShowCarDetails(
  carDetailsVisibility: string | null | undefined,
  votingEndDate: string | null | undefined
): boolean {
  return shouldShowVisibility(carDetailsVisibility, votingEndDate, false);
}

function shouldShowParticipantPhotos(
  participantPhotosVisibility: string | null | undefined,
  votingEndDate: string | null | undefined
): boolean {
  return shouldShowVisibility(participantPhotosVisibility, votingEndDate, true);
}

function ParticipantCard({ registration, showCarDetails, showParticipantPhotos, carView }: { 
  registration: RegistrationWithDen;
  showCarDetails: boolean;
  showParticipantPhotos: boolean;
  carView: boolean;
}) {
  const showCar = showCarDetails && carView;

  const heroImage = showCar
    ? registration.carPictureUrl
    : (showParticipantPhotos ? registration.participantPictureUrl : null);
  const heroAlt = showCar
    ? (registration.carName || "Car")
    : registration.participantName;
  const heroFallbackIcon = showCar
    ? <Car className="h-16 w-16 text-muted-foreground" />
    : <User className="h-16 w-16 text-muted-foreground" />;
  const heroLabel = showCar ? (registration.carName || "Car") : registration.participantName;
  const heroSublabel = showCar ? null : (registration.den ? registration.den.name : null);

  const secondaryImage = showCar
    ? (showParticipantPhotos ? registration.participantPictureUrl : null)
    : registration.carPictureUrl;
  const secondaryAlt = showCar ? registration.participantName : (registration.carName || "Car");
  const secondaryFallbackIcon = showCar
    ? <User className="h-6 w-6 text-muted-foreground" />
    : <Car className="h-6 w-6 text-muted-foreground" />;
  const secondaryLabel = showCar ? registration.participantName : registration.carName;
  const secondarySublabel = showCar
    ? (registration.den ? registration.den.name : null)
    : "Racing Car";

  return (
    <Card className="overflow-hidden hover-elevate group" data-testid={`card-participant-${registration.id}`}>
      <div className="relative aspect-square bg-muted">
        {heroImage ? (
          <img
            src={heroImage}
            alt={heroAlt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {heroFallbackIcon}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <h3 className="font-display font-semibold text-white text-lg">
            {heroLabel}
          </h3>
          {heroSublabel && (
            <p className="text-white/80 text-sm">{heroSublabel}</p>
          )}
        </div>
      </div>
      {showCarDetails && (
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-16 rounded bg-muted overflow-hidden flex-shrink-0">
              {secondaryImage ? (
                <img
                  src={secondaryImage}
                  alt={secondaryAlt}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {secondaryFallbackIcon}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{secondaryLabel}</p>
              {secondarySublabel && (
                <p className="text-xs text-muted-foreground">{secondarySublabel}</p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-square" />
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-12 w-16 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Gallery() {
  usePageTitle("Gallery");
  const { user } = useAuth();
  const [selectedDen, setSelectedDen] = useState<string>("all");
  const [previewRequested, setPreviewRequested] = useState<boolean>(false);
  const [carView, setCarView] = useState<boolean>(false);

  const { data: activeEvent, isLoading } = useQuery<DerbyEventWithPreview>({
    queryKey: ["/api/events/active", previewRequested ? "preview" : "normal"],
    queryFn: async () => {
      const url = previewRequested 
        ? "/api/events/active?adminPreview=true" 
        : "/api/events/active";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch active event");
      return response.json();
    },
  });

  const isAdmin = user?.isAdmin === true;
  const adminPreviewActive = activeEvent?.adminPreviewMode === true;

  const filteredRegistrations = selectedDen === "all"
    ? activeEvent?.registrations || []
    : activeEvent?.registrations?.filter((r) => r.denId === selectedDen) || [];

  const normalShowCarDetails = useMemo(() => {
    return shouldShowCarDetails(
      activeEvent?.carDetailsVisibility,
      activeEvent?.votingEndDate
    );
  }, [activeEvent?.carDetailsVisibility, activeEvent?.votingEndDate]);

  const normalShowParticipantPhotos = useMemo(() => {
    return shouldShowParticipantPhotos(
      activeEvent?.participantPhotosVisibility,
      activeEvent?.votingEndDate
    );
  }, [activeEvent?.participantPhotosVisibility, activeEvent?.votingEndDate]);

  const showCarDetails = adminPreviewActive || normalShowCarDetails;
  const showParticipantPhotos = adminPreviewActive || normalShowParticipantPhotos;
  
  const hasHiddenContent = !normalShowCarDetails || !normalShowParticipantPhotos;

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>
          <GallerySkeleton />
        </div>
      </div>
    );
  }

  if (!activeEvent) {
    return (
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>No Active Event</CardTitle>
              <CardDescription>
                There is no active derby event at this time. Please check back later.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2">
            {activeEvent.name} Gallery
          </h1>
        </div>

        <VotingResultsBanner
          eventId={activeEvent.id}
          votingCategories={activeEvent.votingCategories || []}
        />

        <div className="text-center mb-4">
          <h2 className="font-display font-bold text-2xl flex items-center justify-center gap-2">
            <User className="h-6 w-6 text-primary" />
            Participants
          </h2>
          <p className="text-sm text-muted-foreground">{activeEvent.registrations?.length || 0} racers registered</p>
          {showCarDetails && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCarView((v) => !v)}
                className="toggle-elevate"
                data-testid="button-toggle-car-view"
              >
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                {carView ? "Show Participants" : "Show Cars"}
              </Button>
            </div>
          )}
        </div>

        {hasHiddenContent && (
          <div className="flex flex-col items-center gap-2 mb-6" data-testid="visibility-notes">
            {adminPreviewActive && (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg" data-testid="note-admin-preview-active">
                <Eye className="h-4 w-4" />
                <span>Admin preview mode is active - showing all hidden content</span>
                <button
                  onClick={() => setPreviewRequested(false)}
                  className="ml-2 underline hover:no-underline"
                  data-testid="button-exit-preview"
                >
                  Exit preview
                </button>
              </div>
            )}
            {!adminPreviewActive && !normalShowParticipantPhotos && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg" data-testid="note-photos-hidden">
                <Info className="h-4 w-4" />
                <span>
                  {activeEvent.participantPhotosVisibility === "show_after_voting"
                    ? "Participant photos will be visible after voting ends"
                    : "Participant photos are currently hidden"}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setPreviewRequested(true)}
                    className="ml-2 text-primary underline hover:no-underline"
                    data-testid="button-preview-photos"
                  >
                    Preview (admin only)
                  </button>
                )}
              </div>
            )}
            {!adminPreviewActive && !normalShowCarDetails && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg" data-testid="note-car-details-hidden">
                <Info className="h-4 w-4" />
                <span>
                  {activeEvent.carDetailsVisibility === "show_after_voting"
                    ? "Car details will be visible after voting ends"
                    : "Car details are currently hidden"}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setPreviewRequested(true)}
                    className="ml-2 text-primary underline hover:no-underline"
                    data-testid="button-preview-car-details"
                  >
                    Preview (admin only)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeEvent.dens && activeEvent.dens.length > 0 && (
          <div className="flex justify-center mb-6">
            <Tabs value={selectedDen} onValueChange={setSelectedDen}>
              <TabsList className="flex-wrap h-auto gap-1 p-1" data-testid="tabs-den-filter">
                <TabsTrigger value="all" data-testid="tab-all">
                  All Dens
                </TabsTrigger>
                {activeEvent.dens.map((den) => (
                  <TabsTrigger key={den.id} value={den.id} data-testid={`tab-den-${den.id}`}>
                    {den.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {filteredRegistrations.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-12 w-12 text-primary" />
            </div>
            <h2 className="font-display font-semibold text-xl mb-2">No Registrations Yet</h2>
            <p className="text-muted-foreground">
              {selectedDen === "all"
                ? "Be the first to register for the derby!"
                : "No one has registered in this den yet."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredRegistrations.map((registration) => (
              <ParticipantCard
                key={registration.id}
                registration={registration}
                showCarDetails={showCarDetails}
                showParticipantPhotos={showParticipantPhotos}
                carView={carView}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
