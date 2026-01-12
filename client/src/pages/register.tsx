import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import { Upload, Camera, Car, User, Check, ArrowLeft, ArrowRight, Loader2, AlertCircle, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { parseDateTime, formatLocalDate } from "@/lib/date-utils";
import { useAuth } from "@/lib/auth-context";
import type { DerbyEventWithDetails, Registration, RegistrationWithDen } from "@shared/schema";

const registrationFormSchema = z.object({
  participantName: z.string().min(2, "Name must be at least 2 characters"),
  denId: z.string().min(1, "Please select a den"),
  carName: z.string().optional(),
  votingCategoryIds: z.array(z.string()).max(3, "You can select a maximum of 3 categories").optional(),
  addCarLater: z.boolean().optional(),
});

type RegistrationFormValues = z.infer<typeof registrationFormSchema>;

function ImageUpload({
  value,
  onChange,
  label,
  icon: Icon,
  existingUrl,
}: {
  value: string | null;
  onChange: (file: File | null) => void;
  label: string;
  icon: typeof Camera;
  existingUrl?: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(existingUrl || value);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingUrl && !value) {
      setPreview(existingUrl);
    }
  }, [existingUrl, value]);

  const handleFile = useCallback((file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      onChange(file);
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleChangePhotoClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        data-testid={`input-upload-${label.toLowerCase().replace(/\s/g, '-')}`}
      />
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {preview ? (
          <div className="relative aspect-[4/3] rounded-md overflow-hidden">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 right-2 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleChangePhotoClick}
                data-testid="button-change-photo"
              >
                Change Photo
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setPreview(null);
                  onChange(null);
                }}
                data-testid="button-clear-photo"
              >
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-2 cursor-pointer" onClick={handleChangePhotoClick}>
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <span className="text-sm font-medium">Drop image here or click to upload</span>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}

