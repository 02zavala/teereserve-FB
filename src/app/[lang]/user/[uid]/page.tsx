import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MyReviews } from '@/components/MyReviews';
import type { Locale } from '@/i18n-config';
import { getUserProfile, getUserPosts } from '@/lib/data';
import type { Post } from '@/types';
import { BackButton } from '@/components/ui/BackButton';

interface PageProps {
  params: { lang: Locale; uid: string };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { lang, uid } = params;

  const profile = await getUserProfile(uid);
  const posts: Post[] = await getUserPosts(uid);

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-4">
        <BackButton fallbackHref={`/${lang}/feed`} label="Volver" />
      </div>
      <Card className="mb-6">
        <CardContent className="p-6 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.photoURL || undefined} />
            <AvatarFallback>{profile?.displayName?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{profile?.displayName || 'Usuario'}</h1>
            <p className="text-muted-foreground text-sm">{profile?.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Publicaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-sm">Este usuario aún no tiene publicaciones.</p>
          ) : (
            posts.map(post => (
              <div key={post.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={post.userAvatar || undefined} />
                    <AvatarFallback>{post.userName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <span className="font-medium">{post.userName}</span>
                    <span className="text-muted-foreground ml-2">{new Date(post.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed">{post.text}</p>
                {post.media && post.media.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {post.media.map(m => (
                      <img key={m.id} src={m.url} alt={m.filename} className="rounded-md object-cover w-full h-40" />
                    ))}
                  </div>
                )}
                <Separator className="my-2" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reseñas</CardTitle>
        </CardHeader>
        <CardContent>
          <MyReviews userId={uid} lang={lang} />
        </CardContent>
      </Card>
    </div>
  );
}