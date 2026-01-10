import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Edit,
  X,
  Loader2,
  GripVertical,
  Shield,
  ShieldCheck,
  UserCog,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { EventSelector } from "@/components/event-selector";
import { useAuth } from "@/lib/auth-context";
import type { DerbyEvent, DerbyEventWithDetails, Den, VotingCategory, User } from "@shared/schema";

const eventFormSchema = z.object({
  name: z.string().min(2, "Event name must be at least 2 characters"),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  registrationStartDate: z.string().optional(),
  registrationEndDate: z.string().optional(),
  bandGroupKey: z.string().optional(),
  isActive: z.boolean().default(true),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

const denFormSchema = z.object({
  name: z.string().min(1, "Den name is required"),
});

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
});

function CreateEventDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: EventFormValues) => apiRequest("POST", "/api/events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event Created", description: "Your derby event has been created." });
      setOpen(false);
      form.reset();
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create event.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-event">
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Derby Event</DialogTitle>
          <DialogDescription>
            Set up a new Pinewood Derby event
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Pinewood Derby 2026" {...field} data-testid="input-event-name" />
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-event-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bandGroupKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Band Group Key</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} data-testid="input-band-group-key" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="registrationStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Opens</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-reg-start" />
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
                      <Input type="date" {...field} data-testid="input-reg-end" />
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
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-event">
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Event
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

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

function DeleteUserDialog({ 
  user, 
  onDelete, 
  isPending,
  isCurrentUser 
}: { 
  user: User; 
  onDelete: () => Promise<unknown>; 
  isPending: boolean;
  isCurrentUser: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setOpen(false);
    } catch {
      // Error is handled by the mutation's onError
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending || isCurrentUser}
          data-testid={`button-delete-user-${user.id}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {user.name}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserManager({ currentUserId }: { currentUserId: string }) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateAdminMutation = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
      apiRequest("PATCH", `/api/admin/users/${userId}/admin`, { isAdmin }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User Updated", description: "Role has been updated." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User Deleted", description: "User has been removed." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-users"
        />
      </div>
      <div className="text-sm text-muted-foreground">
        {filteredUsers.length} of {users.length} user{users.length !== 1 ? "s" : ""}
      </div>
      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
            data-testid={`user-item-${user.id}`}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.profileImageUrl || undefined} alt={user.name} />
                <AvatarFallback>
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{user.name}</span>
                  {user.id === currentUserId && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {user.email || "No email"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={user.isAdmin ? "admin" : "user"}
                onValueChange={(value) =>
                  updateAdminMutation.mutate({ userId: user.id, isAdmin: value === "admin" })
                }
                disabled={updateAdminMutation.isPending || user.id === currentUserId}
              >
                <SelectTrigger 
                  className="w-28" 
                  data-testid={`select-role-${user.id}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              
              <DeleteUserDialog
                user={user}
                onDelete={() => deleteMutation.mutateAsync(user.id)}
                isPending={deleteMutation.isPending}
                isCurrentUser={user.id === currentUserId}
              />
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && searchQuery && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No users match your search.
          </p>
        )}
        {users.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No users registered yet.
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

export default function Admin() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"events" | "users">("events");
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated, login } = useAuth();

  const { data: events = [] } = useQuery<DerbyEvent[]>({
    queryKey: ["/api/events"],
  });

  const { data: eventDetails, isLoading: detailsLoading } = useQuery<DerbyEventWithDetails>({
    queryKey: ["/api/events", selectedEventId],
    enabled: !!selectedEventId,
  });

  const handleEventCreated = () => {
    // After creation, the new event should be in the list
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen py-12 bg-gradient-to-b from-background to-accent/5 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not authenticated
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

  // Not an admin
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

  return (
    <div className="min-h-screen py-12 bg-gradient-to-b from-background to-accent/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your Pinewood Derby events and users
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeSection === "events" ? "default" : "outline"}
              onClick={() => setActiveSection("events")}
              data-testid="button-section-events"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Events
            </Button>
            <Button
              variant={activeSection === "users" ? "default" : "outline"}
              onClick={() => setActiveSection("users")}
              data-testid="button-section-users"
            >
              <UserCog className="h-4 w-4 mr-2" />
              Users
            </Button>
          </div>
        </div>

        {activeSection === "users" ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user accounts and admin permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManager currentUserId={user.id} />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <CreateEventDialog onSuccess={handleEventCreated} />
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Select Event</CardTitle>
                    <CardDescription>Choose an event to manage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EventSelector
                      selectedEventId={selectedEventId}
                      onSelectEvent={setSelectedEventId}
                    />
                  </CardContent>
                </Card>

                {events.length > 0 && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">All Events</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {events.map((event) => (
                        <div
                          key={event.id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedEventId === event.id
                              ? "bg-primary/10 border border-primary/20"
                              : "bg-muted/50 hover:bg-muted"
                          }`}
                          onClick={() => setSelectedEventId(event.id)}
                          data-testid={`event-list-item-${event.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{event.name}</span>
                            {event.isActive && (
                              <Badge variant="secondary" className="text-xs">Active</Badge>
                            )}
                          </div>
                          {event.eventDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(event.eventDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="lg:col-span-2">
                {!selectedEventId ? (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-display font-semibold text-lg mb-2">
                        Select an Event
                      </h3>
                      <p className="text-muted-foreground">
                        Choose an event from the list or create a new one to get started.
                      </p>
                    </CardContent>
                  </Card>
                ) : detailsLoading ? (
                  <Card>
                    <CardContent className="py-16 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </CardContent>
                  </Card>
                ) : eventDetails ? (
                  <Tabs defaultValue="settings">
                    <TabsList className="mb-4">
                      <TabsTrigger value="settings" data-testid="tab-settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
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
                      <Card>
                        <CardHeader>
                          <CardTitle>Event Settings</CardTitle>
                          <CardDescription>
                            Configure the details for {eventDetails.name}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-muted-foreground">Event Name</Label>
                              <p className="font-medium">{eventDetails.name}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Event Date</Label>
                              <p className="font-medium">
                                {eventDetails.eventDate
                                  ? new Date(eventDetails.eventDate).toLocaleDateString()
                                  : "Not set"}
                              </p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Registration Opens</Label>
                              <p className="font-medium">
                                {eventDetails.registrationStartDate
                                  ? new Date(eventDetails.registrationStartDate).toLocaleDateString()
                                  : "Not set"}
                              </p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Registration Closes</Label>
                              <p className="font-medium">
                                {eventDetails.registrationEndDate
                                  ? new Date(eventDetails.registrationEndDate).toLocaleDateString()
                                  : "Not set"}
                              </p>
                            </div>
                          </div>
                          {eventDetails.description && (
                            <div>
                              <Label className="text-muted-foreground">Description</Label>
                              <p>{eventDetails.description}</p>
                            </div>
                          )}
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
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
