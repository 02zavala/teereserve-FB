import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  className?: string;
  starClassName?: string;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StarRating({ 
  rating, 
  maxRating = 5, 
  className, 
  starClassName, 
  onRatingChange,
  readonly = false,
  size = 'md'
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };
  
  const displayRating = readonly ? rating : (hoverRating || rating);
  const fullStars = Math.floor(displayRating);
  const halfStar = displayRating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = maxRating - fullStars - halfStar;

  const handleStarClick = (starValue: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(starValue);
    }
  };

  const handleStarHover = (starValue: number) => {
    if (!readonly) {
      setHoverRating(starValue);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(0);
    }
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)} onMouseLeave={handleMouseLeave}>
      {[...Array(maxRating)].map((_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= fullStars;
        const isHalf = starValue === fullStars + 1 && halfStar === 1;
        
        return (
          <div
            key={i}
            className={readonly ? '' : 'cursor-pointer'}
            onClick={() => handleStarClick(starValue)}
            onMouseEnter={() => handleStarHover(starValue)}
          >
            {isHalf && readonly ? (
              <StarHalf className={cn(sizeClasses[size], "fill-primary text-primary", starClassName)} />
            ) : (
              <Star 
                className={cn(
                  sizeClasses[size],
                  isFilled || (!readonly && starValue <= hoverRating) 
                    ? "fill-primary text-primary" 
                    : "text-muted-foreground",
                  starClassName
                )} 
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
