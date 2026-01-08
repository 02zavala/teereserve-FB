'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/StarRating';
import { Review } from '@/types';
import { getAllReviews } from '@/lib/data';
import { Star, Quote, ArrowRight, MapPin, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Locale } from '@/i18n-config';

interface Props {
  dictionary: any;
  lang: Locale;
}

export function FeaturedReviews({ dictionary, lang }: Props) {
  const [featuredReviews, setFeaturedReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const nextSlide = useCallback(() => {
    if (featuredReviews.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % Math.ceil(featuredReviews.length / 3));
    }
  }, [featuredReviews.length]);

  const prevSlide = useCallback(() => {
    if (featuredReviews.length > 0) {
      setCurrentIndex((prevIndex) => 
        prevIndex === 0 ? Math.ceil(featuredReviews.length / 3) - 1 : prevIndex - 1
      );
    }
  }, [featuredReviews.length]);

  useEffect(() => {
    const loadReviews = () => {
      setLoading(true);
      getAllReviews()
        .then((allReviews) => {
          // Filter and sort reviews to get featured ones
          const highRatedReviews = allReviews
            .filter(review => review.rating >= 4 && review.approved === true)
            .sort((a, b) => {
              // Sort by rating first, then by likes count, then by date
              if (b.rating !== a.rating) return b.rating - a.rating;
              if (b.likesCount !== a.likesCount) return (b.likesCount || 0) - (a.likesCount || 0);
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })
            .slice(0, 6); // Get top 6 reviews
          
          setFeaturedReviews(highRatedReviews);
        })
        .catch((error) => {
          console.error('Error loading featured reviews:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    };
    
    loadReviews();
  }, []);

  // Auto-play carousel
  useEffect(() => {
    if (!isAutoPlaying || featuredReviews.length <= 3) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        if (featuredReviews.length > 0) {
          return (prevIndex + 1) % Math.ceil(featuredReviews.length / 3);
        }
        return prevIndex;
      });
    }, 7000); // 7 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, featuredReviews.length]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const totalSlides = Math.ceil(featuredReviews.length / 3);
  const visibleReviews = featuredReviews.slice(currentIndex * 3, (currentIndex * 3) + 3);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (featuredReviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Quote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {lang === 'es' ? 'No hay reseñas destacadas aún' : 'No featured reviews yet'}
        </h3>
        <p className="text-gray-600">
          {lang === 'es' 
            ? 'Las reseñas aparecerán aquí una vez que los usuarios comiencen a compartir sus experiencias.' 
            : 'Reviews will appear here once users start sharing their experiences.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Carousel Container */}
      <div className="relative">
        {/* Navigation Buttons */}
        {totalSlides > 1 && (
          <>
            <button
              onClick={() => {
                setIsAutoPlaying(false);
                prevSlide();
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
              aria-label="Previous reviews"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => {
                setIsAutoPlaying(false);
                nextSlide();
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
              aria-label="Next reviews"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </>
        )}
        
        {/* Reviews Grid */}
        <div 
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 transition-all duration-500 ease-in-out"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          {visibleReviews.map((review, index) => (
            <Card key={`${review.id}-${currentIndex}-${index}`} className="hover:shadow-lg transition-shadow duration-300 group">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* User Info and Rating */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{review.userName}</p>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-3 h-3" />
                          {formatDate(review.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <StarRating rating={review.rating} />
                      <span className="text-sm font-medium text-gray-700 ml-1">{review.rating}</span>
                    </div>
                  </div>

                  {/* Course Info */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="font-medium">{review.courseName}</span>
                  </div>

                  {/* Review Text */}
                  <div className="relative">
                    <Quote className="w-4 h-4 text-green-600 mb-2" />
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {truncateText(review.comment, 120)}
                    </p>
                  </div>

                  {/* Engagement Stats */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {review.likesCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current text-yellow-400" />
                          {review.likesCount}
                        </span>
                      )}
                      {review.commentsCount > 0 && (
                        <span>{review.commentsCount} {lang === 'es' ? 'comentarios' : 'comments'}</span>
                      )}
                    </div>
                    
                    {review.verified && (
                      <Badge variant="secondary" className="text-xs">
                        {lang === 'es' ? 'Verificado' : 'Verified'}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Carousel Indicators */}
        {totalSlides > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            {[...Array(totalSlides)].map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsAutoPlaying(false);
                }}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentIndex
                    ? 'bg-green-600 scale-110'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Call to Action */}
      <div className="text-center">
        <Button asChild variant="outline" className="group">
          <Link href={`/${lang}/reviews`}>
            {lang === 'es' ? 'Ver todas las reseñas' : 'View all reviews'}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default FeaturedReviews;