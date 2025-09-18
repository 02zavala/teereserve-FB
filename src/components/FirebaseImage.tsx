'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface FirebaseImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  onError?: () => void;
}

export function FirebaseImage({
  src,
  alt,
  width,
  height,
  className,
  fill,
  priority,
  sizes,
  onError,
  ...props
}: FirebaseImageProps) {
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src);
  
  const maxRetries = 2;
  
  const handleImageError = useCallback(() => {
    console.warn(`Firebase image failed to load: ${currentSrc}`);
    
    // If this is a Firebase Storage URL and we haven't exceeded retry limit
    if (currentSrc.includes('firebasestorage.googleapis.com') && retryCount < maxRetries) {
      // Try to refresh the token by adding a cache-busting parameter
      const url = new URL(currentSrc);
      url.searchParams.set('_retry', (retryCount + 1).toString());
      url.searchParams.set('_t', Date.now().toString());
      
      setRetryCount(prev => prev + 1);
      setCurrentSrc(url.toString());
      
      console.log(`Retrying Firebase image load (attempt ${retryCount + 1}/${maxRetries}): ${url.toString()}`);
      return;
    }
    
    // If retries exhausted or not a Firebase URL, show fallback
    setImageError(true);
    onError?.();
  }, [currentSrc, retryCount, maxRetries, onError]);
  
  const handleImageLoad = useCallback(() => {
    // Reset retry count on successful load
    if (retryCount > 0) {
      console.log(`Firebase image loaded successfully after ${retryCount} retries`);
      setRetryCount(0);
    }
  }, [retryCount]);
  
  // If image failed and we've exhausted retries, show fallback
  if (imageError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gray-100 text-gray-400 text-sm",
          className
        )}
        style={fill ? undefined : { width, height }}
      >
        <div className="text-center p-4">
          <div className="text-xs opacity-75">Image unavailable</div>
          <div className="text-xs opacity-50 mt-1">Please try refreshing</div>
        </div>
      </div>
    );
  }
  
  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      fill={fill}
      priority={priority}
      sizes={sizes}
      className={className}
      onError={handleImageError}
      onLoad={handleImageLoad}
      {...props}
    />
  );
}