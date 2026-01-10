import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Upload, Camera, Car, User, Check, ArrowLeft, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { parseLocalDate, formatLocalDate } from "@/lib/date-utils";
import type { DerbyEventWithDetails, Registration } from "@shared/schema";

const registrationFormSchema = z.object({
  participantName: z.string().min(2, "Name must be at least 2 characters"),
  denId: z.string().min(1, "Please select a den"),
  carName: z.string().min(2, "Car name must be at least 2 characters"),
  votingCategoryIds: z.array(z.string()).optional(),
});

type RegistrationFormValues = z.infer<typeof registrationFormSchema>;

function ImageUpload({
  value,
  onChange,
  label,
  icon: Icon,
}: {
  value: string | null;
  onChange: (file: File | null) => void;
  label: string;
  icon: typeof Camera;
}) {
  const [preview, setPreview] = useState<string | null>(value);
  const [isDragging, setIsDragging] = useState(false);

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

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute bottom-2 right-2"
              onClick={() => {
                setPreview(null);
                onChange(null);
              }}
              data-testid="button-change-photo"
            >
              Change Photo
            </Button>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-2 cursor-pointer">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <span className="text-sm font-medium">Drop image here or click to upload</span>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
            </div>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              data-testid={`input-upload-${label.toLowerCase().replace(/\s/g, '-')}`}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [participantPicture, setParticipantPicture] = useState<File | null>(null);
  const [carPicture, setCarPicture] = useState<File | null>(null);
  const [existingRegistration, setExistingRegistration] = useState<Registration | null>(null);

  const { data: activeEvent, isLoading: eventLoading } = useQuery<DerbyEventWithDetails>({
    queryKey: ["/api/events/active"],
  });

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      participantName: "",
      denId: "",
      carName: "",
      votingCategoryIds: [],
    },
  });

  const isRegistrationOpen = activeEvent && activeEvent.registrationStartDate && activeEvent.registrationEndDate
    ? (() => {
        const now = new Date();
        const start = parseLocalDate(activeEvent.registrationStartDate);
        const end = parseLocalDate(activeEvent.registrationEndDate);
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
      formData.append("carName", data.carName);
      if (data.votingCategoryIds) {
        formData.append("votingCategoryIds", JSON.stringify(data.votingCategoryIds));
      }
      if (participantPicture) {
        formData.append("participantPicture", participantPicture);
      }
      if (carPicture) {
        formData.append("carPicture", carPicture);
      }

      const url = existingRegistration
        ? `/api/registrations/${existingRegistration.id}`
        : "/api/registrations";
      const method = existingRegistration ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to submit registration");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
      toast({
        title: existingRegistration ? "Registration Updated!" : "Registration Complete!",
        description: "Your racer has been registered for the derby.",
      });
      navigate("/gallery");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit registration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNext = async () => {
    if (step === 1) {
      const valid = await form.trigger(["participantName", "denId"]);
      if (valid) setStep(2);
    } else if (step === 2) {
      const valid = await form.trigger(["carName"]);
      if (valid) setStep(3);
    }
  };

  const handleSubmit = form.handleSubmit((data) => {
    submitMutation.mutate(data);
  });

  if (eventLoading) {
    return (
      <div className="min-h-screen py-12">
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

  if (!activeEvent) {
    return (
      <div className="min-h-screen py-12">
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
      <div className="min-h-screen py-12">
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

  return (
    <div className="min-h-screen py-12 bg-gradient-to-b from-background to-accent/10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl mb-2">Register for {activeEvent.name}</h1>
          <p className="text-muted-foreground">Enter your information to join the derby</p>
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
                    />

                    <FormField
                      control={form.control}
                      name="denId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Den / Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                Select the categories you'd like to enter for judging
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
                                          onCheckedChange={(checked) => {
                                            const current = field.value || [];
                                            if (checked) {
                                              field.onChange([...current, category.id]);
                                            } else {
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
                          {carPicture ? (
                            <img
                              src={URL.createObjectURL(carPicture)}
                              alt="Car"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Car className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{form.getValues("carName")}</p>
                          {form.getValues("votingCategoryIds")?.length ? (
                            <p className="text-sm text-muted-foreground">
                              Categories: {form.getValues("votingCategoryIds")?.map((id) =>
                                activeEvent.votingCategories?.find((c) => c.id === id)?.name
                              ).join(", ")}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">No voting categories selected</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(step - 1)}
                      data-testid="button-back"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
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
                          Complete Registration
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
