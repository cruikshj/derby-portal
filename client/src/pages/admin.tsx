import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Plus,
  Calendar,
  Users,
  Trash2,
  Edit,
  Loader2,
  GripVertical,
  Shield,
  UserCog,
  Lock,
  Search,
  Clock,
  Ban,
  Link,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { formatLocalDate } from "@/lib/date-utils";
import type { DerbyEvent, Den, VotingCategory, User } from "@shared/schema";

const eventFormSchema = z.object({
  name: z.string().min(2, "Event name must be at least 2 characters"),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  registrationStartDate: z.string().optional(),
  registrationEndDate: z.string().optional(),
  votingStartDate: z.string().optional(),
  votingEndDate: z.string().optional(),
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
  const [copyFromEventId, setCopyFromEventId] = useState<string>("");
  const { toast } = useToast();

  const { data: existingEvents = [] } = useQuery<DerbyEvent[]>({
    queryKey: ["/api/events"],
    enabled: open,
  });

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: EventFormValues) => {
      const shouldCopy = copyFromEventId && copyFromEventId !== "none";
      const payload = shouldCopy 
        ? { ...data, copyFromEventId }
        : data;
      return apiRequest("POST", "/api/events", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/active"] });
      const shouldCopy = copyFromEventId && copyFromEventId !== "none";
      const message = shouldCopy 
        ? "Your derby event has been created with copied rules, dens, and voting categories."
        : "Your derby event has been created.";
      toast({ title: "Event Created", description: message });
      setOpen(false);
      form.reset();
      setCopyFromEventId("");
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
            {existingEvents.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Copy From Existing Event</label>
                <Select value={copyFromEventId} onValueChange={setCopyFromEventId}>
                  <SelectTrigger data-testid="select-copy-from-event">
                    <SelectValue placeholder="Start fresh (no copy)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Start fresh (no copy)</SelectItem>
                    {existingEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Copies rules, dens, and voting categories from the selected event
                </p>
              </div>
            )}
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
                    <Input placeholder="A brief description of the event" {...field} data-testid="input-event-description" />
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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

interface InviteLink {
  id: string;
  token: string;
  createdAt: string;
  createdById: string | null;
}

function InviteLinkDialog() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: inviteLink, isLoading } = useQuery<InviteLink | null>({
    queryKey: ["/api/admin/invite-link"],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/invite-link"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invite-link"] });
      toast({ title: "Invite Link Created", description: "The invite link has been generated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create invite link.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/admin/invite-link"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invite-link"] });
      toast({ title: "Invite Link Deleted", description: "The invite link has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete invite link.", variant: "destructive" });
    },
  });

  const getInviteUrl = () => {
    if (!inviteLink) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/login?invite=${inviteLink.token}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getInviteUrl());
      setCopied(true);
      toast({ title: "Copied", description: "Invite link copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Error", description: "Failed to copy to clipboard.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-manage-invite-link">
          <Link className="h-4 w-4 mr-1" />
          Invite Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Invite Link</DialogTitle>
          <DialogDescription>
            Users who sign up using this link will automatically be set to Active status instead of Pending. 
            Disabled users cannot be reactivated with this link.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : inviteLink ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input 
                value={getInviteUrl()} 
                readOnly 
                className="font-mono text-xs"
                data-testid="input-invite-link"
              />
              <Button 
                size="icon" 
                variant="outline" 
                onClick={handleCopy}
                data-testid="button-copy-invite-link"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Created: {new Date(inviteLink.createdAt).toLocaleDateString()}
            </p>
            <Button 
              variant="destructive" 
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="w-full"
              data-testid="button-delete-invite-link"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Invite Link
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center py-2">
              No invite link exists. Generate one to allow users to sign up as Active.
            </p>
            <Button 
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="w-full"
              data-testid="button-create-invite-link"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Invite Link
            </Button>
          </div>
        )}
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [showPendingOnly, setShowPendingOnly] = useState(false);

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

  const updateAccessStatusMutation = useMutation({
    mutationFn: ({ userId, accessStatus }: { userId: string; accessStatus: string }) =>
      apiRequest("PATCH", `/api/admin/users/${userId}/access-status`, { accessStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User Updated", description: "Access status has been updated." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update access status.",
        variant: "destructive",
      });
    },
  });

  const pendingCount = users.filter((user) => (user.accessStatus || "pending") === "pending").length;

  const filteredUsers = users.filter((user) => {
    const accessStatus = user.accessStatus || "pending";
    if (showPendingOnly && accessStatus !== "pending") return false;
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
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-users"
          />
        </div>
        <Button
          variant={showPendingOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowPendingOnly(!showPendingOnly)}
          className="whitespace-nowrap"
          data-testid="button-filter-pending"
        >
          <Clock className="h-4 w-4 mr-1" />
          Pending ({pendingCount})
        </Button>
      </div>
      <div className="text-sm text-muted-foreground">
        {filteredUsers.length} of {users.length} user{users.length !== 1 ? "s" : ""}
        {showPendingOnly && " (showing pending only)"}
      </div>
      <div className="space-y-3">
        {filteredUsers.map((user) => {
          const accessStatus = user.accessStatus || "pending";
          const isPending = accessStatus === "pending";
          const isDisabled = accessStatus === "disabled";
          
          return (
          <div
            key={user.id}
            className={`flex items-center justify-between p-4 rounded-lg ${
              isDisabled 
                ? "bg-destructive/10 opacity-60" 
                : isPending 
                  ? "bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" 
                  : "bg-muted/50"
            }`}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{user.name}</span>
                  {user.id === currentUserId && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                  {isPending && (
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                  {isDisabled && (
                    <Badge variant="destructive" className="text-xs">
                      <Ban className="h-3 w-3 mr-1" />
                      Disabled
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {user.email || "No email"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={user.accessStatus || "pending"}
                onValueChange={(value) =>
                  updateAccessStatusMutation.mutate({ userId: user.id, accessStatus: value })
                }
                disabled={updateAccessStatusMutation.isPending || user.id === currentUserId}
              >
                <SelectTrigger 
                  className="w-28" 
                  data-testid={`select-access-${user.id}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
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
          );
        })}
        {filteredUsers.length === 0 && (searchQuery || showPendingOnly) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {showPendingOnly && !searchQuery 
              ? "No pending users found." 
              : "No users match your search."}
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

function EventManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const { data: events = [], isLoading } = useQuery<DerbyEvent[]>({
    queryKey: ["/api/events"],
  });

  const filteredEvents = events.filter((event) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.name?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query)
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
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-events"
        />
      </div>
      <div className="text-sm text-muted-foreground">
        {filteredEvents.length} of {events.length} event{events.length !== 1 ? "s" : ""}
      </div>
      <div className="space-y-3">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover-elevate cursor-pointer"
            onClick={() => navigate(`/admin/events/${event.id}`)}
            data-testid={`event-item-${event.id}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{event.name}</span>
                {event.isActive && (
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                )}
              </div>
              {event.eventDate && (
                <p className="text-sm text-muted-foreground">
                  {formatLocalDate(event.eventDate)}
                </p>
              )}
            </div>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}
        {filteredEvents.length === 0 && searchQuery && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No events match your search.
          </p>
        )}
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No events created yet.
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
  usePageTitle("Admin");
  const [activeSection, setActiveSection] = useState<"events" | "users">("events");
  const { user, isLoading: authLoading, isAuthenticated, login } = useAuth();

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
              Admin Settings
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
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user accounts and admin permissions
                </CardDescription>
              </div>
              <InviteLinkDialog />
            </CardHeader>
            <CardContent>
              <UserManager currentUserId={user.id} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Event Management
                </CardTitle>
                <CardDescription>
                  Manage your Pinewood Derby events
                </CardDescription>
              </div>
              <CreateEventDialog onSuccess={handleEventCreated} />
            </CardHeader>
            <CardContent>
              <EventManager />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
