import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { formatLocalDate } from "@/lib/date-utils";
import type { DerbyEventWithDetails, Den, VotingCategory } from "@shared/schema";

const eventFormSchema = z.object({
  name: z.string().min(2, "Event name must be at least 2 characters"),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  registrationStartDate: z.string().optional(),
  registrationEndDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

function DenManager({ eventId, dens }: { eventId: string; dens: Den[] }) {
  const [newDen, setNewDen] = useState("");
  const { toast } = useToast();

  const addMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/dens", { eventId, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      setNewDen("");
      toast({ title: "Den Added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (denId: string) => apiRequest("DELETE", `/api/dens/${denId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
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
      setNewCategory("");
      setNewDescription("");
      toast({ title: "Category Added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => apiRequest("DELETE", `/api/voting-categories/${categoryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
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

function EventSettingsForm({ eventDetails }: { eventDetails: DerbyEventWithDetails }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: eventDetails.name,
      description: eventDetails.description || "",
      eventDate: eventDetails.eventDate || "",
      registrationStartDate: eventDetails.registrationStartDate || "",
      registrationEndDate: eventDetails.registrationEndDate || "",
      isActive: eventDetails.isActive ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      name: eventDetails.name,
      description: eventDetails.description || "",
      eventDate: eventDetails.eventDate || "",
      registrationStartDate: eventDetails.registrationStartDate || "",
      registrationEndDate: eventDetails.registrationEndDate || "",
      isActive: eventDetails.isActive ?? true,
    });
  }, [eventDetails, form]);

  const updateMutation = useMutation({
    mutationFn: (data: EventFormValues) => {
      const normalizedData = {
        ...data,
        description: data.description || null,
        eventDate: data.eventDate || null,
        registrationStartDate: data.registrationStartDate || null,
        registrationEndDate: data.registrationEndDate || null,
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
                      <Textarea placeholder="Event description..." {...field} data-testid="input-event-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select event date"
                        data-testid="input-event-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registrationStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Opens</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select start date"
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
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select end date"
                          data-testid="input-reg-end"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
      <div className="min-h-screen py-12 bg-gradient-to-b from-background to-accent/5 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-12 bg-gradient-to-b from-background to-accent/5">
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
      <div className="min-h-screen py-12 bg-gradient-to-b from-background to-accent/5">
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
      <div className="min-h-screen py-12 bg-gradient-to-b from-background to-accent/5 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!eventDetails) {
    return (
      <div className="min-h-screen py-12 bg-gradient-to-b from-background to-accent/5">
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
    <div className="min-h-screen py-12 bg-gradient-to-b from-background to-accent/5">
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
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="rules" data-testid="tab-rules">
              <FileText className="h-4 w-4 mr-2" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="dens" data-testid="tab-dens">
              <Users className="h-4 w-4 mr-2" />
              Dens
            </TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">
              <Trophy className="h-4 w-4 mr-2" />
              Voting Categories
            </TabsTrigger>
            <TabsTrigger value="registrations" data-testid="tab-registrations">
              <Calendar className="h-4 w-4 mr-2" />
              Registrations
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

          <TabsContent value="categories">
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
          </TabsContent>

          <TabsContent value="registrations">
            <Card>
              <CardHeader>
                <CardTitle>Registrations</CardTitle>
                <CardDescription>
                  {eventDetails.registrations?.length || 0} participants registered
                </CardDescription>
              </CardHeader>
              <CardContent>
                {eventDetails.registrations?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No registrations yet for this event.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {eventDetails.registrations?.map((reg) => (
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
                            {reg.carName} • {reg.den?.name || "No den"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
