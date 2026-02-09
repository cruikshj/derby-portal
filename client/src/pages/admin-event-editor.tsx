import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Plus,
  Settings,
  Calendar,
  Users,
  Trophy,
  Trash2,
  Loader2,
  GripVertical,
  Shield,
  Lock,
  AlertTriangle,
  FileText,
  Info,
  Download,
  Vote,
  Check,
  Eye,
  Send,
  Eraser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { formatLocalDate, toFormValue } from "@/lib/date-utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { DerbyEventWithDetails, Den, VotingCategory, RegistrationWithDen, EventVoteWithDetails, VoteTally } from "@shared/schema";

const eventFormSchema = z.object({
  name: z.string().min(2, "Event name must be at least 2 characters"),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  registrationStartDate: z.string().optional(),
  registrationEndDate: z.string().optional(),
  votingStartDate: z.string().optional(),
  votingEndDate: z.string().optional(),
  weighInDate: z.string().optional(),
  isActive: z.boolean().default(true),
  carDetailsVisibility: z.enum(["hide", "show", "show_after_voting"]).default("hide"),
  participantPhotosVisibility: z.enum(["hide", "show", "show_after_voting"]).default("show"),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

function DenManager({ eventId, dens }: { eventId: string; dens: Den[] }) {
  const [newDen, setNewDen] = useState("");
  const { toast } = useToast();

  const addMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/dens", { eventId, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/active"] });
      setNewDen("");
      toast({ title: "Den Added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (denId: string) => apiRequest("DELETE", `/api/dens/${denId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/active"] });
      toast({ title: "Den Removed" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newDen}
          onChange={(e) => setNewDen(e.target.value)}
          placeholder="Den name (e.g., Tiger Den, Wolf Den)"
          data-testid="input-new-den"
        />
        <Button
          onClick={() => newDen && addMutation.mutate(newDen)}
          disabled={!newDen || addMutation.isPending}
          data-testid="button-add-den"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        {dens.map((den) => (
          <div
            key={den.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            data-testid={`den-item-${den.id}`}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span>{den.name}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMutation.mutate(den.id)}
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-den-${den.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {dens.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No dens configured. Add dens for participants to select during registration.
          </p>
        )}
      </div>
    </div>
  );
}

function CategoryManager({ eventId, categories }: { eventId: string; categories: VotingCategory[] }) {
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const { toast } = useToast();

  const addMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      apiRequest("POST", "/api/voting-categories", { eventId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/active"] });
      setNewCategory("");
      setNewDescription("");
      toast({ title: "Category Added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => apiRequest("DELETE", `/api/voting-categories/${categoryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/active"] });
      toast({ title: "Category Removed" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Category name (e.g., Most Creative)"
          data-testid="input-new-category"
        />
        <div className="flex gap-2">
          <Input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            data-testid="input-category-description"
          />
          <Button
            onClick={() => newCategory && addMutation.mutate({ name: newCategory, description: newDescription })}
            disabled={!newCategory || addMutation.isPending}
            data-testid="button-add-category"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            data-testid={`category-item-${category.id}`}
          >
            <div>
              <span className="font-medium">{category.name}</span>
              {category.description && (
                <p className="text-sm text-muted-foreground">{category.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMutation.mutate(category.id)}
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-category-${category.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No voting categories configured. Add categories for car design judging.
          </p>
        )}
      </div>
    </div>
  );
}

function RegistrationManager({ eventId, registrations }: { eventId: string; registrations: RegistrationWithDen[] }) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const response = await fetch(`/api/registrations/${registrationId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to delete registration");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/active"] });
      setDeletingId(null);
      toast({ title: "Registration Deleted", description: "The registration has been removed." });
    },
    onError: () => {
      setDeletingId(null);
      toast({
        title: "Error",
        description: "Failed to delete registration.",
        variant: "destructive",
      });
    },
  });

  if (registrations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No registrations yet for this event.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {registrations.map((reg) => (
        <div
          key={reg.id}
          className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
          data-testid={`registration-item-${reg.id}`}
        >
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {reg.participantPictureUrl ? (
              <img
                src={reg.participantPictureUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <Users className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{reg.participantName}</p>
            <p className="text-sm text-muted-foreground truncate">
              {reg.carName || "No car details"} {reg.den?.name ? `• ${reg.den.name}` : ""}
            </p>
            {reg.user?.name && (
              <p className="text-xs text-muted-foreground truncate">
                Registered by: {reg.user.name}
              </p>
            )}
          </div>
          <AlertDialog open={deletingId === reg.id} onOpenChange={(open) => !open && setDeletingId(null)}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeletingId(reg.id)}
                disabled={deleteMutation.isPending}
                data-testid={`button-delete-registration-${reg.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Registration</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the registration for {reg.participantName}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate(reg.id)}
                  disabled={deleteMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );
}

function ExportButton({ eventId, eventName, disabled }: { eventId: string; eventName: string; disabled: boolean }) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/events/${eventId}/export`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to export registrations");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = eventName.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_").toLowerCase();
      a.download = `${safeName}_roster.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({ title: "Export Complete", description: "Roster and photos have been exported." });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export registrations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={disabled || isExporting}
      data-testid="button-export-roster"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Export
    </Button>
  );
}

function RulesEditor({ eventDetails }: { eventDetails: DerbyEventWithDetails }) {
  const { toast } = useToast();
  const [rules, setRules] = useState(eventDetails.rules || "");

  useEffect(() => {
    setRules(eventDetails.rules || "");
  }, [eventDetails.rules]);

  const updateMutation = useMutation({
    mutationFn: (newRules: string) => 
      apiRequest("PATCH", `/api/events/${eventDetails.id}`, { rules: newRules || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventDetails.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/active"] });
      toast({ title: "Rules Updated", description: "Derby rules have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update rules.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="rules">Derby Rules (Markdown supported)</Label>
        <Textarea
          id="rules"
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder="Enter the official derby rules and guidelines here...

Example:
# Car Specifications
- Maximum weight: 5 ounces
- Maximum width: 2.75 inches
- Minimum clearance: 0.375 inches

# Race Day Rules
1. All cars must pass inspection before racing
2. Participants must be present for their heats
..."
          className="min-h-[400px] font-mono text-sm"
          data-testid="textarea-rules"
        />
        <p className="text-sm text-muted-foreground">
          Use Markdown formatting for headings, lists, and emphasis. These rules will be displayed on the Rules page.
        </p>
      </div>
      <Button
        onClick={() => updateMutation.mutate(rules)}
        disabled={updateMutation.isPending}
        data-testid="button-save-rules"
      >
        {updateMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Rules"
        )}
      </Button>
    </div>
  );
}

function InfoEditor({ eventDetails }: { eventDetails: DerbyEventWithDetails }) {
  const { toast } = useToast();
  const [info, setInfo] = useState(eventDetails.info || "");

  useEffect(() => {
    setInfo(eventDetails.info || "");
  }, [eventDetails.info]);

  const updateMutation = useMutation({
    mutationFn: (newInfo: string) => 
      apiRequest("PATCH", `/api/events/${eventDetails.id}`, { info: newInfo || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventDetails.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/active"] });
      toast({ title: "Info Updated", description: "Event information has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update info.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="info">Event Information (Markdown supported)</Label>
        <Textarea
          id="info"
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          placeholder="Enter event information here...

Example:
# Event Details
- Location: Community Center
- Check-in: 8:00 AM
- Racing starts: 9:00 AM

# What to Bring
1. Your car
2. Enthusiasm
..."
          className="min-h-[400px] font-mono text-sm"
          data-testid="textarea-info"
        />
        <p className="text-sm text-muted-foreground">
          Use Markdown formatting for headings, lists, and emphasis. This information will be displayed on the Info page.
        </p>
      </div>
      <Button
        onClick={() => updateMutation.mutate(info)}
        disabled={updateMutation.isPending}
        data-testid="button-save-info"
      >
        {updateMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Info"
        )}
      </Button>
    </div>
  );
}

function VoteManager({ eventDetails }: { eventDetails: DerbyEventWithDetails }) {
  const { toast } = useToast();

  const { data: eventVote, isLoading: voteLoading } = useQuery<EventVoteWithDetails | null>({
    queryKey: ["/api/events", eventDetails.id, "vote"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventDetails.id}/vote`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch vote");
      return response.json();
    },
  });

  const { data: tallyData } = useQuery<{ tally: VoteTally[]; totalBallots: number }>({
    queryKey: ["/api/vote", eventVote?.id, "tally"],
    queryFn: async () => {
      const response = await fetch(`/api/vote/${eventVote!.id}/tally`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch tally");
      return response.json();
    },
    enabled: !!eventVote?.id,
  });
  const tally = tallyData?.tally;
  const totalBallots = tallyData?.totalBallots ?? 0;

  const createVoteMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/events/${eventDetails.id}/vote`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventDetails.id, "vote"] });
      toast({ title: "Vote Created", description: "Vote has been created with pre-filled entries from registrations." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create vote.", variant: "destructive" });
    },
  });

  const deleteVoteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/vote/${eventVote!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventDetails.id, "vote"] });
      toast({ title: "Vote Deleted", description: "The vote and all associated data have been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete vote.", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => apiRequest("PATCH", `/api/vote/${eventVote!.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventDetails.id, "vote"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vote", eventVote?.id, "tally"] });
      toast({ title: "Status Updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const clearBallotsMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/vote/${eventVote!.id}/clear-ballots`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventDetails.id, "vote"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vote", eventVote?.id, "tally"] });
      toast({ title: "Votes Cleared", description: "All ballots and results have been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to clear votes.", variant: "destructive" });
    },
  });

  const setCategoryEntriesMutation = useMutation({
    mutationFn: ({ categoryId, registrationIds }: { categoryId: string; registrationIds: string[] }) =>
      apiRequest("PUT", `/api/vote/${eventVote!.id}/categories/${categoryId}/entries`, { registrationIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventDetails.id, "vote"] });
    },
  });

  const saveResultsMutation = useMutation({
    mutationFn: (results: { votingCategoryId: string; winnerRegistrationId: string; voteCount: number; isOverride: boolean }[]) =>
      apiRequest("POST", `/api/vote/${eventVote!.id}/results`, { results }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventDetails.id, "vote"] });
      toast({ title: "Results Saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save results.", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/vote/${eventVote!.id}/status`, { status: "published" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventDetails.id, "vote"] });
      toast({ title: "Results Published", description: "Voting results are now visible in the gallery." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to publish results.", variant: "destructive" });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/vote/${eventVote!.id}/status`, { status: "closed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventDetails.id, "vote"] });
      toast({ title: "Results Unpublished", description: "Voting results are no longer visible in the gallery." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to unpublish results.", variant: "destructive" });
    },
  });

  if (voteLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const votingCategoriesCard = (
    <Card>
      <CardHeader>
        <CardTitle>Voting Categories</CardTitle>
        <CardDescription>
          Configure categories for car design judging
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CategoryManager
          eventId={eventDetails.id}
          categories={eventDetails.votingCategories || []}
        />
      </CardContent>
    </Card>
  );

  if (!eventVote) {
    return (
      <div className="space-y-6">
        {votingCategoriesCard}
        <Card>
          <CardHeader className="text-center">
            <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <CardTitle>Setup Voting</CardTitle>
            <CardDescription>
              Create a vote for this event to allow participants to vote on car designs.
              Cars registered for voting categories will be pre-filled.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              onClick={() => createVoteMutation.mutate()}
              disabled={createVoteMutation.isPending}
              data-testid="button-create-vote"
            >
              {createVoteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Vote
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = eventDetails.votingCategories || [];
  const allRegistrations = eventDetails.registrations || [];
  const carsWithNames = allRegistrations.filter((r) => r.carName);

  const getEntriesForCategory = (categoryId: string) => {
    return (eventVote.categoryEntries || [])
      .filter((e) => e.votingCategoryId === categoryId)
      .map((e) => e.registrationId);
  };

  const getCategoriesForCar = (registrationId: string) => {
    return (eventVote.categoryEntries || [])
      .filter((e) => e.registrationId === registrationId)
      .map((e) => e.votingCategoryId);
  };

  const getTallyForCategory = (categoryId: string) => {
    if (!tally) return [];
    return tally
      .filter((t) => t.votingCategoryId === categoryId)
      .sort((a, b) => b.voteCount - a.voteCount);
  };

  const getWinnerForCategory = (categoryId: string) => {
    const result = (eventVote.results || []).find((r) => r.votingCategoryId === categoryId);
    return result;
  };

  const toggleCarInCategory = (categoryId: string, registrationId: string) => {
    const current = getEntriesForCategory(categoryId);
    const newIds = current.includes(registrationId)
      ? current.filter((id) => id !== registrationId)
      : [...current, registrationId];
    setCategoryEntriesMutation.mutate({ categoryId, registrationIds: newIds });
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
    open: { label: "Open for Voting", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    closed: { label: "Voting Closed", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
    published: { label: "Results Published", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  };

  const currentStatus = statusLabels[eventVote.status] || statusLabels.draft;
  const ballotCount = totalBallots;

  return (
    <div className="space-y-6">
      {votingCategoriesCard}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Vote Status</CardTitle>
            <CardDescription>Manage the voting lifecycle</CardDescription>
          </div>
          <Badge className={currentStatus.color} data-testid="badge-vote-status">{currentStatus.label}</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {eventVote.status === "draft" && (() => {
              const now = new Date();
              const start = eventDetails.votingStartDate ? new Date(eventDetails.votingStartDate) : null;
              const end = eventDetails.votingEndDate ? new Date(eventDetails.votingEndDate) : null;
              const outsideWindow = (start && now < start) || (end && now > end);
              return (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => updateStatusMutation.mutate("open")}
                    disabled={updateStatusMutation.isPending || !!outsideWindow}
                    data-testid="button-open-voting"
                  >
                    <Vote className="h-4 w-4 mr-2" />
                    Open Voting
                  </Button>
                  {outsideWindow && (
                    <p className="text-xs text-muted-foreground">
                      {start && now < start
                        ? `Voting window starts ${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                        : "Voting window has ended"}
                    </p>
                  )}
                </div>
              );
            })()}
            {eventVote.status === "open" && (
              <Button
                onClick={() => updateStatusMutation.mutate("closed")}
                disabled={updateStatusMutation.isPending}
                variant="outline"
                data-testid="button-close-voting"
              >
                <Lock className="h-4 w-4 mr-2" />
                Close Voting
              </Button>
            )}
            {(eventVote.status === "closed" || eventVote.status === "open") && (
              <Button
                onClick={() => updateStatusMutation.mutate("draft")}
                disabled={updateStatusMutation.isPending || ballotCount > 0}
                variant="ghost"
                data-testid="button-revert-draft"
              >
                Back to Draft
              </Button>
            )}
            {ballotCount > 0 && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to clear all ${ballotCount} ballot(s)? This will remove all votes and results.`)) {
                    clearBallotsMutation.mutate();
                  }
                }}
                disabled={clearBallotsMutation.isPending}
                data-testid="button-clear-votes"
              >
                {clearBallotsMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eraser className="h-4 w-4 mr-2" />}
                Clear Votes ({ballotCount})
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this vote? All ballots, results, and category assignments will be permanently removed.")) {
                  deleteVoteMutation.mutate();
                }
              }}
              disabled={deleteVoteMutation.isPending}
              data-testid="button-delete-vote"
            >
              {deleteVoteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Vote
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category Assignments</CardTitle>
          <CardDescription>
            {eventVote.status === "draft"
              ? "Select which cars appear in each voting category. Cars registered for a category are pre-selected."
              : "Category assignments are locked while voting is open or closed. Revert to draft to make changes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {categories.map((category) => {
              const selectedIds = getEntriesForCategory(category.id);
              const categoriesLocked = eventVote.status !== "draft";
              return (
                <div key={category.id} className="space-y-3" data-testid={`vote-category-${category.id}`}>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">{category.name}</h3>
                    <Badge variant="secondary" className="text-xs">{selectedIds.length} cars</Badge>
                    {categoriesLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  {category.description && (
                    <p className="text-sm text-muted-foreground ml-6">{category.description}</p>
                  )}
                  <div className={`ml-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 ${categoriesLocked ? "opacity-60 pointer-events-none" : ""}`}>
                    {carsWithNames.map((reg) => {
                      const isSelected = selectedIds.includes(reg.id);
                      const registrationChoseThis = (reg.votingCategoryIds || []).includes(category.id);
                      const carCategories = getCategoriesForCar(reg.id);
                      const selectedCategoryNames = carCategories
                        .map((cId) => categories.find((c) => c.id === cId)?.name)
                        .filter(Boolean);

                      return (
                        <Card
                          key={reg.id}
                          className={`${categoriesLocked ? "" : "cursor-pointer"} overflow-visible ${categoriesLocked ? "" : "hover-elevate"} ${
                            isSelected
                              ? registrationChoseThis
                                ? "ring-2 ring-primary bg-primary/5"
                                : "ring-2 ring-primary"
                              : registrationChoseThis
                                ? "ring-1 ring-amber-400 bg-amber-50 dark:bg-amber-900/10"
                                : ""
                          }`}
                          onClick={() => !categoriesLocked && toggleCarInCategory(category.id, reg.id)}
                          data-testid={`vote-entry-${category.id}-${reg.id}`}
                        >
                          <div className="aspect-[4/3] bg-muted overflow-hidden rounded-t-md">
                            {reg.carPictureUrl ? (
                              <img src={reg.carPictureUrl} alt={reg.carName || ""} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Trophy className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="p-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleCarInCategory(category.id, reg.id)}
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`checkbox-car-${category.id}-${reg.id}`}
                              />
                              <p className="font-medium text-sm truncate flex-1">{reg.carName}</p>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{reg.participantName}</p>
                            {selectedCategoryNames.length > 0 && (
                              <div className="space-y-1 pt-1">
                                <p className="text-xs text-muted-foreground font-medium">Selected Categories</p>
                                <div className="flex flex-wrap gap-1">
                                  {selectedCategoryNames.map((name, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{name}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                    {carsWithNames.length === 0 && (
                      <p className="text-sm text-muted-foreground py-2 col-span-full">
                        No cars with names registered. Cars need a name to appear in voting.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No voting categories configured. Add categories in the Voting Categories tab first.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {(eventVote.status === "closed" || eventVote.status === "published") && (
        <VoteResultsManager
          eventVote={eventVote}
          categories={categories}
          tally={tally || []}
          onSaveResults={(results) => saveResultsMutation.mutate(results)}
          onPublish={() => publishMutation.mutate()}
          onUnpublish={() => unpublishMutation.mutate()}
          isPublishing={publishMutation.isPending}
          isUnpublishing={unpublishMutation.isPending}
        />
      )}
    </div>
  );
}

function VoteResultsManager({
  eventVote,
  categories,
  tally,
  onSaveResults,
  onPublish,
  onUnpublish,
  isPublishing,
  isUnpublishing,
}: {
  eventVote: EventVoteWithDetails;
  categories: VotingCategory[];
  tally: VoteTally[];
  onSaveResults: (results: { votingCategoryId: string; winnerRegistrationId: string; voteCount: number; isOverride: boolean }[]) => void;
  onPublish: () => void;
  onUnpublish: () => void;
  isPublishing: boolean;
  isUnpublishing: boolean;
}) {
  const buildResultsFromWinners = (winners: Record<string, string[]>) => {
    const results: { votingCategoryId: string; winnerRegistrationId: string; voteCount: number; isOverride: boolean }[] = [];
    for (const c of categories) {
      const catWinners = winners[c.id] || [];
      if (catWinners.length === 0) continue;
      const categoryTally = tally.filter((t) => t.votingCategoryId === c.id);
      const topVoted = [...categoryTally].sort((a, b) => b.voteCount - a.voteCount)[0];
      for (const winnerId of catWinners) {
        const winnerTally = categoryTally.find((t) => t.registrationId === winnerId);
        const isOverride = topVoted ? topVoted.registrationId !== winnerId : false;
        results.push({
          votingCategoryId: c.id,
          winnerRegistrationId: winnerId,
          voteCount: winnerTally?.voteCount || 0,
          isOverride,
        });
      }
    }
    return results;
  };

  const getInitialWinners = () => {
    const initial: Record<string, string[]> = {};
    for (const result of eventVote.results || []) {
      if (!initial[result.votingCategoryId]) {
        initial[result.votingCategoryId] = [];
      }
      initial[result.votingCategoryId].push(result.winnerRegistrationId);
    }
    if (Object.keys(initial).length === 0 && tally.length > 0) {
      for (const category of categories) {
        const categoryTally = tally
          .filter((t) => t.votingCategoryId === category.id)
          .sort((a, b) => b.voteCount - a.voteCount);
        if (categoryTally.length > 0) {
          initial[category.id] = [categoryTally[0].registrationId];
        }
      }
    }
    return initial;
  };

  const [selectedWinners, setSelectedWinners] = useState<Record<string, string[]>>(getInitialWinners);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setSelectedWinners(getInitialWinners());
    setInitialized(true);
  }, [eventVote.results, tally, categories]);

  const toggleWinner = (categoryId: string, registrationId: string) => {
    setSelectedWinners((prev) => {
      const current = prev[categoryId] || [];
      const next = current.includes(registrationId)
        ? { ...prev, [categoryId]: current.filter((id) => id !== registrationId) }
        : { ...prev, [categoryId]: [...current, registrationId] };
      onSaveResults(buildResultsFromWinners(next));
      return next;
    });
  };

  const hasAnyWinners = Object.values(selectedWinners).some((w) => w.length > 0);
  const resultsStatus = eventVote.status === "published"
    ? { label: "Published", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" }
    : hasAnyWinners
      ? { label: "Draft", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" }
      : { label: "No Winners Selected", color: "bg-muted text-muted-foreground" };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            {eventVote.status === "published"
              ? "Results have been published and are visible in the gallery."
              : "Click cars to toggle winners. Results auto-save as you select."}
          </CardDescription>
        </div>
        <Badge className={resultsStatus.color} data-testid="badge-results-status">{resultsStatus.label}</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {eventVote.status !== "published" && (
            <Button
              variant="outline"
              onClick={onPublish}
              disabled={isPublishing || !hasAnyWinners}
              data-testid="button-publish-results"
            >
              {isPublishing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Publish Results
            </Button>
          )}
          {eventVote.status === "published" && (
            <Button
              variant="ghost"
              onClick={onUnpublish}
              disabled={isUnpublishing}
              data-testid="button-unpublish-results"
            >
              {isUnpublishing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Unpublish Results
            </Button>
          )}
        </div>
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryTally = tally
              .filter((t) => t.votingCategoryId === category.id)
              .sort((a, b) => b.voteCount - a.voteCount);
            const currentWinners = selectedWinners[category.id] || [];

            return (
              <div key={category.id} className="space-y-3" data-testid={`results-category-${category.id}`}>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">{category.name}</h3>
                  {currentWinners.length > 1 && (
                    <Badge variant="secondary">{currentWinners.length} winners</Badge>
                  )}
                </div>
                {categoryTally.length === 0 ? (
                  <p className="text-sm text-muted-foreground ml-6">No votes cast in this category</p>
                ) : (
                  <div className="ml-6 space-y-2">
                    {(() => {
                      const topCount = categoryTally[0]?.voteCount ?? 0;
                      const isTied = categoryTally.filter((e) => e.voteCount === topCount).length > 1;
                      return categoryTally.map((entry) => {
                        const isWinner = currentWinners.includes(entry.registrationId);
                        const isTopTied = isTied && entry.voteCount === topCount;
                        return (
                          <div
                            key={entry.registrationId}
                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${
                              isWinner ? "bg-primary/10 ring-1 ring-primary/30" : "hover-elevate"
                            }`}
                            onClick={() => toggleWinner(category.id, entry.registrationId)}
                            data-testid={`result-entry-${category.id}-${entry.registrationId}`}
                          >
                            <div className="h-10 w-14 rounded bg-muted overflow-hidden flex-shrink-0">
                              {entry.carPictureUrl ? (
                                <img src={entry.carPictureUrl} alt={entry.carName || ""} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Trophy className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{entry.carName}</p>
                            </div>
                            <Badge variant={isTopTied || entry.voteCount === topCount ? "default" : "secondary"} className={isTopTied ? "ring-1 ring-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" : ""}>
                              {entry.voteCount} {entry.voteCount === 1 ? "vote" : "votes"}
                            </Badge>
                          {isWinner && (
                            <Badge variant="default" className="bg-primary">
                              <Check className="h-3 w-3 mr-1" />
                              Winner
                            </Badge>
                          )}
                        </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function EventSettingsForm({ eventDetails }: { eventDetails: DerbyEventWithDetails }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: eventDetails.name,
      description: eventDetails.description || "",
      eventDate: toFormValue(eventDetails.eventDate),
      registrationStartDate: toFormValue(eventDetails.registrationStartDate),
      registrationEndDate: toFormValue(eventDetails.registrationEndDate),
      votingStartDate: toFormValue(eventDetails.votingStartDate),
      votingEndDate: toFormValue(eventDetails.votingEndDate),
      weighInDate: toFormValue(eventDetails.weighInDate),
      isActive: eventDetails.isActive ?? true,
      carDetailsVisibility: (eventDetails.carDetailsVisibility as "hide" | "show" | "show_after_voting") || "hide",
      participantPhotosVisibility: (eventDetails.participantPhotosVisibility as "hide" | "show" | "show_after_voting") || "show",
    },
  });

  useEffect(() => {
    form.reset({
      name: eventDetails.name,
      description: eventDetails.description || "",
      eventDate: toFormValue(eventDetails.eventDate),
      registrationStartDate: toFormValue(eventDetails.registrationStartDate),
      registrationEndDate: toFormValue(eventDetails.registrationEndDate),
      votingStartDate: toFormValue(eventDetails.votingStartDate),
      votingEndDate: toFormValue(eventDetails.votingEndDate),
      weighInDate: toFormValue(eventDetails.weighInDate),
      isActive: eventDetails.isActive ?? true,
      carDetailsVisibility: (eventDetails.carDetailsVisibility as "hide" | "show" | "show_after_voting") || "hide",
      participantPhotosVisibility: (eventDetails.participantPhotosVisibility as "hide" | "show" | "show_after_voting") || "show",
    });
  }, [eventDetails, form]);

  const updateMutation = useMutation({
    mutationFn: (data: EventFormValues) => {
      const normalizedData = {
        ...data,
        eventDate: data.eventDate || null,
        registrationStartDate: data.registrationStartDate || null,
        registrationEndDate: data.registrationEndDate || null,
        votingStartDate: data.votingStartDate || null,
        votingEndDate: data.votingEndDate || null,
        weighInDate: data.weighInDate || null,
      };
      return apiRequest("PATCH", `/api/events/${eventDetails.id}`, normalizedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventDetails.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/active"] });
      toast({ title: "Event Updated", description: "Your changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update event.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/events/${eventDetails.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/active"] });
      toast({ title: "Event Deleted", description: `${eventDetails.name} has been deleted.` });
      navigate("/admin");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete event.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Event Settings</CardTitle>
          <CardDescription>
            Configure the details for {eventDetails.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-event-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="A brief description of the event" data-testid="input-event-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Date & Time</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select event date and time"
                          data-testid="input-event-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weighInDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weigh-in Date & Time</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select weigh-in date and time"
                          data-testid="input-weigh-in"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registrationStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Opens</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select start date and time"
                          data-testid="input-reg-start"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="registrationEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Closes</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select end date and time"
                          data-testid="input-reg-end"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="votingStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voting Opens</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select start date and time"
                          data-testid="input-voting-start"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="votingEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voting Closes</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select end date and time"
                          data-testid="input-voting-end"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="carDetailsVisibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Car Details on Gallery</FormLabel>
                    <FormDescription>
                      Control when car details (name, image, categories) are visible on the gallery page
                    </FormDescription>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-car-visibility">
                          <SelectValue placeholder="Select visibility option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hide" data-testid="option-car-visibility-hide">
                          Hide - Car details are never shown
                        </SelectItem>
                        <SelectItem value="show" data-testid="option-car-visibility-show">
                          Show - Car details are always visible
                        </SelectItem>
                        <SelectItem value="show_after_voting" data-testid="option-car-visibility-after-voting">
                          Show after voting ends
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="participantPhotosVisibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Participant Photos on Gallery</FormLabel>
                    <FormDescription>
                      Control when participant photos are visible on the gallery page
                    </FormDescription>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-participant-photos-visibility">
                          <SelectValue placeholder="Select visibility option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hide" data-testid="option-participant-photos-hide">
                          Hide - Participant photos are never shown
                        </SelectItem>
                        <SelectItem value="show" data-testid="option-participant-photos-show">
                          Show - Participant photos are always visible
                        </SelectItem>
                        <SelectItem value="show_after_voting" data-testid="option-participant-photos-after-voting">
                          Show after voting ends
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active Event</FormLabel>
                      <FormDescription>Make this the active derby event</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-settings">
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete this event</p>
              <p className="text-sm text-muted-foreground">
                Once deleted, all dens, voting categories, and registrations will be permanently removed.
              </p>
            </div>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-delete-event">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Event
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Event</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{eventDetails.name}"? This will also delete all associated dens, voting categories, and registrations. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminEventEditor() {
  usePageTitle("Edit Event");
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated, login } = useAuth();

  const { data: eventDetails, isLoading: detailsLoading } = useQuery<DerbyEventWithDetails>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  if (authLoading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="py-12">
        <div className="max-w-md mx-auto px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display font-semibold text-xl mb-2">
                Sign In Required
              </h2>
              <p className="text-muted-foreground mb-6">
                Please sign in to access the admin section.
              </p>
              <Button onClick={login} data-testid="button-login">
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="py-12">
        <div className="max-w-md mx-auto px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display font-semibold text-xl mb-2">
                Admin Access Required
              </h2>
              <p className="text-muted-foreground">
                You don't have permission to access this page. Please contact an administrator if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (detailsLoading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!eventDetails) {
    return (
      <div className="py-12">
        <div className="max-w-md mx-auto px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display font-semibold text-xl mb-2">
                Event Not Found
              </h2>
              <p className="text-muted-foreground mb-6">
                The event you're looking for doesn't exist or has been deleted.
              </p>
              <Link href="/admin">
                <Button data-testid="button-back-to-events">Back to Admin</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/admin" data-testid="breadcrumb-admin">Admin</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage data-testid="breadcrumb-current">{eventDetails.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="font-display font-bold text-3xl sm:text-4xl">
                {eventDetails.name}
              </h1>
              {eventDetails.isActive && (
                <Badge variant="secondary">Active</Badge>
              )}
            </div>
            {eventDetails.eventDate && (
              <p className="text-muted-foreground">
                {formatLocalDate(eventDetails.eventDate)}
              </p>
            )}
          </div>
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="mb-4 h-auto flex-wrap gap-1">
            <TabsTrigger value="settings" data-testid="tab-settings" className="text-xs sm:text-sm px-2 sm:px-3">
              <Settings className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="info" data-testid="tab-info" className="text-xs sm:text-sm px-2 sm:px-3">
              <Info className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              Info
            </TabsTrigger>
            <TabsTrigger value="rules" data-testid="tab-rules" className="text-xs sm:text-sm px-2 sm:px-3">
              <FileText className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="dens" data-testid="tab-dens" className="text-xs sm:text-sm px-2 sm:px-3">
              <Users className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              Dens
            </TabsTrigger>
            <TabsTrigger value="registrations" data-testid="tab-registrations" className="text-xs sm:text-sm px-2 sm:px-3">
              <Calendar className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              <span className="sm:hidden">Regs</span>
              <span className="hidden sm:inline">Registrations</span>
            </TabsTrigger>
            <TabsTrigger value="voting" data-testid="tab-voting" className="text-xs sm:text-sm px-2 sm:px-3">
              <Vote className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              Voting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <EventSettingsForm eventDetails={eventDetails} />
          </TabsContent>

          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle>Derby Rules</CardTitle>
                <CardDescription>
                  Edit the official rules and guidelines for this event
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RulesEditor eventDetails={eventDetails} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
                <CardDescription>
                  Edit the event information and details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InfoEditor eventDetails={eventDetails} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dens">
            <Card>
              <CardHeader>
                <CardTitle>Den Configuration</CardTitle>
                <CardDescription>
                  Add and manage dens/categories for participant grouping
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DenManager eventId={eventDetails.id} dens={eventDetails.dens || []} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registrations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>Registrations</CardTitle>
                  <CardDescription>
                    {eventDetails.registrations?.length || 0} participants registered
                  </CardDescription>
                </div>
                <ExportButton eventId={eventDetails.id} eventName={eventDetails.name} disabled={(eventDetails.registrations?.length || 0) === 0} />
              </CardHeader>
              <CardContent>
                <RegistrationManager eventId={eventDetails.id} registrations={eventDetails.registrations || []} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voting">
            <VoteManager eventDetails={eventDetails} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
