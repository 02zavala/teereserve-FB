"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllReviews } from "@/lib/data";
import { assistReviewModeration } from "@/ai/flows/assist-review-moderation";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { ReviewActions } from "./ReviewActions";
import { StarRating } from "@/components/StarRating";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import type { Review } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n-config";
import { dateLocales } from "@/lib/date-utils";

function ReviewCard({ review, lang }: { review: Review, lang: Locale }) {
    const [moderationResult, setModerationResult] = useState<{ isSpam: boolean; isToxic: boolean; reason: string; } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleModeration = async () => {
        setIsLoading(true);
        try {
            const result = await assistReviewModeration({
                reviewText: review.comment
            });
            setModerationResult(result);
        } catch (error) {
            console.error('Error in moderation:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = () => {
        if (review.status === 'pending') {
            return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
        } else if (review.status === 'approved') {
            return <Badge variant="outline" className="text-green-600 border-green-600">Approved</Badge>;
        } else {
            return <Badge variant="outline" className="text-red-600 border-red-600">Rejected</Badge>;
        }
    };

    const getModerationBadge = () => {
        if (!moderationResult) return null;
        
        if (moderationResult.isSpam || moderationResult.isToxic) {
            return (
                <Badge variant="destructive" className="ml-2">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {moderationResult.isSpam ? 'Spam' : 'Toxic'}
                </Badge>
            );
        } else {
            return (
                <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    Clean
                </Badge>
            );
        }
    };

    return (
        <Card className="mb-4">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{review.userName}</CardTitle>
                        <CardDescription>
                            {review.courseName} • {format(new Date(review.createdAt), 'PPP', { locale: dateLocales[lang] })}
                        </CardDescription>
                    </div>
                    <div className="flex items-center">
                        {getStatusBadge()}
                        {getModerationBadge()}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <StarRating rating={review.rating} />
                        <span className="text-sm text-muted-foreground">({review.rating}/5)</span>
                    </div>
                    
                    <p className="text-sm">{review.comment}</p>
                    
                    {moderationResult && (
                        <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">AI Moderation Result:</p>
                            <p className="text-sm text-muted-foreground">{moderationResult.reason}</p>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2">
                        <button
                            onClick={handleModeration}
                            disabled={isLoading}
                            className="text-sm text-primary hover:underline disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />
                                    Analyzing...
                                </>
                            ) : (
                                'Run AI Moderation'
                            )}
                        </button>
                        
                        <ReviewActions review={review} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ReviewsSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="mb-4">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                            <Skeleton className="h-6 w-20" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-16 w-full" />
                            <div className="flex justify-between items-center pt-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-8 w-24" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

interface ReviewsClientProps {
    lang: Locale;
}

export default function ReviewsClient({ lang }: ReviewsClientProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const reviewsData = await getAllReviews();
                setReviews(reviewsData);
            } catch (error) {
                console.error('Error fetching reviews:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [pathname]);

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Review Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage and moderate user reviews with AI assistance
                    </p>
                </div>
                <ReviewsSkeleton />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Review Management</h1>
                <p className="text-muted-foreground mt-2">
                    Manage and moderate user reviews with AI assistance
                </p>
            </div>

            {reviews.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No reviews found</h3>
                        <p className="text-muted-foreground text-center">
                            There are no reviews to display at the moment.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <ReviewCard key={review.id} review={review} lang={lang} />
                    ))}
                </div>
            )}
        </div>
    );
}