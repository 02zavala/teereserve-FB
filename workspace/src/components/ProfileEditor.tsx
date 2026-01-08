
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler, commonValidators } from "@/hooks/useErrorHandler";
import { ValidationError } from "@/lib/error-handling";
import { updateUserProfile, uploadProfilePicture } from "@/lib/data";
import { User } from "firebase/auth";
import type { UserProfile } from "@/types";
import { updateProfile } from "firebase/auth";
import { Loader2, UploadCloud } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";


interface ProfileEditorProps {
  user: User;
  userProfile: UserProfile;
  children: React.ReactNode;
  onProfileUpdate: (updatedProfile: Partial<UserProfile>) => void;
}

const formSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name must be less than 50 characters."),
  handicap: z.coerce.number().min(0, "Handicap must be 0 or higher.").max(54, "Handicap must be 54 or lower.").optional(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

export function ProfileEditor({ user, userProfile, children, onProfileUpdate }: ProfileEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(userProfile.photoURL);
  const { toast } = useToast();
  const { handleAsyncError } = useErrorHandler();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: userProfile.displayName || "",
      handicap: userProfile.handicap || undefined,
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a valid image file.",
          variant: "destructive",
        });
        return;
      }
      
      // Validar tamaño de archivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = (values: ProfileFormValues) => {
    handleAsyncError(async () => {
      console.log('Starting profile update with values:', values);
      
      // Validación adicional de datos
      if (!/^[a-zA-Z0-9\s\-'.]+$/.test(values.displayName)) {
        throw new ValidationError('Display name must contain only letters, numbers, spaces, and basic punctuation');
      }
      
      if (values.handicap !== undefined && (values.handicap < 0 || values.handicap > 54)) {
        throw new ValidationError('Handicap must be between 0 and 54');
      }
      
      let photoURL = userProfile.photoURL;
      const updates: Partial<UserProfile> = {};

      if (imageFile) {
        console.log('Uploading profile picture...');
        photoURL = await uploadProfilePicture(user.uid, imageFile);
        updates.photoURL = photoURL;
        console.log('Profile picture uploaded successfully');
      }

      if (values.displayName !== userProfile.displayName) {
        updates.displayName = values.displayName;
      }
      if (values.handicap !== userProfile.handicap) {
        updates.handicap = values.handicap;
      }
      
      if (Object.keys(updates).length > 0) {
        console.log('Updating profile with:', updates);
        await updateProfile(user, { displayName: updates.displayName, photoURL: updates.photoURL });
        await updateUserProfile(user.uid, updates);
        console.log('Profile updated successfully');
      }
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });
      onProfileUpdate(updates);
      setIsOpen(false);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                    <AvatarImage src={imagePreview || `https://i.pravatar.cc/128?u=${user.uid}`} />
                    <AvatarFallback>{userProfile.displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <Label htmlFor="picture" className="cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                    <UploadCloud className="h-4 w-4" />
                    Change Picture
                </Label>
                <Input id="picture" type="file" accept="image/*" className="hidden" onChange={handleImageChange}/>
            </div>

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="handicap"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Handicap Index</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="e.g., 12.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save changes
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
