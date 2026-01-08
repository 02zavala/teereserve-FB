'use client';

import React, { useState, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface FirebaseAvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  className?: string;
  onError?: () => void;
}

export function FirebaseAvatar({
  src,
  alt = 'Avatar',
  fallback,
  className,
  onError,
  ...props
}: FirebaseAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src);
  
  const maxRetries = 2;
  
  const handleImageError = useCallback(() => {
    console.warn(`Firebase avatar failed to load: ${currentSrc}`);
    
    // If this is a Firebase Storage URL and we haven't exceeded retry limit
    if (currentSrc && currentSrc.includes('firebasestorage.googleapis.com') && retryCount < maxRetries) {
      // Try to refresh the token by adding a cache-busting parameter
      try {
        const url = new URL(currentSrc);
        url.searchParams.set('_retry', (retryCount + 1).toString());
        url.searchParams.set('_t', Date.now().toString());
        
        setRetryCount(prev => prev + 1);
        setCurrentSrc(url.toString());
        
        console.log(`Retrying Firebase avatar load (attempt ${retryCount + 1}/${maxRetries}): ${url.toString()}`);
        return;
      } catch (urlError) {
        console.warn('Failed to parse Firebase Storage URL for retry:', urlError);
      }
    }
    
    // If retries exhausted or not a Firebase URL, show fallback
    setImageError(true);
    onError?.();
  }, [currentSrc, retryCount, maxRetries, onError]);
  
  const handleImageLoad = useCallback(() => {
    // Reset retry count on successful load
    if (retryCount > 0) {
      console.log(`Firebase avatar loaded successfully after ${retryCount} retries`);
      setRetryCount(0);
    }
  }, [retryCount]);
  
  // Generate fallback text from alt or fallback prop
  const fallbackText = fallback || (alt ? alt.substring(0, 2).toUpperCase() : '??');
  
  return (
    <Avatar className={cn(className)} {...props}>
      {currentSrc && !imageError && (
        <AvatarImage 
          src={currentSrc} 
          alt={alt}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      )}
      <AvatarFallback>{fallbackText}</AvatarFallback>
    </Avatar>
  );
}