
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { GolfCourse, Locale } from "@/types";
import { addCourse, updateCourse } from "@/lib/data";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageUploader } from "./ImageUploader";
import TimeIntervalSettings from "./TimeIntervalSettings";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const formSchema = z.object({
  name: z.string().min(3, "Course name must be at least 3 characters.").max(100, "Course name cannot exceed 100 characters."),
  location: z.string().min(3, "Location is required.").max(100, "Location cannot exceed 100 characters."),
  slug: z.union([
    z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only.").min(3, "Slug must be at least 3 characters.").max(100, "Slug cannot exceed 100 characters."),
    z.literal("")
  ]).optional(),
  address: z.string().min(5, "Address must be at least 5 characters.").max(200, "Address cannot exceed 200 characters.").optional(),
  description: z.string().min(10, "Description must be at least 10 characters.").max(1000, "Description cannot exceed 1000 characters."),
  rules: z.string().max(500, "Rules cannot exceed 500 characters.").optional(),
  basePrice: z.coerce.number().min(1, "Base price must be at least $1.").max(10000, "Base price cannot exceed $10,000."),
  hidden: z.boolean().optional(),
  teeTimeInterval: z.coerce.number().min(5, "Interval must be at least 5 minutes.").max(60, "Interval cannot exceed 60 minutes."),
  operatingHours: z.object({
    openingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
    closingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
  }).refine((data) => {
    const [openHour, openMin] = data.openingTime.split(':').map(Number);
    const [closeHour, closeMin] = data.closingTime.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    return closeTime > openTime;
  }, {
    message: "Closing time must be after opening time",
    path: ["closingTime"]
  }),
  // Location coordinates
  latLng: z.object({
    lat: z.coerce.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
    lng: z.coerce.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180")
  }).optional(),
  // Course specifications
  availableHoles: z.array(z.number()).min(1, "At least one hole option must be selected"),
  totalYards: z.coerce.number().min(1000, "Total yards must be at least 1000").max(15000, "Total yards cannot exceed 15,000").optional(),
  par: z.coerce.number().min(27, "Par must be at least 27").max(108, "Par cannot exceed 108"),
  holeDetails: z.object({
    holes9: z.object({
      yards: z.coerce.number().min(500, "9-hole yards must be at least 500").max(5000, "9-hole yards cannot exceed 5,000"),
      par: z.coerce.number().min(27, "9-hole par must be at least 27").max(45, "9-hole par cannot exceed 45")
    }).optional(),
    holes18: z.object({
      yards: z.coerce.number().min(1500, "18-hole yards must be at least 1500 for par-3/executive courses").max(8500, "18-hole yards cannot exceed 8,500"),
      par: z.coerce.number().min(54, "18-hole par must be at least 54").max(90, "18-hole par cannot exceed 90")
    }).optional(),
    holes27: z.object({
      yards: z.coerce.number().min(6000, "27-hole yards must be at least 6000").max(12000, "27-hole yards cannot exceed 12,000"),
      par: z.coerce.number().min(81, "27-hole par must be at least 81").max(135, "27-hole par cannot exceed 135")
    }).optional()
  }).optional()
}).superRefine((data, ctx) => {
    if (data.availableHoles.includes(9) && (!data.holeDetails?.holes9 || !data.holeDetails.holes9.yards || !data.holeDetails.holes9.par)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "9-hole details (yards and par) are required.", path: ["holeDetails.holes9.yards"] });
    }
    if (data.availableHoles.includes(18) && (!data.holeDetails?.holes18 || !data.holeDetails.holes18.yards || !data.holeDetails.holes18.par)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "18-hole details (yards and par) are required.", path: ["holeDetails.holes18.yards"] });
    }
    if (data.availableHoles.includes(27) && (!data.holeDetails?.holes27 || !data.holeDetails.holes27.yards || !data.holeDetails.holes27.par)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "27-hole details (yards and par) are required.", path: ["holeDetails.holes27.yards"] });
    }

    // Conditional yardage rules for 18-hole courses
    if (data.holeDetails?.holes18) {
        const yards18 = data.holeDetails.holes18.yards;
        const par18 = data.holeDetails.holes18.par;
        // Standard 18-hole courses (par > 60) must be at least 4000 yards
        if (par18 > 60 && yards18 < 4000) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "For standard 18-hole courses (par > 60), yards must be at least 4000.",
                path: ["holeDetails.holes18.yards"],
            });
        }
        // Par-3 or executive 18-hole courses (par ≤ 60) must be at least 1500 yards
        if (par18 <= 60 && yards18 < 1500) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "For par-3 or executive 18-hole courses (par ≤ 60), yards must be at least 1500.",
                path: ["holeDetails.holes18.yards"],
            });
        }
    }
});

