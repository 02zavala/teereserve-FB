"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function ProgressiveImage({
  src,
  alt,
  width,
  height,
  fill,
  className,
  priority = false,
  quality = 75,
  placeholder = 'blur',
  blurDataURL,
  sizes,
  onLoad,
  onError,
}: ProgressiveImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);

  // Generar un blur data URL simple si no se proporciona uno
  const defaultBlurDataURL = blurDataURL || 
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';

  useEffect(() => {
    setImageSrc(src);
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
    // Fallback a una imagen por defecto
    setImageSrc('/images/placeholder-course.jpg');
  };

  if (hasError) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-muted text-muted-foreground',
        fill ? 'absolute inset-0' : '',
        className
      )}>
        <div className="text-center">
          <div className="text-sm">Error al cargar imagen</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', fill ? 'absolute inset-0' : '', className)}>
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={defaultBlurDataURL}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {/* Skeleton loader mientras carga */}
      {isLoading && (
        <div className={cn(
          'absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted',
          'flex items-center justify-center'
        )}>
          <div className="text-xs text-muted-foreground">Cargando...</div>
        </div>
      )}
    </div>
  );
}

// Componente especializado para imágenes de campos de golf
export function GolfCourseImage({
  src,
  alt,
  className,
  ...props
}: Omit<ProgressiveImageProps, 'alt'> & { alt?: string }) {
  return (
    <ProgressiveImage
      src={src}
      alt={alt || 'Campo de golf'}
      className={cn('object-cover', className)}
      quality={85}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      {...props}
    />
  );
}

// Hook para precargar imágenes
export function useImagePreloader(urls: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const preloadImages = async () => {
    setIsLoading(true);
    const promises = urls.map(url => {
      return new Promise<string>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(url);
        img.src = url;
      });
    });

    try {
      const loaded = await Promise.allSettled(promises);
      const successful = loaded
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<string>).value);
      
      setLoadedImages(new Set(successful));
    } catch (error) {
      console.warn('Error precargando imágenes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (urls.length > 0) {
      preloadImages();
    }
  }, [urls.join(',')]);

  return { loadedImages, isLoading, preloadImages };
}