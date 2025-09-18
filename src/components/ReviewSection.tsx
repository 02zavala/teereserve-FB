
"use client";

import { useState, useEffect } from 'react';
import type { GolfCourse, Review } from '@/types';
import { StarRating } from './StarRating';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback } from './ui/avatar';
import { FirebaseAvatar } from '@/components/FirebaseAvatar';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Loader2, Star, CheckCircle, MessageSquarePlus, Upload, Heart, MessageCircle, Share2, ThumbsUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { addReview, uploadReviewImage, likeReview, addReviewComment, getReviewLikes, getReviewComments, checkUserLikedReview, getUserReviewStats, updateUserBadges } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';
import { MediaUpload } from '@/components/MediaUpload';
import { Locale } from '@/i18n-config';
import { dateLocales } from '@/lib/date-utils';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';


interface ReviewSectionProps {
    course: GolfCourse;
}

function ReviewCard({ review, lang }: { review: Review, lang: Locale }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [timeAgo, setTimeAgo] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(review.likesCount || 0);
    const [commentsCount, setCommentsCount] = useState(review.commentsCount || 0);
    const [userBadges, setUserBadges] = useState<any[]>([]);

    useEffect(() => {
        setIsClient(true);
        // Check if user has liked this review
        if (user && review.likes) {
            setIsLiked(review.likes.some(like => like.userId === user.uid));
        }
        loadUserBadges();
    }, [user, review.likes]);

    const loadUserBadges = async () => {
        try {
            const stats = await getUserReviewStats(review.userId);
            setUserBadges(stats.badges || []);
        } catch (error) {
            console.error('Error loading user badges:', error);
        }
    };

     useEffect(() => {
        if (review.createdAt && isClient) {
          try {
            setTimeAgo(formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: dateLocales[lang] }));
          } catch(e) {
            console.error("Invalid date format:", review.createdAt);
            setTimeAgo("Invalid Date");
          }
        }
    }, [review.createdAt, lang, isClient]);

    const handleLike = async () => {
        if (!user) {
            toast({ title: 'Inicia sesión', description: 'Debes iniciar sesión para dar like', variant: 'destructive' });
            return;
        }

        try {
            await likeReview(review.courseId, review.id, user.uid, user.displayName || 'Usuario');
            setIsLiked(!isLiked);
            setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
            toast({ title: isLiked ? 'Like removido' : 'Like agregado', description: 'Tu reacción ha sido registrada' });
        } catch (error) {
            console.error('Error liking review:', error);
            toast({ title: 'Error', description: 'No se pudo procesar tu like', variant: 'destructive' });
        }
    };

    const handleComment = async () => {
        if (!user || !commentText.trim()) return;

        try {
            const newComment = await addReviewComment(
                review.courseId, 
                review.id, 
                user.uid, 
                user.displayName || 'Usuario',
                user.photoURL,
                commentText
            );
            
            // Update local state
            if (review.comments) {
                review.comments.push(newComment);
            } else {
                review.comments = [newComment];
            }
            
            setCommentsCount(prev => prev + 1);
            setCommentText('');
            toast({ title: 'Comentario agregado', description: 'Tu comentario ha sido publicado' });
        } catch (error) {
            console.error('Error adding comment:', error);
            toast({ title: 'Error', description: 'No se pudo agregar el comentario', variant: 'destructive' });
        }
    };

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `Reseña de ${review.user.name} - TeeReserve`,
                    text: `${review.text.substring(0, 100)}...`,
                    url: window.location.href
                });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast({ title: 'Enlace copiado', description: 'El enlace ha sido copiado al portapapeles' });
            }
        } catch (error) {
            console.error('Error sharing:', error);
            toast({ title: 'Error', description: 'No se pudo compartir la reseña', variant: 'destructive' });
        }
    };

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                    <FirebaseAvatar 
                        src={review.user.avatarUrl} 
                        alt={review.user.name}
                        fallback={review.user.name.substring(0, 2).toUpperCase()}
                        className="h-10 w-10"
                    />
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold">{review.user.name}</p>
                                {review.isVerifiedBooking && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Reserva Verificada
                                    </Badge>
                                )}
                                {userBadges.slice(0, 2).map((badge) => (
                                    <Badge key={badge.id} variant="outline" className="text-xs" title={badge.description}>
                                        {badge.icon} {badge.name}
                                    </Badge>
                                ))}
                            </div>
                            <span className="text-xs text-muted-foreground">{isClient && timeAgo ? timeAgo : <Skeleton className="h-4 w-20" />}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <StarRating rating={review.rating} className="" starClassName='h-4 w-4' />
                            {review.experienceType && (
                                <Badge variant="outline" className="text-xs">
                                    {review.experienceType === 'service' ? 'Servicio' : 
                                     review.experienceType === 'facilities' ? 'Instalaciones' :
                                     review.experienceType === 'green' ? 'Green' : 'General'}
                                </Badge>
                            )}
                        </div>
                        
                        <p className="text-sm text-foreground/80 leading-relaxed">{review.text}</p>
                        
                        {/* Media Gallery */}
                        {(review.media && review.media.length > 0) ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-2xl">
                                {review.media.slice(0, 6).map((mediaItem, index) => (
                                    <div key={mediaItem.id} className="relative rounded-lg overflow-hidden aspect-square">
                                        {mediaItem.type === 'image' ? (
                                            <img 
                                                src={mediaItem.url} 
                                                alt={`Foto ${index + 1} de la reseña`}
                                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                onClick={() => window.open(mediaItem.url, '_blank')}
                                            />
                                        ) : (
                                            <div className="relative w-full h-full">
                                                <video 
                                                    src={mediaItem.url}
                                                    className="w-full h-full object-cover cursor-pointer"
                                                    controls={false}
                                                    muted
                                                    onClick={() => window.open(mediaItem.url, '_blank')}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                    <div className="bg-white/90 rounded-full p-2">
                                                        <svg className="w-6 h-6 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {review.media && review.media.length > 6 && index === 5 && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold">
                                                +{review.media.length - 6}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : review.imageUrl && (
                            <div className="relative rounded-lg overflow-hidden max-w-md">
                                <img 
                                    src={review.imageUrl} 
                                    alt="Foto de la reseña" 
                                    className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => window.open(review.imageUrl!, '_blank')}
                                />
                            </div>
                        )}
                        
                        {/* Social Actions */}
                        <div className="flex items-center justify-between pt-3 border-t">
                            <div className="flex items-center space-x-4">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleLike}
                                    className={`flex items-center gap-1 transition-colors ${
                                        isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500'
                                    }`}
                                >
                                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                                    {likesCount}
                                </Button>
                                
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setShowComments(!showComments)}
                                    className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    {commentsCount}
                                </Button>
                                
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleShare}
                                    className="flex items-center gap-1 hover:text-green-500 transition-colors"
                                >
                                    <Share2 className="h-4 w-4" />
                                    Compartir
                                </Button>
                            </div>
                        </div>
                        
                        {/* Comments Section */}
                        {showComments && (
                            <div className="space-y-3 pt-3 border-t bg-muted/20 rounded-lg p-4">
                                {user && (
                                    <div className="flex space-x-2">
                                        <FirebaseAvatar 
                                            src={user.photoURL || ''} 
                                            alt={user.displayName || ''}
                                            fallback={user.displayName?.substring(0, 2).toUpperCase() || 'U'}
                                            className="h-8 w-8"
                                        />
                                        <div className="flex-1 space-y-2">
                                            <Textarea 
                                                placeholder="Escribe un comentario..."
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                className="min-h-[60px] bg-background"
                                            />
                                            <Button 
                                                size="sm" 
                                                onClick={handleComment}
                                                disabled={!commentText.trim()}
                                            >
                                                Comentar
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                
                                {review.comments && review.comments.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="font-medium text-sm">Comentarios</h4>
                                        {review.comments.map((comment) => (
                                            <div key={comment.id} className="flex space-x-2">
                                                <FirebaseAvatar 
                                                    src={comment.userAvatar || ''} 
                                                    alt={comment.userName}
                                                    fallback={comment.userName.substring(0, 2).toUpperCase()}
                                                    className="h-8 w-8"
                                                />
                                                <div className="flex-1">
                                                    <div className="bg-background rounded-lg p-3">
                                                        <p className="font-medium text-sm">{comment.userName}</p>
                                                        <p className="text-sm">{comment.text}</p>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {new Date(comment.createdAt).toLocaleDateString('es-ES')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default ReviewSection;

export function ReviewSection({ course }: ReviewSectionProps) {
    const [reviews, setReviews] = useState<Review[]>(course.reviews);
    const pathname = usePathname();
    const lang = (pathname?.split('/')[1] || 'en') as Locale;
    
    // Reload reviews when component mounts and periodically
    useEffect(() => {
        const loadReviews = async () => {
            try {
                const { getReviewsForCourse } = await import('@/lib/data');
                const updatedReviews = await getReviewsForCourse(course.id, true);
                setReviews(updatedReviews);
            } catch (error) {
                console.error('Error loading reviews:', error);
            }
        };
        
        loadReviews();
        
        // Set up interval to check for new approved reviews every 30 seconds
        const interval = setInterval(loadReviews, 30000);
        
        return () => clearInterval(interval);
    }, [course.id]);
    
    const avgRating = reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length)
        : 0;

    const ratingDistribution = [5, 4, 3, 2, 1].map(star => {
        const count = reviews.filter(r => r.rating === star).length;
        return { star, count, percentage: reviews.length > 0 ? (count / reviews.length) * 100 : 0 };
    });

    const handleReviewSubmitted = (newReview: Review) => {
        // We don't add it to the list immediately, because it needs moderation.
        // Instead, we could show a thank you message.
    }

    return (
        <div>
            <h2 className="font-headline text-3xl font-semibold text-primary mb-8">Reviews & Ratings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="flex flex-col items-center justify-center space-y-2 bg-card p-6 rounded-lg">
                    <p className="text-5xl font-bold text-accent">{avgRating.toFixed(1)}</p>
                    <StarRating rating={avgRating} />
                    <p className="text-sm text-muted-foreground">{reviews.length} reviews</p>
                </div>
                <div className="md:col-span-2 space-y-2 bg-card p-6 rounded-lg">
                    {ratingDistribution.map(item => (
                        <div key={item.star} className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-12">{item.star} star</span>
                            <Progress value={item.percentage} className="w-full h-2" />
                            <span className="text-sm text-muted-foreground w-8 text-right">{item.count}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {reviews.length > 0 ? reviews.slice(0, 3).map(review => (
                        <ReviewCard key={review.id} review={review} lang={lang} />
                    )) : (
                        <p className="text-muted-foreground text-center py-8">Be the first to review this course!</p>
                    )}
                </div>
                <div className="sticky top-24">
                   <AddReviewForm courseId={course.id} onReviewSubmitted={handleReviewSubmitted} />
                </div>
            </div>
        </div>
    );
}

interface AddReviewFormProps {
    courseId: string;
    onReviewSubmitted: (review: Review) => void;
}

function AddReviewForm({ courseId, onReviewSubmitted }: AddReviewFormProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [mediaFiles, setMediaFiles] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const uploadMediaFiles = async (files: any[]) => {
        const uploadedMedia: any[] = [];
        
        for (const mediaFile of files) {
            try {
                const url = await uploadReviewImage(courseId, user!.uid, mediaFile.file);
                uploadedMedia.push({
                    id: mediaFile.id,
                    type: mediaFile.type,
                    url,
                    filename: mediaFile.file.name,
                    size: mediaFile.size,
                    uploadedAt: new Date().toISOString()
                });
            } catch (error) {
                console.error(`Failed to upload ${mediaFile.file.name}:`, error);
                throw new Error(`Failed to upload ${mediaFile.file.name}`);
            }
        }
        
        return uploadedMedia;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ title: "Please log in to leave a review.", variant: "destructive" });
            return;
        }
        if (rating === 0 || reviewText.trim() === "") {
             toast({ title: "Please provide a rating and a review.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            // Handle legacy single image upload for backward compatibility
            let imageUrl: string | undefined = undefined;
            if (imageFile) {
                imageUrl = await uploadReviewImage(courseId, user.uid, imageFile);
            }

            // Handle new media upload system
            let uploadedMedia: any[] = [];
            if (mediaFiles.length > 0) {
                uploadedMedia = await uploadMediaFiles(mediaFiles);
            }

            const reviewData: any = {
                userId: user.uid,
                userName: user.displayName || "Anonymous",
                userAvatar: user.photoURL,
                rating,
                text: reviewText,
                comment: reviewText, // For backward compatibility
            };

            // Only add imageUrl if it exists (avoid undefined values)
            if (imageUrl) {
                reviewData.imageUrl = imageUrl;
            }

            // Only add media if it exists (avoid undefined values)
            if (uploadedMedia.length > 0) {
                reviewData.media = uploadedMedia;
            }

            await addReview(courseId, reviewData);

            toast({
                title: "Review Submitted!",
                description: "Thank you! Your review is pending moderation."
            });
            setRating(0);
            setReviewText("");
            setImageFile(null);
            setMediaFiles([]);
            // Maybe refresh the page or show a thank you message instead of the form
        } catch (error) {
            console.error("Failed to submit review:", error);
            toast({ title: "Submission Failed", description: "Could not submit your review. Please try again.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl text-primary flex items-center gap-2"><MessageSquarePlus/> Write a Review</CardTitle>
                    <CardDescription>You must be logged in to leave a review.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/login')} className="w-full">Log In</Button>
                </CardContent>
             </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl text-primary flex items-center gap-2"><MessageSquarePlus/>Share Your Experience</CardTitle>
                <CardDescription>Share your experience with other golfers. Your review will be pending moderation before being published.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div>
                         <Label>Your Rating</Label>
                         <div className="flex items-center gap-1 mt-2">
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star 
                                    key={star}
                                    className={`h-8 w-8 cursor-pointer transition-colors ${ (hoverRating || rating) >= star ? 'text-primary fill-primary' : 'text-muted-foreground'}`}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                />
                            ))}
                         </div>
                    </div>
                    <div>
                        <Label htmlFor="review-text">Your Review</Label>
                        <Textarea id="review-text" placeholder="What did you think of the course?" value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
                    </div>
                     <div>
                        <Label>Add photos or videos (optional)</Label>
                        <MediaUpload 
                            onMediaChange={setMediaFiles}
                            maxFiles={5}
                            maxFileSize={10}
                            disabled={isSubmitting}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Submitting...</> : 'Submit Review'}
                    </Button>
                </CardContent>
            </form>
        </Card>
    );
}