type CourseFormValues = z.infer<typeof formSchema>;

interface CourseFormProps {
  course?: GolfCourse;
  lang: Locale;
}

export function CourseForm({ course, lang }: CourseFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [newImages, setNewImages] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(course?.imageUrls || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: course?.name || "",
      location: course?.location || "",
      slug: (course as any)?.slug || "",
      address: (course as any)?.address || "",
      description: course?.description || "",
      rules: course?.rules || "",
      basePrice: course?.basePrice || 50,
      hidden: course?.hidden || false,
      teeTimeInterval: course?.teeTimeInterval || 15,
      operatingHours: {
        openingTime: course?.operatingHours?.openingTime || "06:00",
        closingTime: course?.operatingHours?.closingTime || "19:00"
      },
      latLng: course?.latLng || undefined,
      availableHoles: course?.availableHoles || [18],
      totalYards: course?.totalYards || undefined,
      par: course?.par || 72,
      holeDetails: {
        holes9: course?.holeDetails?.holes9 || {
          yards: 3200,
          par: 36
        },
        holes18: course?.holeDetails?.holes18 || {
          yards: 6500,
          par: 72
        },
        holes27: course?.holeDetails?.holes27 || {
          yards: 9800,
          par: 108
        }
      }
    },
  });

  async function onSubmit(values: CourseFormValues) {
    setIsSubmitting(true);
    try {
      // Automatically set totalYards based on hole details
      let totalYards = values.totalYards;
      if (values.availableHoles.includes(18) && values.holeDetails?.holes18?.yards) {
          totalYards = values.holeDetails.holes18.yards;
      } else if (values.availableHoles.includes(9) && values.holeDetails?.holes9?.yards) {
          totalYards = values.holeDetails.holes9.yards;
      }

      const normalizedSlug = values.slug && values.slug.trim() !== "" ? values.slug.trim().toLowerCase() : undefined;

      const courseData = {
        ...values,
        slug: normalizedSlug,
        totalYards, // Use the calculated value
        newImages,
        existingImageUrls,
        teeTimeInterval: values.teeTimeInterval,
        operatingHours: values.operatingHours
      };

      let savedCourseId: string | undefined;

      if (course) {
        // Update existing course
        await updateCourse(course.id, courseData);
        savedCourseId = course.id;
        toast({
          title: "Course Updated",
          description: `The course "${values.name}" has been saved successfully.`,
        });
      } else {
        // Create new course
        const newCourseId = await addCourse(courseData);
        savedCourseId = newCourseId;
        toast({
          title: "Course Created",
          description: `The course "${values.name}" has been created successfully.`,
        });
      }

      // Trigger revalidation of public pages to reflect price/base data changes immediately
      try {
        const token = user ? await user.getIdToken() : null;
        await fetch("/api/admin/courses/revalidate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ courseId: normalizedSlug || savedCourseId })
        });
      } catch (revalErr) {
        console.warn("Revalidation request failed:", revalErr);
      }

      router.push(`/${lang}/admin/courses`);
      router.refresh();
    } catch (error) {
      console.error("Failed to save course:", error);
      toast({
        title: "Error",
        description: "Failed to save the course. Please try again.",
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card>
        <CardContent className="pt-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Course Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Solmar Golf Links" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Cabo San Lucas" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{lang === 'es' ? 'Dirección' : 'Address'}</FormLabel>
                                <FormControl>
                                    <Input placeholder={lang === 'es' ? 'p.ej., Blvd. Kukulkan Km 17, Cancún, Q.R.' : 'e.g., Blvd. Kukulkan Km 17, Cancún, Q.R.'} {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{lang === 'es' ? 'Slug (opcional)' : 'Slug (optional)'}</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., solmar-golf-links" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Coordinates Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Map Coordinates (Optional)</h3>
                        <p className="text-sm text-muted-foreground">
                            Add latitude and longitude to display the course location on the map. You can find coordinates using Google Maps.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="latLng.lat"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Latitude</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="number" 
                                            step="any"
                                            placeholder="e.g., 22.8905" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="latLng.lng"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Longitude</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="number" 
                                            step="any"
                                            placeholder="e.g., -109.9167" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                   
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="Describe the course, its features, and what makes it unique."
                                className="resize-y min-h-[100px]"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                     <FormField
                        control={form.control}
                        name="rules"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Course Rules</FormLabel>
                            <FormControl>
                                 <Textarea
                                placeholder="Enter course-specific rules like dress code, spike policy, etc."
                                className="resize-y"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                     <FormField
                        control={form.control}
                        name="basePrice"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Base Price ($)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="250" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="hidden"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>
                                        Hide course from public listings
                                    </FormLabel>
                                    <p className="text-sm text-muted-foreground">
                                        When checked, this course will only be visible to administrators
                                    </p>
                                </div>
                            </FormItem>
                        )}
                    />

                    {/* Course Specifications */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Course Specifications</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="availableHoles"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Available Holes</FormLabel>
                                        <FormControl>
                                            <div className="space-y-2">
                                                {[9, 18, 27].map((holes) => (
                                                    <label key={holes} className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={field.value.includes(holes)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    field.onChange([...field.value, holes]);
                                                                } else {
                                                                    field.onChange(field.value.filter(h => h !== holes));
                                                                }
                                                            }}
                                                            className="rounded border-gray-300"
                                                        />
                                                        <span>{holes} holes</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="par"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Course Par</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="72" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Hole Details */}
                        {form.watch("availableHoles").includes(9) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                                <h4 className="col-span-full font-medium">9 Holes Details</h4>
                                <FormField
                                    control={form.control}
                                    name="holeDetails.holes9.yards"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>9-Hole Yards</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="3200" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="holeDetails.holes9.par"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>9-Hole Par</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="36" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {form.watch("availableHoles").includes(18) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                                <h4 className="col-span-full font-medium">18 Holes Details</h4>
                                <FormField
                                    control={form.control}
                                    name="holeDetails.holes18.yards"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>18-Hole Yards</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="6500" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="holeDetails.holes18.par"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>18-Hole Par</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="72" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {form.watch("availableHoles").includes(27) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                                <h4 className="col-span-full font-medium">27 Holes Details</h4>
                                <FormField
                                    control={form.control}
                                    name="holeDetails.holes27.yards"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>27-Hole Yards</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="9800" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="holeDetails.holes27.par"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>27-Hole Par</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="108" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                    </div>

                    <TimeIntervalSettings
                        initialInterval={form.getValues("teeTimeInterval")}
                        initialOperatingHours={form.getValues("operatingHours")}
                        onIntervalChange={(value) => form.setValue("teeTimeInterval", value)}
                        onOperatingHoursChange={(hours) => form.setValue("operatingHours", hours)}
                    />

                    <FormItem>
                        <FormLabel>Course Images</FormLabel>
                        <FormControl>
                           <ImageUploader 
                             newFiles={newImages}
                             setNewFiles={setNewImages}
                             existingImageUrls={existingImageUrls}
                             setExistingImageUrls={setExistingImageUrls}
                           />
                        </FormControl>
                        <FormMessage />
                    </FormItem>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? 'Saving...' : (course ? 'Save Changes' : 'Create Course')}
                        </Button>
                    </div>
                </form>
            </Form>
        </CardContent>
    </Card>
  );
}
