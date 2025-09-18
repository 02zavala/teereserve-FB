"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Star, ArrowLeft } from 'lucide-react';
import { Locale } from '@/i18n-config';
import Link from 'next/link';
import { format } from 'date-fns';
import { dateLocales } from '@/lib/date-utils';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  courseId: string;
  courseName: string;
  rating: number;
  title: string;
  content: string;
  images?: string[];
  likes: number;
  isLiked: boolean;
  createdAt: string;
  comments: Comment[];
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

interface ReviewDetailClientProps {
  reviewId: string;
  dict: any;
  lang: Locale;
}

export default function ReviewDetailClient({ reviewId, dict, lang }: ReviewDetailClientProps) {
  const { user } = useAuth();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    // Simulate fetching review data
    const fetchReview = async () => {
      setLoading(true);
      try {
        // Mock data - replace with actual API call
        const mockReview: Review = {
          id: reviewId,
          userId: 'user1',
          userName: 'Carlos Mendoza',
          userAvatar: '',
          courseId: 'course1',
          courseName: 'Cabo del Sol Golf Club',
          rating: 5,
          title: lang === 'es' ? 'Experiencia increíble en Los Cabos' : 'Amazing Experience in Los Cabos',
          content: lang === 'es' ? 'El campo de golf es simplemente espectacular. Las vistas al océano son impresionantes y el mantenimiento del campo es de primera clase. El personal fue muy amable y profesional. Definitivamente regresaré.' : 'The golf course is simply spectacular. The ocean views are breathtaking and the course maintenance is first class. The staff was very friendly and professional. I will definitely return.',
          images: [],
          likes: 12,
          isLiked: false,
          createdAt: new Date().toISOString(),
          comments: [
            {
              id: 'comment1',
              userId: 'user2',
              userName: 'María González',
              content: lang === 'es' ? '¡Totalmente de acuerdo! Ese campo es increíble.' : 'Totally agree! That course is incredible.',
              createdAt: new Date().toISOString()
            }
          ]
        };
        setReview(mockReview);
      } catch (error) {
        console.error('Error fetching review:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [reviewId]);

  const handleLike = async () => {
    if (!user || !review || isLiking) return;
    
    setIsLiking(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setReview(prev => prev ? {
        ...prev,
        likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
        isLiked: !prev.isLiked
      } : null);
    } catch (error) {
      console.error('Error liking review:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim() || isSubmittingComment) return;
    
    setIsSubmittingComment(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      const newCommentObj: Comment = {
        id: `comment_${Date.now()}`,
        userId: user.uid,
        userName: user.displayName || 'Usuario',
        content: newComment,
        createdAt: new Date().toISOString()
      };
      
      setReview(prev => prev ? {
        ...prev,
        comments: [...prev.comments, newCommentObj]
      } : null);
      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-600">Reseña no encontrada</h1>
        <Link href={`/${lang}/reviews`} className="text-primary hover:underline mt-4 inline-block">
          Volver a reseñas
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back button */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href={`/${lang}/reviews`} className="inline-flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a reseñas
        </Link>
      </Button>

      {/* Review Card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={review.userAvatar} />
                <AvatarFallback>{review.userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{review.userName}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(review.createdAt), 'PPP', { locale: dateLocales[lang] })}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          <CardTitle className="text-xl">{review.title}</CardTitle>
          <Badge variant="secondary">{review.courseName}</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-6 leading-relaxed">{review.content}</p>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={!user || isLiking}
              className={review.isLiked ? 'text-red-500' : ''}
            >
              <Heart className={`w-4 h-4 mr-2 ${review.isLiked ? 'fill-current' : ''}`} />
              {review.likes}
            </Button>
            <Button variant="ghost" size="sm">
              <MessageCircle className="w-4 h-4 mr-2" />
              {review.comments.length}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Comentarios ({review.comments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add comment form */}
          {user && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <Textarea
                placeholder={lang === 'es' ? 'Escribe un comentario...' : 'Write a comment...'}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="mb-3"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmittingComment}
                size="sm"
              >
                {isSubmittingComment ? 'Enviando...' : 'Comentar'}
              </Button>
            </div>
          )}

          {/* Comments list */}
          <div className="space-y-4">
            {review.comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3 p-3 border rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.userAvatar} />
                  <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">{comment.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.createdAt), 'PPp', { locale: dateLocales[lang] })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>

          {review.comments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No hay comentarios aún. ¡Sé el primero en comentar!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}