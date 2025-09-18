"use client";

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  fill = false,
  objectFit = 'cover',
  objectPosition = 'center',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          className
        )}
        style={{ width, height }}
      >
        <span className="text-sm">Error al cargar imagen</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <Skeleton 
          className="absolute inset-0 z-10" 
          style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={sizes}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          fill && `object-${objectFit}`,
          className
        )}
        style={{
          objectFit: fill ? objectFit : undefined,
          objectPosition: fill ? objectPosition : undefined,
        }}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
      />
    </div>
  );
}

// Hook para generar blur placeholder automáticamente
export function useBlurDataURL(src: string): string {
  // Genera un blur placeholder simple basado en colores promedio
  const canvas = typeof window !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return '';
  
  canvas.width = 10;
  canvas.height = 10;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Color base para el blur
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, 10, 10);
  
  return canvas.toDataURL();
}

// Componente específico para imágenes de golf courses
export function CourseImage({
  src,
  alt,
  className,
  priority = false,
  ...props
}: Omit<OptimizedImageProps, 'sizes'>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={className}
      priority={priority}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      quality={90}
      {...props}
    />
  );
}

// Componente específico para avatares
export function AvatarImage({
  src,
  alt,
  className,
  size = 40,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height' | 'sizes'> & { size?: number }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      sizes={`${size}px`}
      quality={80}
      {...props}
    />
  );
}