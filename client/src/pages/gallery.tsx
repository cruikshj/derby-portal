import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Car, User, Filter, AlertCircle } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DerbyEventWithDetails, RegistrationWithDen } from "@shared/schema";

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

function ParticipantCard({ registration, votingCategories, showCarDetails, showParticipantPhotos }: { 
  registration: RegistrationWithDen;
  votingCategories: { id: string; name: string }[];
  showCarDetails: boolean;
  showParticipantPhotos: boolean;
}) {
  const selectedCategories = registration.votingCategoryIds
    ?.map((id) => votingCategories.find((c) => c.id === id)?.name)
    .filter(Boolean) || [];

  return (
    <Card className="overflow-hidden hover-elevate group" data-testid={`card-participant-${registration.id}`}>
      <div className="relative aspect-square bg-muted">
        {showParticipantPhotos && registration.participantPictureUrl ? (
          <img
            src={registration.participantPictureUrl}
            alt={registration.participantName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <h3 className="font-display font-semibold text-white text-lg">
            {registration.participantName}
          </h3>
          {registration.den && (
            <p className="text-white/80 text-sm">{registration.den.name}</p>
          )}
        </div>
      </div>
      {showCarDetails && (
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-16 rounded bg-muted overflow-hidden flex-shrink-0">
              {registration.carPictureUrl ? (
                <img
                  src={registration.carPictureUrl}
                  alt={registration.carName || "Car"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Car className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{registration.carName}</p>
              <p className="text-xs text-muted-foreground">Racing Car</p>
            </div>
          </div>
          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedCategories.map((cat, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {cat}
                </Badge>
              ))}
            </div>
          )}
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
  const [selectedDen, setSelectedDen] = useState<string>("all");

  const { data: activeEvent, isLoading } = useQuery<DerbyEventWithDetails>({
    queryKey: ["/api/events/active"],
  });

  const filteredRegistrations = selectedDen === "all"
    ? activeEvent?.registrations || []
    : activeEvent?.registrations?.filter((r) => r.denId === selectedDen) || [];

  const showCarDetails = useMemo(() => {
    return shouldShowCarDetails(
      activeEvent?.carDetailsVisibility,
      activeEvent?.votingEndDate
    );
  }, [activeEvent?.carDetailsVisibility, activeEvent?.votingEndDate]);

  const showParticipantPhotos = useMemo(() => {
    return shouldShowParticipantPhotos(
      activeEvent?.participantPhotosVisibility,
      activeEvent?.votingEndDate
    );
  }, [activeEvent?.participantPhotosVisibility, activeEvent?.votingEndDate]);

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
            {activeEvent.name} Participants
          </h1>
          <p className="text-muted-foreground">
            {activeEvent.registrations?.length || 0} racers registered
          </p>
        </div>

        {activeEvent.dens && activeEvent.dens.length > 0 && (
          <div className="flex justify-center mb-8">
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
                votingCategories={activeEvent.votingCategories || []}
                showCarDetails={showCarDetails}
                showParticipantPhotos={showParticipantPhotos}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
