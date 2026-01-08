'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2, Heart, MessageSquare } from 'lucide-react';
import type { Locale } from '@/i18n-config';
import type { Post, ReviewComment } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { getGlobalPosts, checkUserLikedPost, likePost, getPostComments, addPostComment } from '@/lib/data';
import NewPost from '@/components/social/NewPost';
import { Textarea } from '@/components/ui/textarea';
import { SecurityUtils } from '@/lib/security';

interface FeedTimelineProps {
  lang: Locale;
  className?: string;
  showComposer?: boolean;
}

export default function FeedTimeline({ lang, className, showComposer = true }: FeedTimelineProps) {
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, ReviewComment[]>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getGlobalPosts(50);
      setPosts(data);
      const counts: Record<string, number> = {};
      data.forEach(p => {
        counts[p.id] = (p as any).likesCount ?? (Array.isArray(p.likes) ? p.likes.length : 0);
      });
      setLikeCounts(counts);
    } catch (e) {
      console.error('Error cargando posts globales:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (!user || posts.length === 0) return;
    let cancelled = false;
    const preloadLikes = async () => {
      try {
        const entries = await Promise.all(posts.map(async (p) => {
          const liked = await checkUserLikedPost(p.userId, p.id, user.uid);
          return [p.id, liked] as const;
        }));
        if (!cancelled) setLikedMap(Object.fromEntries(entries));
      } catch (e) {
        console.warn('No se pudieron pre-cargar likes de usuario:', e);
      }
    };
    preloadLikes();
    return () => { cancelled = true; };
  }, [user, posts]);

  const handleLikeToggle = async (post: Post) => {
    if (!user) return;
    try {
      await likePost(post.userId, post.id, user.uid, user.displayName || user.email || 'Usuario');
      setLikedMap(prev => ({ ...prev, [post.id]: !prev[post.id] }));
      setLikeCounts(prev => ({ ...prev, [post.id]: (prev[post.id] ?? 0) + (likedMap[post.id] ? -1 : 1) }));
    } catch (e) {
      console.error('Error al alternar like en post:', e);
    }
  };

  const toggleComments = async (post: Post) => {
    const isOpen = commentsOpen[post.id];
    const nextState = !isOpen;
    setCommentsOpen(prev => ({ ...prev, [post.id]: nextState }));
    if (nextState && !commentsMap[post.id]) {
      setLoadingComments(prev => ({ ...prev, [post.id]: true }));
      try {
        const comments = await getPostComments(post.userId, post.id);
        setCommentsMap(prev => ({ ...prev, [post.id]: comments }));
      } catch (e) {
        console.error('Error cargando comentarios del post:', e);
      } finally {
        setLoadingComments(prev => ({ ...prev, [post.id]: false }));
      }
    }
  };

  const submitComment = async (post: Post) => {
    if (!user) return;
    const raw = newCommentText[post.id] || '';
    const text = SecurityUtils.sanitizeText(raw).trim();
    if (!text) return;
    try {
      setLoadingComments(prev => ({ ...prev, [post.id]: true }));
      const newId = await addPostComment(post.userId, post.id, user.uid, user.displayName || user.email || 'Usuario', user.photoURL || null, text);
      const newComment: ReviewComment = {
        id: String(newId),
        userId: user.uid,
        userName: user.displayName || user.email || 'Usuario',
        userAvatar: user.photoURL || null,
        text,
        createdAt: new Date().toISOString(),
      };
      setCommentsMap(prev => ({
        ...prev,
        [post.id]: [newComment, ...(prev[post.id] || [])]
      }));
      setNewCommentText(prev => ({ ...prev, [post.id]: '' }));
    } catch (e) {
      console.error('Error agregando comentario:', e);
    } finally {
      setLoadingComments(prev => ({ ...prev, [post.id]: false }));
    }
  };

  const FeedList = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Cargando publicaciones…</span>
        </div>
      );
    }

    if (posts.length === 0) {
      return (
        <div className="py-6 text-center text-muted-foreground">
          No hay publicaciones todavía.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="shadow-sm">
            <CardHeader className="flex flex-row items-center space-y-0 space-x-3">
              <Link href={`/${lang}/user/${post.userId}`} className="flex items-center">
                <div className="relative h-10 w-10 rounded-full overflow-hidden ring-1 ring-border hover:ring-primary/40 transition">
                  {post.userAvatar ? (
                    <Image src={post.userAvatar} alt={post.userName} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                </div>
                <span className="ml-3 font-medium hover:underline">{post.userName}</span>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm whitespace-pre-wrap">{post.text}</p>
              {Array.isArray(post.media) && post.media.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {post.media.map((m, idx) => (
                    <div key={idx} className="relative w-full aspect-video rounded-md overflow-hidden">
                      <Image src={m.url} alt={m.type || 'media'} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Button variant={likedMap[post.id] ? 'default' : 'outline'} size="sm" onClick={() => handleLikeToggle(post)}>
                    <Heart className={`h-4 w-4 mr-1 ${likedMap[post.id] ? 'fill-current' : ''}`} />
                    {likedMap[post.id] ? 'Te gusta' : 'Me gusta'}
                  </Button>
                  <Button variant={commentsOpen[post.id] ? 'default' : 'outline'} size="sm" onClick={() => toggleComments(post)}>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Comentarios
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-3">
                  <span>{likeCounts[post.id] ?? 0} Me gusta</span>
                  <span>{(commentsMap[post.id]?.length ?? post.comments?.length ?? 0)} comentarios</span>
                </div>
              </div>

              {commentsOpen[post.id] && (
                <div className="mt-3 space-y-3">
                  {loadingComments[post.id] ? (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando comentarios…
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(commentsMap[post.id] || []).map((c) => (
                        <div key={c.id} className="flex items-start gap-2">
                          <div className="relative h-8 w-8 rounded-full overflow-hidden ring-1 ring-border">
                            {c.userAvatar ? (
                              <Image src={c.userAvatar} alt={c.userName} fill className="object-cover" />
                            ) : (
                              <div className="h-full w-full bg-muted" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-medium">{c.userName}</div>
                            <div className="text-sm">{c.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Textarea
                      placeholder="Escribe un comentario…"
                      value={newCommentText[post.id] || ''}
                      onChange={(e) => setNewCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                      rows={2}
                    />
                    <div>
                      <Button size="sm" onClick={() => submitComment(post)} disabled={loadingComments[post.id]}>Comentar</Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }, [posts, loading, likedMap, likeCounts, lang, commentsOpen, commentsMap, newCommentText, loadingComments]);

  return (
    <div className={className}>
      {showComposer && user && (
        <NewPost onPosted={() => loadPosts()} />
      )}
      {FeedList}
    </div>
  );
}