function ParticipantCard({
  registration,
  onEdit,
  onDelete,
  isDeleting,
}: {
  registration: RegistrationWithDen;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const needsCarDetails = !registration.carName;

  return (
    <Card className="hover-elevate">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            {registration.participantPictureUrl ? (
              <img
                src={registration.participantPictureUrl}
                alt={registration.participantName}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate" data-testid={`text-participant-name-${registration.id}`}>
              {registration.participantName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {registration.den?.name || "No den assigned"}
            </p>
            {registration.carName ? (
              <div className="flex items-center gap-2 mt-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{registration.carName}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Car details pending</span>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              data-testid={`button-edit-registration-${registration.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDeleting}
                  data-testid={`button-delete-registration-${registration.id}`}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Registration</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete the registration for {registration.participantName}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} data-testid="button-confirm-delete">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddParticipantCard({ onClick }: { onClick: () => void }) {
  return (
    <Card
      className="hover-elevate cursor-pointer border-dashed"
      onClick={onClick}
      data-testid="card-add-participant"
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Add Participant</h3>
            <p className="text-sm text-muted-foreground">Register another racer</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Register() {
  usePageTitle("Register");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [view, setView] = useState<"list" | "form">("list");
  const [step, setStep] = useState(1);
  const [participantPicture, setParticipantPicture] = useState<File | null>(null);
  const [carPicture, setCarPicture] = useState<File | null>(null);
  const [editingRegistration, setEditingRegistration] = useState<RegistrationWithDen | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: activeEvent, isLoading: eventLoading } = useQuery<DerbyEventWithDetails>({
    queryKey: ["/api/events/active"],
  });

  const { data: myRegistrations, isLoading: registrationsLoading } = useQuery<RegistrationWithDen[]>({
    queryKey: ["/api/registrations/my", { eventId: activeEvent?.id }],
    queryFn: async () => {
      const response = await fetch(`/api/registrations/my?eventId=${activeEvent?.id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          return [];
        }
        throw new Error("Failed to fetch registrations");
      }
      return response.json();
    },
    enabled: !!activeEvent?.id && isAuthenticated,
  });

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      participantName: "",
      denId: "",
      carName: "",
      votingCategoryIds: [],
      addCarLater: false,
    },
  });

  const addCarLater = form.watch("addCarLater");

  useEffect(() => {
    if (!registrationsLoading && myRegistrations !== undefined) {
      if (myRegistrations.length === 0) {
        setView("form");
      } else {
        setView("list");
      }
    }
  }, [myRegistrations, registrationsLoading]);

  const isRegistrationOpen = activeEvent && activeEvent.registrationStartDate && activeEvent.registrationEndDate
    ? (() => {
        const now = new Date();
        const start = parseDateTime(activeEvent.registrationStartDate);
        const end = parseDateTime(activeEvent.registrationEndDate);
        if (!start || !end) return false;
        return now >= start && now <= end;
      })()
    : false;

  const submitMutation = useMutation({
    mutationFn: async (data: RegistrationFormValues) => {
      const formData = new FormData();
      formData.append("eventId", activeEvent!.id);
      formData.append("participantName", data.participantName);
      formData.append("denId", data.denId);
      if (!data.addCarLater && data.carName) {
        formData.append("carName", data.carName);
      }
      if (data.votingCategoryIds) {
        formData.append("votingCategoryIds", JSON.stringify(data.votingCategoryIds));
      }
      if (participantPicture) {
        formData.append("participantPicture", participantPicture);
      }
      if (carPicture && !data.addCarLater) {
        formData.append("carPicture", carPicture);
      }

      const url = editingRegistration
        ? `/api/registrations/${editingRegistration.id}`
        : "/api/registrations";
      const method = editingRegistration ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to submit registration" }));
        throw new Error(error.message);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/my"] });
      toast({
        title: editingRegistration ? "Registration Updated!" : "Registration Complete!",
        description: editingRegistration
          ? "Your registration has been updated."
          : "Your racer has been registered for the derby.",
      });
      resetForm();
      setView("list");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit registration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/registrations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to delete registration");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/my"] });
      setDeletingId(null);
      toast({
        title: "Registration Deleted",
        description: "The registration has been removed.",
      });
    },
    onError: () => {
      setDeletingId(null);
      toast({
        title: "Error",
        description: "Failed to delete registration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    form.reset({
      participantName: "",
      denId: "",
      carName: "",
      votingCategoryIds: [],
      addCarLater: false,
    });
    setParticipantPicture(null);
    setCarPicture(null);
    setEditingRegistration(null);
    setStep(1);
  };

  const handleEdit = (registration: RegistrationWithDen) => {
    setEditingRegistration(registration);
    form.reset({
      participantName: registration.participantName,
      denId: registration.denId || "",
      carName: registration.carName || "",
      votingCategoryIds: registration.votingCategoryIds || [],
      addCarLater: !registration.carName,
    });
    setView("form");
    setStep(1);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteMutation.mutate(id);
  };

  const handleAddNew = () => {
    resetForm();
    setView("form");
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else if (myRegistrations && myRegistrations.length > 0) {
      resetForm();
      setView("list");
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      const valid = await form.trigger(["participantName", "denId"]);
      if (valid) setStep(2);
    } else if (step === 2) {
      const formValues = form.getValues();
      if (formValues.addCarLater) {
        setStep(3);
      } else {
        const valid = await form.trigger(["carName"]);
        if (valid) setStep(3);
      }
    }
  };

  const handleSubmit = form.handleSubmit((data) => {
    submitMutation.mutate(data);
  });

  if (eventLoading || authLoading) {
    return (
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardContent className="p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                Please sign in to register participants for the derby.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={login} data-testid="button-login">
                Sign In
              </Button>
            </CardContent>
          </Card>
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

  if (!isRegistrationOpen) {
    return (
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>Registration Closed</CardTitle>
              <CardDescription>
                Registration for {activeEvent.name} is currently closed.
                {activeEvent.registrationStartDate && activeEvent.registrationEndDate && (
                  <span className="block mt-2">
                    Registration period: {formatLocalDate(activeEvent.registrationStartDate)} - {formatLocalDate(activeEvent.registrationEndDate)}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (registrationsLoading) {
    return (
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardContent className="p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="font-display font-bold text-3xl mb-2">My Registrations</h1>
            <p className="text-muted-foreground">
              {activeEvent.name} - Manage your registered participants
            </p>
          </div>

          <div className="space-y-4">
            {myRegistrations?.map((registration) => (
              <ParticipantCard
                key={registration.id}
                registration={registration}
                onEdit={() => handleEdit(registration)}
                onDelete={() => handleDelete(registration.id)}
                isDeleting={deletingId === registration.id}
              />
            ))}
            <AddParticipantCard onClick={handleAddNew} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl mb-2">
            {editingRegistration ? "Edit Registration" : "Register for " + activeEvent.name}
          </h1>
          <p className="text-muted-foreground">
            {editingRegistration ? "Update participant information" : "Enter your information to join the derby"}
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                    s < step
                      ? "bg-primary text-primary-foreground"
                      : s === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <Check className="h-5 w-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-1 mx-1 rounded ${
                      s < step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Participant Information"}
              {step === 2 && "Car Details"}
              {step === 3 && "Review & Submit"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Tell us about the racer"}
              {step === 2 && "Enter your car information"}
              {step === 3 && "Confirm your registration details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-6">
                {step === 1 && (
                  <>
                    <FormField
                      control={form.control}
                      name="participantName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Participant Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Scout's full name"
                              {...field}
                              data-testid="input-participant-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <ImageUpload
                      value={null}
                      onChange={setParticipantPicture}
                      label="Participant Photo"
                      icon={User}
                      existingUrl={editingRegistration?.participantPictureUrl}
                    />

                    <FormField
                      control={form.control}
                      name="denId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Den / Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-den">
                                <SelectValue placeholder="Select a den" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {activeEvent.dens?.map((den) => (
                                <SelectItem key={den.id} value={den.id} data-testid={`option-den-${den.id}`}>
                                  {den.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <FormField
                      control={form.control}
                      name="addCarLater"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Add car details later</FormLabel>
                            <FormDescription>
                              Skip car details for now and add them before the event
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-add-car-later"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {!addCarLater && (
                      <>
                        <FormField
                          control={form.control}
                          name="carName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Car Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Give your car a name"
                                  {...field}
                                  data-testid="input-car-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <ImageUpload
                          value={null}
                          onChange={setCarPicture}
                          label="Car Photo"
                          icon={Car}
                          existingUrl={editingRegistration?.carPictureUrl}
                        />

                        {activeEvent.votingCategories && activeEvent.votingCategories.length > 0 && (
                          <FormField
                            control={form.control}
                            name="votingCategoryIds"
                            render={() => (
                              <FormItem>
                                <div className="mb-4">
                                  <FormLabel>Voting Categories (Optional)</FormLabel>
                                  <FormDescription>
                                    Select up to 3 categories you'd like to enter for judging
                                  </FormDescription>
                                </div>
                                <div className="space-y-3">
                                  {activeEvent.votingCategories.map((category) => (
                                    <FormField
                                      key={category.id}
                                      control={form.control}
                                      name="votingCategoryIds"
                                      render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value?.includes(category.id)}
                                              disabled={!field.value?.includes(category.id) && (field.value?.length || 0) >= 3}
                                              onCheckedChange={(checked) => {
                                                const current = field.value || [];
                                                if (checked && current.length < 3) {
                                                  field.onChange([...current, category.id]);
                                                } else if (!checked) {
                                                  field.onChange(current.filter((id) => id !== category.id));
                                                }
                                              }}
                                              data-testid={`checkbox-category-${category.id}`}
                                            />
                                          </FormControl>
                                          <div className="space-y-1 leading-none">
                                            <FormLabel className="font-normal cursor-pointer">
                                              {category.name}
                                            </FormLabel>
                                            {category.description && (
                                              <FormDescription>{category.description}</FormDescription>
                                            )}
                                          </div>
                                        </FormItem>
                                      )}
                                    />
                                  ))}
                                </div>
                              </FormItem>
                            )}
                          />
                        )}
                      </>
                    )}
                  </>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div className="grid gap-4">
                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {participantPicture ? (
                            <img
                              src={URL.createObjectURL(participantPicture)}
                              alt="Participant"
                              className="h-full w-full object-cover"
                            />
                          ) : editingRegistration?.participantPictureUrl ? (
                            <img
                              src={editingRegistration.participantPictureUrl}
                              alt="Participant"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{form.getValues("participantName")}</p>
                          <p className="text-sm text-muted-foreground">
                            {activeEvent.dens?.find((d) => d.id === form.getValues("denId"))?.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {carPicture && !addCarLater ? (
                            <img
                              src={URL.createObjectURL(carPicture)}
                              alt="Car"
                              className="h-full w-full object-cover"
                            />
                          ) : editingRegistration?.carPictureUrl && !addCarLater ? (
                            <img
                              src={editingRegistration.carPictureUrl}
                              alt="Car"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Car className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          {addCarLater ? (
                            <>
                              <p className="font-medium text-amber-600 dark:text-amber-400">Car details to be added later</p>
                              <p className="text-sm text-muted-foreground">You can update this before the event</p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium">{form.getValues("carName") || "No car name"}</p>
                              {form.getValues("votingCategoryIds")?.length ? (
                                <p className="text-sm text-muted-foreground">
                                  Categories: {form.getValues("votingCategoryIds")?.map((id) =>
                                    activeEvent.votingCategories?.find((c) => c.id === id)?.name
                                  ).join(", ")}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground">No voting categories selected</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  {(step > 1 || (myRegistrations && myRegistrations.length > 0)) ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      data-testid="button-back"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {step === 1 && myRegistrations && myRegistrations.length > 0 ? "Cancel" : "Back"}
                    </Button>
                  ) : (
                    <div />
                  )}

                  {step < 3 ? (
                    <Button type="button" onClick={handleNext} data-testid="button-next">
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={submitMutation.isPending}
                      data-testid="button-submit-registration"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          {editingRegistration ? "Update Registration" : "Complete Registration"}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
