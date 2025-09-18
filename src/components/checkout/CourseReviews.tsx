'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/StarRating';
import { Review } from '@/types';
import { getReviewsForCourse } from '@/lib/data';
import { Star, Quote, ChevronDown, ChevronUp, MessageCircle, ThumbsUp } from 'lucide-react';
import { Locale } from '@/i18n-config';

interface Props {
  courseId: string;
  courseName: string;
  lang: Locale;
}

export function CourseReviews({ courseId, courseName, lang }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    loadReviews();
  }, [courseId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const courseReviews = await getReviewsForCourse(courseId);
      
      // Filter approved reviews and sort by rating and date
      const approvedReviews = courseReviews
        .filter(review => review.status === 'approved')
        .sort((a, b) => {
          // Sort by rating first, then by date
          if (b.rating !== a.rating) return b.rating - a.rating;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      
      setReviews(approvedReviews);
      setTotalReviews(approvedReviews.length);
      
      // Calculate average rating
      if (approvedReviews.length > 0) {
        const avgRating = approvedReviews.reduce((sum, review) => sum + review.rating, 0) / approvedReviews.length;
        setAverageRating(Math.round(avgRating * 10) / 10);
      }
    } catch (error) {
      console.error('Error loading course reviews:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            {lang === 'es' ? 'Reseñas del Campo' : 'Course Reviews'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            {lang === 'es' ? 'Reseñas del Campo' : 'Course Reviews'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Quote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {lang === 'es' 
                ? 'No hay reseñas disponibles para este campo aún.' 
                : 'No reviews available for this course yet.'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {lang === 'es' 
                ? '¡Sé el primero en compartir tu experiencia!' 
                : 'Be the first to share your experience!'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            {lang === 'es' ? 'Reseñas del Campo' : 'Course Reviews'}
          </div>
          <div className="flex items-center gap-2">
            <StarRating rating={averageRating} size="sm" />
            <span className="text-sm font-medium">
              {averageRating} ({totalReviews} {lang === 'es' ? 'reseñas' : 'reviews'})
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedReviews.map((review) => (
            <div key={review.id} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                    {review.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{review.userName}</p>
                      {review.verified && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {lang === 'es' ? 'Verificado' : 'Verified'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{formatDate(review.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StarRating rating={review.rating} size="sm" />
                  <span className="text-xs font-medium text-gray-700 ml-1">{review.rating}</span>
                </div>
              </div>
              
              <div className="ml-11">
                <p className="text-sm text-gray-700 leading-relaxed mb-2">
                  {truncateText(review.comment, 150)}
                </p>
                
                {(review.likesCount > 0 || review.commentsCount > 0) && (
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {review.likesCount > 0 && (
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {review.likesCount}
                      </span>
                    )}
                    {review.commentsCount > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {review.commentsCount}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {reviews.length > 3 && (
            <div className="text-center pt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="text-green-600 hover:text-green-700"
              >
                {showAllReviews ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    {lang === 'es' ? 'Ver menos' : 'Show less'}
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    {lang === 'es' 
                      ? `Ver todas (${reviews.length})` 
                      : `View all (${reviews.length})`}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        
        {/* Trust indicators */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              {lang === 'es' 
                ? 'Reseñas verificadas de jugadores reales' 
                : 'Verified reviews from real players'}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-current text-yellow-400" />
              {lang === 'es' ? 'Calificación promedio' : 'Average rating'}: {averageRating}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}