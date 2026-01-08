"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UploadCloud, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  newFiles: File[];
  setNewFiles: (files: File[]) => void;
  existingImageUrls: string[];
  setExistingImageUrls: (urls: string[]) => void;
}

export function ImageUploader({ newFiles, setNewFiles, existingImageUrls, setExistingImageUrls }: ImageUploaderProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesToAdd = Array.from(event.target.files);
      setNewFiles([...newFiles, ...filesToAdd]);
    }
  };

  const removeNewFile = (index: number) => {
    setNewFiles(newFiles.filter((_, i) => i !== index));
  };

  const removeExistingUrl = (url: string) => {
    setExistingImageUrls(existingImageUrls.filter((u) => u !== url));
  };
  
  const allImages = [
    ...existingImageUrls.map(url => ({ type: 'url', value: url, name: url.split('/').pop()?.split('?')[0] || 'image' })),
    ...newFiles.map(file => ({ type: 'file', value: URL.createObjectURL(file), name: file.name })),
  ];

  return (
    <div className="space-y-4">
      <div className="p-6 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-primary transition-colors">
        <label htmlFor="image-upload" className="flex flex-col items-center space-y-2 cursor-pointer">
          <UploadCloud className="w-12 h-12 text-muted-foreground" />
          <span className="font-semibold text-primary">Click to upload or drag and drop</span>
          <span className="text-sm text-muted-foreground">PNG, JPG, or WEBP (max 5MB each)</span>
        </label>
        <Input 
          id="image-upload" 
          type="file" 
          multiple 
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          onChange={handleFileChange} 
        />
      </div>

      {allImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {allImages.map((image, index) => (
            <div key={`${image.type}-${index}-${image.value}`} className="relative group aspect-square">
              <Image
                src={image.value}
                alt={image.name || 'Course image'}
                fill
                sizes="200px"
                className="object-cover rounded-md"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => image.type === 'file' ? removeNewFile(index - existingImageUrls.length) : removeExistingUrl(image.value)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove image</span>
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                {image.name}
              </div>
            </div>
          ))}
        </div>
      )}
       {allImages.length === 0 && (
         <div className="text-center text-muted-foreground py-4 flex flex-col items-center">
            <ImageIcon className="h-10 w-10 mb-2" />
            <p>No images have been uploaded yet.</p>
         </div>
       )}
    </div>
  );
}
