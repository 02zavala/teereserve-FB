'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Review, ReviewFilter, UserReviewStats, GolfCourse } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from '@/components/StarRating';
import { Heart, MessageCircle, Share2, Filter, Trophy, CheckCircle, Camera, Video, Plus, User } from 'lucide-react';
import { getUserReviewStats, getTopReviewers, getAllBadges, getFilteredReviews, getCourses } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Locale } from '@/i18n-config';

interface ReviewsPageClientProps {
  dict: any;
  lang: Locale;
}

export default function ReviewsPageClient({ dict, lang }: ReviewsPageClientProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [courses, setCourses] = useState<GolfCourse[]>([]);
  const [topReviewers, setTopReviewers] = useState<UserReviewStats[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>({
    sortBy: 'newest'
  });
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState<string | null>(null);
  const [showNewReviewDialog, setShowNewReviewDialog] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    text: '',
    courseId: '',
    experienceType: 'overall' as const
  });

  useEffect(() => {
    loadReviews();
    loadCourses();
    loadTopReviewers();
  }, [filter]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const reviewsData = await getFilteredReviews(filter);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setReviews([]);
      toast({ title: dict.common?.error || 'Error', description: dict.reviewsPage?.errors?.loadReviews || 'Could not load reviews', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const coursesData = await getCourses({});
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading courses:', error);
      setCourses([]);
    }
  };

  // Helper functions for badge progress
  const getProgressForBadge = (badge: any, userStats: any) => {
    if (!userStats) return 0;
    
    switch (badge.type) {
      case 'explorer':
        return userStats.coursesReviewed?.length || 0;
      case 'expert':
        return userStats.totalReviews || 0;
      case 'top_reviewer':
        return userStats.totalLikes || 0;
      case 'verified_player':
        // This would need to be calculated from user bookings
        return 0;
      default:
        return 0;
    }
  };

  const getProgressUnit = (badgeType: string) => {
    switch (badgeType) {
      case 'explorer':
        return 'campos';
      case 'expert':
        return 'reseñas';
      case 'top_reviewer':
        return 'likes';
      case 'verified_player':
        return 'reservas';
      default:
        return '';
    }
  };

  const loadTopReviewers = async () => {
    try {
      // Load top reviewers from Firebase
      const reviewers = await getTopReviewers(10);
      setTopReviewers(reviewers);
      
      // Load all badges
      const badges = getAllBadges();
      setAllBadges(badges);
      
      // Load current user stats if logged in
      if (user) {
        const stats = await getUserReviewStats(user.uid);
        setUserStats(stats);
      }
    } catch (error) {
      console.error('Error loading top reviewers:', error);
    }
  };

  const handleLike = async (reviewId: string) => {
    if (!user) {
      toast({ title: dict.common?.signIn || 'Sign In', description: dict.reviewsPage?.errors?.signInToLike || 'You must sign in to like', variant: 'destructive' });
      return;
    }

    try {
      // TODO: Implement like functionality
      // Update local state optimistically
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, likesCount: review.likesCount + 1 }
          : review
      ));
      toast({ title: dict.reviewsPage?.success?.likeAdded || 'Like added', description: dict.reviewsPage?.success?.likeRegistered || 'Your like has been registered' });
    } catch (error) {
      console.error('Error liking review:', error);
      toast({ title: dict.common?.error || 'Error', description: dict.reviewsPage?.errors?.addLike || 'Could not add like', variant: 'destructive' });
    }
  };

  const handleComment = async (reviewId: string) => {
    if (!user || !commentText.trim()) return;

    try {
      // TODO: Implement comment functionality
      const newComment = {
        id: Date.now().toString(),
        userId: user.uid,
        userName: user.displayName || 'Usuario',
        userAvatar: user.photoURL,
        text: commentText,
        createdAt: new Date().toISOString()
      };

      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { 
              ...review, 
              comments: [...review.comments, newComment],
              commentsCount: review.commentsCount + 1
            }
          : review
      ));

      setCommentText('');
      toast({ title: dict.reviewsPage?.success?.commentAdded || 'Comment added', description: dict.reviewsPage?.success?.commentPublished || 'Your comment has been published' });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({ title: dict.common?.error || 'Error', description: dict.reviewsPage?.errors?.addComment || 'Could not add comment', variant: 'destructive' });
    }
  };

  const handleShare = async (review: Review) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Reseña de ${review.courseName} - TeeReserve`,
          text: `${review.text.substring(0, 100)}...`,
          url: `${window.location.origin}/${lang}/reviews?review=${review.id}`
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(`${window.location.origin}/${lang}/reviews?review=${review.id}`);
        toast({ title: dict.reviewsPage?.success?.linkCopied || 'Link copied', description: dict.reviewsPage?.success?.linkCopiedToClipboard || 'The link has been copied to clipboard' });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({ title: dict.common?.error || 'Error', description: dict.reviewsPage?.errors?.shareReview || 'Could not share review', variant: 'destructive' });
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({ title: dict.common?.signIn || 'Sign In', description: dict.reviewsPage?.errors?.signInToReview || 'You must sign in to write a review', variant: 'destructive' });
      return;
    }

    if (!newReview.text.trim() || !newReview.courseId) {
      toast({ title: dict.reviewsPage?.errors?.requiredFields || 'Required fields', description: dict.reviewsPage?.errors?.completeAllFields || 'Please complete all fields', variant: 'destructive' });
      return;
    }

    try {
      // TODO: Implement review submission to Firebase
      const course = courses.find(c => c.id === newReview.courseId);
      const reviewToAdd: Review = {
        id: Date.now().toString(),
        userId: user.uid,
        userName: user.displayName || 'Usuario',
        userAvatar: user.photoURL,
        rating: newReview.rating,
        text: newReview.text,
        comment: newReview.text, // Alias for backward compatibility
        courseId: newReview.courseId,
        courseName: course?.name || '',
        user: { name: user.displayName || 'Usuario', avatarUrl: user.photoURL || undefined },
        createdAt: new Date().toISOString(),
        approved: null, // Pending approval
        status: 'pending' as const,
        verified: false,
        isVerifiedBooking: false, // TODO: Check if user has booking
        likes: [],
        comments: [],
        likesCount: 0,
        commentsCount: 0,
        experienceType: newReview.experienceType
      };

      setReviews(prev => [reviewToAdd, ...prev]);
      setShowNewReviewDialog(false);
      setNewReview({ rating: 5, text: '', courseId: '', experienceType: 'overall' });
      toast({ title: dict.reviewsPage?.success?.reviewSubmitted || 'Review submitted', description: dict.reviewsPage?.success?.reviewPendingApproval || 'Your review is pending approval' });
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({ title: dict.common?.error || 'Error', description: dict.reviewsPage?.errors?.submitReview || 'Could not submit review', variant: 'destructive' });
    }
  };

  const getExperienceTypeLabel = (type?: string) => {
    const labels = {
      service: 'Servicio',
      facilities: 'Instalaciones',
      green: 'Green',
      overall: 'General'
    };
    return labels[type as keyof typeof labels] || 'General';
  };

  const getExperienceTypeColor = (type?: string) => {
    const colors = {
      service: 'bg-blue-100 text-blue-800',
      facilities: 'bg-green-100 text-green-800',
      green: 'bg-emerald-100 text-emerald-800',
      overall: 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredReviews = (reviews || []).filter(review => {
    if (filter.courseId && review.courseId !== filter.courseId) return false;
    if (filter.experienceType && review.experienceType !== filter.experienceType) return false;
    if (filter.rating && review.rating < filter.rating) return false;
    if (filter.isVerifiedBooking !== undefined && review.isVerifiedBooking !== filter.isVerifiedBooking) return false;
    return true;
  }).sort((a, b) => {
    switch (filter.sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'highest_rated':
        return b.rating - a.rating;
      case 'most_liked':
        return b.likesCount - a.likesCount;
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Reseñas de Golfistas</h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
              Descubre las experiencias reales de nuestra comunidad de golfistas en Los Cabos
            </p>
            {user && (
              <Dialog open={showNewReviewDialog} onOpenChange={setShowNewReviewDialog}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
                    <Plus className="h-5 w-5 mr-2" />
                    Escribir Reseña
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{dict.reviewsPage?.writeNewReview || 'Write New Review'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">{dict.reviewsPage?.golfCourse || 'Golf Course'}</label>
                      <Select value={newReview.courseId} onValueChange={(value) => setNewReview({...newReview, courseId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder={dict.reviewsPage?.selectCourse || 'Select a course'} />
                        </SelectTrigger>
                        <SelectContent>
                          {courses && courses.map(course => (
                            <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">{dict.reviewsPage?.rating || 'Rating'}</label>
                      <StarRating 
                        rating={newReview.rating} 
                        onRatingChange={(rating) => setNewReview({...newReview, rating})} 
                        size="lg"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">{dict.reviewsPage?.experienceType || 'Experience Type'}</label>
                      <Select value={newReview.experienceType} onValueChange={(value) => setNewReview({...newReview, experienceType: value as any})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overall">{dict.reviewsPage?.experienceTypes?.overall || 'Overall'}</SelectItem>
                          <SelectItem value="service">{dict.reviewsPage?.experienceTypes?.service || 'Service'}</SelectItem>
                          <SelectItem value="facilities">{dict.reviewsPage?.experienceTypes?.facilities || 'Facilities'}</SelectItem>
                          <SelectItem value="green">{dict.reviewsPage?.experienceTypes?.green || 'Green'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">{dict.reviewsPage?.yourReview || 'Your Review'}</label>
                      <Textarea 
                        placeholder={dict.reviewsPage?.reviewPlaceholder || 'Share your experience at this golf course...'}
                        value={newReview.text}
                        onChange={(e) => setNewReview({...newReview, text: e.target.value})}
                        className="min-h-[120px]"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowNewReviewDialog(false)}>
                        {dict.common?.cancel || 'Cancel'}
                      </Button>
                      <Button onClick={handleSubmitReview}>
                        {dict.reviewsPage?.publishReview || 'Publish Review'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reviews">Todas las Reseñas ({filteredReviews.length})</TabsTrigger>
            <TabsTrigger value="feed">Feed Social</TabsTrigger>
            <TabsTrigger value="rankings">Rankings</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Select value={filter.courseId || 'all'} onValueChange={(value) => setFilter({...filter, courseId: value === 'all' ? undefined : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los campos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los campos</SelectItem>
                      {courses && courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filter.experienceType || 'all'} onValueChange={(value) => setFilter({...filter, experienceType: value === 'all' ? undefined : value as any})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de experiencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las experiencias</SelectItem>
                      <SelectItem value="service">Servicio</SelectItem>
                      <SelectItem value="facilities">Instalaciones</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="overall">General</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filter.rating?.toString() || 'all'} onValueChange={(value) => setFilter({...filter, rating: value === 'all' ? undefined : parseInt(value)})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Calificación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las calificaciones</SelectItem>
                      <SelectItem value="5">5 estrellas</SelectItem>
                      <SelectItem value="4">4+ estrellas</SelectItem>
                      <SelectItem value="3">3+ estrellas</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filter.isVerifiedBooking?.toString() || 'all'} onValueChange={(value) => setFilter({...filter, isVerifiedBooking: value === 'true' ? true : value === 'false' ? false : undefined})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Verificación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las reseñas</SelectItem>
                      <SelectItem value="true">Solo verificadas</SelectItem>
                      <SelectItem value="false">No verificadas</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filter.sortBy} onValueChange={(value) => setFilter({...filter, sortBy: value as any})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Más recientes</SelectItem>
                      <SelectItem value="oldest">Más antiguas</SelectItem>
                      <SelectItem value="highest_rated">Mejor calificadas</SelectItem>
                      <SelectItem value="most_liked">Más populares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Reviews List */}
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Cargando reseñas...</p>
                </div>
              ) : filteredReviews.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No se encontraron reseñas con los filtros seleccionados.</p>
                </div>
              ) : (
                filteredReviews.map((review) => (
                  <Card key={review.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={review.userAvatar || ''} alt={review.userName} />
                          <AvatarFallback>{review.userName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{review.userName}</h3>
                                {review.isVerifiedBooking && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Reserva Verificada
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {review.courseName} • {new Date(review.createdAt).toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StarRating rating={review.rating} readonly size="sm" />
                              <Badge className={getExperienceTypeColor(review.experienceType)}>
                                {getExperienceTypeLabel(review.experienceType)}
                              </Badge>
                            </div>
                          </div>

                          <p className="text-foreground leading-relaxed">{review.text}</p>

                          {review.imageUrl && (
                            <div className="relative rounded-lg overflow-hidden max-w-md">
                              <img 
                                src={review.imageUrl} 
                                alt="Foto de la reseña" 
                                className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setSelectedReview(review)}
                              />
                            </div>
                          )}

                          {review.videoUrl && (
                            <div className="relative rounded-lg overflow-hidden max-w-md">
                              <video 
                                src={review.videoUrl} 
                                controls 
                                className="w-full h-48 object-cover"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t">
                            <div className="flex items-center space-x-4">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleLike(review.id)}
                                className="flex items-center gap-1 hover:text-red-500 transition-colors"
                              >
                                <Heart className="h-4 w-4" />
                                {review.likesCount}
                              </Button>
                              
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setShowComments(showComments === review.id ? null : review.id)}
                                className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                              >
                                <MessageCircle className="h-4 w-4" />
                                {review.commentsCount}
                              </Button>
                              
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleShare(review)}
                                className="flex items-center gap-1 hover:text-green-500 transition-colors"
                              >
                                <Share2 className="h-4 w-4" />
                                Compartir
                              </Button>
                            </div>
                            
                            {review.approved === null && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                Pendiente de aprobación
                              </Badge>
                            )}
                          </div>

                          {/* Comments Section */}
                          {showComments === review.id && (
                            <div className="space-y-3 pt-3 border-t bg-muted/20 rounded-lg p-4">
                              {user && (
                                <div className="flex space-x-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                                    <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 space-y-2">
                                    <Textarea 
                                      placeholder="Escribe un comentario..."
                                      value={commentText}
                                      onChange={(e) => setCommentText(e.target.value)}
                                      className="min-h-[60px] bg-background"
                                    />
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleComment(review.id)}
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
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={comment.userAvatar || ''} alt={comment.userName} />
                                        <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
                                      </Avatar>
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
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="feed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Feed Social de TeeReserve</CardTitle>
                <p className="text-muted-foreground">Las últimas actividades de nuestra comunidad de golfistas</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Recent Activity Feed */}
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/30">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="https://i.pravatar.cc/100?u=carlos" alt="Carlos" />
                        <AvatarFallback>C</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">Carlos Mendoza</span> escribió una nueva reseña para 
                          <span className="font-medium text-primary"> Palmilla Golf Club</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Hace 2 horas</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/30">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="https://i.pravatar.cc/100?u=maria" alt="María" />
                        <AvatarFallback>M</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">María González</span> obtuvo el badge 
                          <span className="font-medium text-primary">🏌️ Explorador</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Hace 5 horas</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/30">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="https://i.pravatar.cc/100?u=david" alt="David" />
                        <AvatarFallback>D</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">David Chen</span> reservó un tee time en 
                          <span className="font-medium text-primary">Costa Palmas Golf Club</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Hace 1 día</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rankings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Top Reviewers del Mes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topReviewers && topReviewers.length > 0 ? (
                      topReviewers.map((reviewer, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
                          <div className="flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                            }`}>
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{`Top Reviewer #${index + 1}`}</span>
                              {reviewer.badges && reviewer.badges.map((badge: any) => (
                                <span key={badge.id} className="text-lg" title={badge.description}>{badge.icon}</span>
                              ))}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {reviewer.totalReviews} reseñas • {reviewer.totalLikes} likes • {reviewer.coursesReviewed?.length || 0} campos
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Cargando ranking de reviewers...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sistema de Badges</CardTitle>
                  <p className="text-sm text-muted-foreground">Desbloquea badges escribiendo reseñas y participando en la comunidad</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allBadges && allBadges.length > 0 ? (
                      allBadges.map((badge) => {
                        const isEarned = userStats?.badges?.some((userBadge: any) => userBadge.id === badge.id);
                        
                        return (
                          <div key={badge.id} className={`flex items-center space-x-3 p-3 rounded-lg ${
                            isEarned ? 'bg-green-50 border border-green-200' : 'bg-muted/50'
                          }`}>
                            <span className="text-2xl">{badge.icon}</span>
                            <div className="flex-1">
                              <p className="font-medium">{badge.name}</p>
                              <p className="text-sm text-muted-foreground">{badge.description}</p>
                            </div>
                            {isEarned && (
                              <Badge className="bg-green-600 text-white">Desbloqueado</Badge>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                          <span className="text-2xl">🏌️</span>
                          <div>
                            <p className="font-medium">Explorador</p>
                            <p className="text-sm text-muted-foreground">Reseña 3 campos diferentes</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                          <span className="text-2xl">⭐</span>
                          <div>
                            <p className="font-medium">Experto</p>
                            <p className="text-sm text-muted-foreground">Publica 10+ reseñas</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                          <span className="text-2xl">👑</span>
                          <div>
                            <p className="font-medium">Top Reviewer</p>
                            <p className="text-sm text-muted-foreground">Reseñas con 50+ likes totales</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                          <span className="text-2xl">✅</span>
                          <div>
                            <p className="font-medium">Jugador Verificado</p>
                            <p className="text-sm text-muted-foreground">Reservas verificadas via TeeReserve</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Image Modal */}
      {selectedReview && selectedReview.imageUrl && (
        <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Foto de {selectedReview.courseName}</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <img 
                src={selectedReview.imageUrl} 
                alt="Foto de la reseña" 
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}