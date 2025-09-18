"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Heart, MessageCircle, Calendar, MapPin } from "lucide-react";
import { getUserReviews } from "@/lib/data";
import type { Review } from "@/types";
import { format } from "date-fns";
import { dateLocales } from "@/lib/date-utils";
import type { Locale } from "@/i18n-config";

interface MyReviewsProps {
  userId: string;
  lang: Locale;
}

export function MyReviews({ userId, lang }: MyReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserReviews = async () => {
      try {
        setLoading(true);
        const userReviews = await getUserReviews(userId);
        setReviews(userReviews);
      } catch (err) {
        console.error('Error loading user reviews:', err);
        setError('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUserReviews();
    }
  }, [userId]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getStatusBadge = (approved: boolean | null) => {
    if (approved === null) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
    }
    if (approved) {
      return <Badge variant="default" className="bg-green-600">Approved</Badge>;
    }
    return <Badge variant="destructive">Rejected</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          No reviews yet
        </h3>
        <p className="text-muted-foreground">
          Start sharing your golf experiences by writing your first review!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">My Reviews</h3>
          <p className="text-sm text-muted-foreground">
            {reviews.length} review{reviews.length !== 1 ? 's' : ''} written
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={review.userAvatar || undefined} />
                  <AvatarFallback>
                    {review.userName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{review.courseName}</h4>
                        {review.isVerifiedBooking && (
                          <Badge variant="secondary" className="text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center">
                          {renderStars(review.rating)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {review.rating}/5
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(review.approved)}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(review.createdAt), 'MMM d, yyyy', {
                          locale: dateLocales[lang]
                        })}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed">{review.text}</p>

                  {review.imageUrl && (
                    <div className="mt-3">
                      <img
                        src={review.imageUrl}
                        alt="Review image"
                        className="rounded-lg max-w-xs h-32 object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-2 border-t">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Heart className="h-4 w-4" />
                      <span>{review.likesCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      <span>{review.commentsCount || 0}</span>
                    </div>
                    {review.experienceType && (
                      <Badge variant="outline" className="text-xs">
                        {review.experienceType === 'overall' ? 'Overall' :
                         review.experienceType === 'green' ? 'Green' :
                         review.experienceType === 'service' ? 'Service' :
                         review.experienceType === 'facilities' ? 'Facilities' :
                         review.experienceType}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default MyReviews;