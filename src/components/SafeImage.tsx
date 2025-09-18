'use client';
import { useState, useMemo } from 'react';
import Image, { ImageProps } from 'next/image';

const FALLBACK = '/images/fallback.svg';

export default function SafeImage(props: ImageProps) {
  const [src, setSrc] = useState(props.src);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  
  const safeSrc = useMemo(() => {
    const s = typeof src === 'string' ? src : String(src);
    return s && s !== 'undefined' && s !== 'null' ? s : FALLBACK;
  }, [src]);
  
  const handleError = () => {
    if (safeSrc === FALLBACK) {
      // If fallback image fails, mark it as failed to prevent infinite loop
      setFallbackFailed(true);
    } else {
      // Try fallback image
      setSrc(FALLBACK);
    }
  };
  
  if (fallbackFailed) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 text-gray-400 text-sm"
        style={{ width: props.width, height: props.height }}
      >
        Image unavailable
      </div>
    );
  }
  
  return (
    <Image
      {...props}
      src={safeSrc}
      onError={handleError}
      unoptimized={process.env.NODE_ENV === 'development'}
      alt={props.alt || 'image'}
    />
  );
}