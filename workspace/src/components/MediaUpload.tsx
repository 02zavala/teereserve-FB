'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Image as ImageIcon, Video, FileImage, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
  size: number;
}

interface Props {
  onMediaChange: (files: MediaFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  disabled?: boolean;
}

const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_FILE_SIZE = 10; // 10MB
const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];

export function MediaUpload({
  onMediaChange,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  disabled = false
}: Props) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported. Please use JPEG, PNG, WebP images or MP4, WebM videos.`;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      return `File size (${fileSizeMB.toFixed(1)}MB) exceeds the maximum limit of ${maxFileSize}MB.`;
    }

    return null;
  };

  const createMediaFile = (file: File): Promise<MediaFile> => {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(7);
      const type = file.type.startsWith('image/') ? 'image' : 'video';
      
      if (type === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id,
            file,
            preview: e.target?.result as string,
            type,
            size: file.size
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        // For videos, create a thumbnail using video element
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          video.currentTime = 1; // Seek to 1 second for thumbnail
        };
        
        video.onseeked = () => {
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const preview = canvas.toDataURL('image/jpeg', 0.8);
            resolve({
              id,
              file,
              preview,
              type,
              size: file.size
            });
          }
        };
        
        video.onerror = () => {
          // Fallback: use a default video icon
          resolve({
            id,
            file,
            preview: '', // Empty preview for videos that can't be thumbnailed
            type,
            size: file.size
          });
        };
        
        video.src = URL.createObjectURL(file);
      }
    });
  };

  const handleFiles = useCallback(async (files: FileList) => {
    if (disabled) return;
    
    const fileArray = Array.from(files);
    const remainingSlots = maxFiles - mediaFiles.length;
    
    if (fileArray.length > remainingSlots) {
      toast({
        title: "Too many files",
        description: `You can only upload ${remainingSlots} more file(s). Maximum ${maxFiles} files allowed.`,
        variant: "destructive"
      });
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      toast({
        title: "Some files were rejected",
        description: errors.join('\n'),
        variant: "destructive"
      });
    }

    if (validFiles.length === 0) return;

    try {
      const newMediaFiles = await Promise.all(
        validFiles.map(file => createMediaFile(file))
      );
      
      const updatedFiles = [...mediaFiles, ...newMediaFiles];
      setMediaFiles(updatedFiles);
      onMediaChange(updatedFiles);
      
      toast({
        title: "Files uploaded",
        description: `${newMediaFiles.length} file(s) added successfully.`,
      });
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Upload error",
        description: "Failed to process some files. Please try again.",
        variant: "destructive"
      });
    }
  }, [mediaFiles, maxFiles, disabled, onMediaChange, toast, maxFileSize, acceptedTypes]);

  const removeFile = (id: string) => {
    const updatedFiles = mediaFiles.filter(file => file.id !== id);
    setMediaFiles(updatedFiles);
    onMediaChange(updatedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-colors ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : disabled 
            ? 'border-gray-200 bg-gray-50' 
            : 'border-gray-300 hover:border-primary/50'
        }`}
      >
        <CardContent 
          className="p-6 text-center cursor-pointer"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
          
          <div className="flex flex-col items-center gap-3">
            <div className={`p-3 rounded-full ${
              disabled ? 'bg-gray-200' : 'bg-primary/10'
            }`}>
              <Upload className={`w-6 h-6 ${
                disabled ? 'text-gray-400' : 'text-primary'
              }`} />
            </div>
            
            <div>
              <p className={`font-medium ${
                disabled ? 'text-gray-400' : 'text-gray-700'
              }`}>
                {disabled 
                  ? 'Upload disabled' 
                  : 'Drop files here or click to browse'
                }
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Support for images (JPEG, PNG, WebP) and videos (MP4, WebM)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Max {maxFiles} files, {maxFileSize}MB each
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {mediaFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700">
              Uploaded Files ({mediaFiles.length}/{maxFiles})
            </h4>
            <Badge variant="secondary">
              {formatFileSize(mediaFiles.reduce((sum, file) => sum + file.size, 0))}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {mediaFiles.map((mediaFile) => (
              <Card key={mediaFile.id} className="relative group overflow-hidden">
                <CardContent className="p-2">
                  <div className="aspect-square relative bg-gray-100 rounded-md overflow-hidden">
                    {mediaFile.type === 'image' ? (
                      <Image
                        src={mediaFile.preview}
                        alt="Preview"
                        fill
                        sizes="200px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {mediaFile.preview ? (
                          <Image
                            src={mediaFile.preview}
                            alt="Video thumbnail"
                            fill
                            sizes="200px"
                            className="object-cover"
                          />
                        ) : (
                          <Video className="w-8 h-8 text-gray-400" />
                        )}
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Video className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}
                    
                    {/* Remove button */}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(mediaFile.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    
                    {/* File type badge */}
                    <Badge 
                      variant="secondary" 
                      className="absolute bottom-1 left-1 text-xs px-1 py-0"
                    >
                      {mediaFile.type === 'image' ? (
                        <ImageIcon className="w-3 h-3 mr-1" />
                      ) : (
                        <Video className="w-3 h-3 mr-1" />
                      )}
                      {mediaFile.type}
                    </Badge>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-xs font-medium truncate" title={mediaFile.file.name}>
                      {mediaFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(mediaFile.size)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Usage info */}
      {mediaFiles.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">Media Upload Tips:</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• Images will be automatically optimized for web display</li>
              <li>• Videos should be under {maxFileSize}MB for best performance</li>
              <li>• All media will be publicly visible with your review</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}