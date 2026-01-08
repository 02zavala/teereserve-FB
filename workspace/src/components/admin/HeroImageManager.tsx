"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { uploadSiteImage, getHeroImagesContent, updateHeroImagesContent, type HeroImagesContent } from '@/lib/data';
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
import { Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import NextImage from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const formSchema = z.object({
  heroImage1: z.any().optional(),
  heroImage2: z.any().optional(),
  heroImage3: z.any().optional(),
  heroImage4: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface HeroImage {
  id: string;
  url: string;
  name: string;
}

interface HeroImageManagerProps {
  initialImages: HeroImage[];
}

export function HeroImageManager({ initialImages }: HeroImageManagerProps) {
  const [images, setImages] = useState<HeroImage[]>(initialImages);
  const [isLoading, setIsLoading] = useState(false);
  const [previews, setPreviews] = useState<{ [key: string]: string | null }>({});
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => ({
          ...prev,
          [fieldName]: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      // Get current hero images content
      const currentContent = await getHeroImagesContent();
      const updatedContent: HeroImagesContent = { ...currentContent };
      
      let hasUploads = false;
      
      // Upload new images and update URLs
      for (const [fieldName, files] of Object.entries(values)) {
        if (files && files.length > 0) {
          const file = files[0];
          const imageNumber = fieldName.replace('heroImage', '');
          const imageUrl = await uploadSiteImage(file, `hero-${imageNumber}`);
          
          // Update the corresponding URL in the content
          const urlKey = `image${imageNumber}Url` as keyof HeroImagesContent;
          updatedContent[urlKey] = imageUrl;
          hasUploads = true;
        }
      }

      if (hasUploads) {
        // Save updated content to database
        await updateHeroImagesContent(updatedContent);
        
        // Update local state
        const newImages = [
          { id: '1', url: updatedContent.image1Url, name: 'Hero Image 1' },
          { id: '2', url: updatedContent.image2Url, name: 'Hero Image 2' },
          { id: '3', url: updatedContent.image3Url, name: 'Hero Image 3' },
          { id: '4', url: updatedContent.image4Url, name: 'Hero Image 4' },
        ];
        setImages(newImages);
        
        toast({
          title: "Éxito",
          description: "Las imágenes hero se han actualizado correctamente.",
        });

        // Reset form and previews
        form.reset();
        setPreviews({});
      } else {
        toast({
          title: "Información",
          description: "No se seleccionaron nuevas imágenes para subir.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error uploading hero images:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al subir las imágenes. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const heroImageSlots = [
    { id: 'heroImage1', label: 'Hero Image 1', currentUrl: images[0]?.url || '/hero-1.jpg' },
    { id: 'heroImage2', label: 'Hero Image 2', currentUrl: images[1]?.url || '/hero-2.jpg' },
    { id: 'heroImage3', label: 'Hero Image 3', currentUrl: images[2]?.url || '/hero-3.jpg' },
    { id: 'heroImage4', label: 'Hero Image 4', currentUrl: images[3]?.url || '/hero-4.jpg' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Images Management</CardTitle>
        <CardDescription>
          Gestiona las imágenes del carrusel hero de la página principal. Recomendado: 1920x800px.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {heroImageSlots.map((slot) => (
                <FormField
                  key={slot.id}
                  control={form.control}
                  name={slot.id as keyof FormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{slot.label} (1920x800)</FormLabel>
                      <div className="w-full aspect-[16/9] relative border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {previews[slot.id] ? (
                          <NextImage 
                            src={previews[slot.id]!} 
                            alt={`${slot.label} preview`} 
                            fill 
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover" 
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-4">
                            <NextImage 
                              src={slot.currentUrl} 
                              alt={`Current ${slot.label}`} 
                              fill 
                              sizes="(max-width: 768px) 100vw, 50vw"
                              className="object-cover opacity-50" 
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="bg-white/90 rounded-lg p-2">
                                <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                                <p className="text-xs text-muted-foreground">Imagen actual</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <FormControl>
                        <Input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            field.onChange(e.target.files);
                            handleFileChange(e, slot.id);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar Imágenes Hero
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}