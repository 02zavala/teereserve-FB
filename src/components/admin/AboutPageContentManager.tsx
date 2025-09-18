
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AboutPageContent } from '@/types';
import {
    updateAboutPageContent,
    uploadSiteImage,
} from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';

interface AboutPageContentManagerProps {
  initialContent: AboutPageContent;
}

const formSchema = z.object({
  heroImage: z.any().optional(),
  missionImage: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AboutPageContentManager({ initialContent }: AboutPageContentManagerProps) {
  const [content, setContent] = useState<AboutPageContent>(initialContent);
  const [isLoading, setIsLoading] = useState(false);
  const [heroPreview, setHeroPreview] = useState<string | null>(initialContent.heroImageUrl);
  const [missionPreview, setMissionPreview] = useState<string | null>(initialContent.missionImageUrl);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setter(previewUrl);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      let heroImageUrl = content.heroImageUrl;
      let missionImageUrl = content.missionImageUrl;

      if (values.heroImage && values.heroImage.length > 0) {
        heroImageUrl = await uploadSiteImage(values.heroImage[0], 'about-hero');
      }
      if (values.missionImage && values.missionImage.length > 0) {
        missionImageUrl = await uploadSiteImage(values.missionImage[0], 'about-mission');
      }
      
      const newContent: AboutPageContent = { heroImageUrl, missionImageUrl };
      await updateAboutPageContent(newContent);
      setContent(newContent);
      
      toast({ title: 'Success', description: 'About Us page content updated.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update content.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>About Us Page Content</CardTitle>
        <CardDescription>
          Manage the main images on the "About Us" page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="heroImage"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Hero Image (1920x800)</FormLabel>
                    <div className="w-full aspect-[16/9] relative border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {heroPreview ? (
                             <NextImage src={heroPreview} alt="Hero preview" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                        ) : (
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        )}
                    </div>
                    <FormControl>
                        <Input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                                field.onChange(e.target.files);
                                handleFileChange(e, setHeroPreview);
                            }}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="missionImage"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Mission Image (600x600)</FormLabel>
                    <div className="w-full aspect-square relative border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                         {missionPreview ? (
                             <NextImage src={missionPreview} alt="Mission preview" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                        ) : (
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        )}
                    </div>
                    <FormControl>
                        <Input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                                field.onChange(e.target.files);
                                handleFileChange(e, setMissionPreview);
                            }}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
