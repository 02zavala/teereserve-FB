"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SmartLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  preloadDelay?: number; // Delay antes de precargar en hover (ms)
  priority?: boolean;
}

// Componente Link inteligente con precarga en hover
export function SmartLink({
  href,
  children,
  className,
  prefetch = true,
  preloadDelay = 200,
  priority = false
}: SmartLinkProps) {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);

  const handleMouseEnter = () => {
    if (!prefetch) return;

    timeoutRef.current = setTimeout(() => {
      setIsPreloading(true);
      // Precargar la ruta
      router.prefetch(href);
    }, preloadDelay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Link
      href={href}
      className={cn(
        'transition-colors duration-200',
        isPreloading && 'opacity-90',
        className
      )}
      prefetch={priority}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </Link>
  );
}

// Hook para precargar datos críticos
export function useDataPreloader() {
  const [preloadedData, setPreloadedData] = useState<Map<string, any>>(new Map());
  const [isPreloading, setIsPreloading] = useState(false);

  const preloadData = async (key: string, fetcher: () => Promise<any>) => {
    if (preloadedData.has(key)) {
      return preloadedData.get(key);
    }

    setIsPreloading(true);
    try {
      const data = await fetcher();
      setPreloadedData(prev => new Map(prev).set(key, data));
      return data;
    } catch (error) {
      console.error(`Error preloading data for key ${key}:`, error);
      throw error;
    } finally {
      setIsPreloading(false);
    }
  };

  const getPreloadedData = (key: string) => {
    return preloadedData.get(key);
  };

  const clearPreloadedData = (key?: string) => {
    if (key) {
      setPreloadedData(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
    } else {
      setPreloadedData(new Map());
    }
  };

  return {
    preloadData,
    getPreloadedData,
    clearPreloadedData,
    isPreloading,
    hasPreloadedData: (key: string) => preloadedData.has(key)
  };
}

// Componente para precargar imágenes críticas
interface ImagePreloaderProps {
  images: string[];
  onComplete?: () => void;
  onProgress?: (loaded: number, total: number) => void;
}

export function ImagePreloader({ images, onComplete, onProgress }: ImagePreloaderProps) {
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    if (images.length === 0) {
      onComplete?.();
      return;
    }

    let loaded = 0;
    const imageElements: HTMLImageElement[] = [];

    const handleImageLoad = () => {
      loaded++;
      setLoadedCount(loaded);
      onProgress?.(loaded, images.length);
      
      if (loaded === images.length) {
        onComplete?.();
      }
    };

    const handleImageError = () => {
      loaded++;
      setLoadedCount(loaded);
      onProgress?.(loaded, images.length);
      
      if (loaded === images.length) {
        onComplete?.();
      }
    };

    images.forEach(src => {
      const img = new Image();
      img.onload = handleImageLoad;
      img.onerror = handleImageError;
      img.src = src;
      imageElements.push(img);
    });

    return () => {
      imageElements.forEach(img => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [images, onComplete, onProgress]);

  return null; // Este componente no renderiza nada
}

// Hook para precargar recursos críticos de la aplicación
export function useCriticalResourcePreloader() {
  const [isPreloading, setIsPreloading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const preloadCriticalResources = async () => {
      const criticalImages = [
        '/images/hero-golf.jpg',
        '/images/logo.svg',
        '/images/default-course.jpg'
      ];

      const criticalFonts = [
        'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap',
        'https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap'
      ];

      let totalResources = criticalImages.length + criticalFonts.length;
      let loadedResources = 0;

      const updateProgress = () => {
        loadedResources++;
        setProgress((loadedResources / totalResources) * 100);
        
        if (loadedResources === totalResources) {
          setTimeout(() => setIsPreloading(false), 500); // Pequeño delay para UX
        }
      };

      // Precargar imágenes
      criticalImages.forEach(src => {
        const img = new Image();
        img.onload = updateProgress;
        img.onerror = updateProgress;
        img.src = src;
      });

      // Precargar fuentes
      criticalFonts.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = href;
        link.onload = updateProgress;
        link.onerror = updateProgress;
        document.head.appendChild(link);
      });
    };

    preloadCriticalResources();
  }, []);

  return { isPreloading, progress };
}

// Componente de pantalla de carga con progreso
interface LoadingScreenProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
  className?: string;
}

export function LoadingScreen({ 
  isLoading, 
  progress = 0, 
  message = 'Cargando...', 
  className 
}: LoadingScreenProps) {
  if (!isLoading) return null;

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
      className
    )}>
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto">
          <div className="w-full h-full border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
        
        <div className="space-y-2">
          <p className="text-lg font-medium">{message}</p>
          
          {progress > 0 && (
            <div className="w-64 mx-auto">
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook para optimizar la carga de componentes pesados
export function useLazyComponentLoader<T>(loader: () => Promise<T>, deps: any[] = []) {
  const [component, setComponent] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = async () => {
    if (component || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const loadedComponent = await loader();
      setComponent(loadedComponent);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComponent();
  }, deps);

  return { component, isLoading, error, reload: loadComponent };
}