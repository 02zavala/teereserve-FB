
"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamMemberManager } from "@/components/admin/TeamMemberManager";
import { getTeamMembers, getAboutPageContent, getHeroImagesContent } from "@/lib/data";
import { AboutPageContentManager } from "@/components/admin/AboutPageContentManager";
import { HeroImageManager } from "@/components/admin/HeroImageManager";
import { ContentManager } from '@/components/admin/ContentManager'
import { EventVisualEditor } from '@/components/admin/EventVisualEditor'
import { Skeleton } from "@/components/ui/skeleton";
import type { TeamMember, AboutPageContent } from "@/types";

interface HeroImage {
    id: string;
    url: string;
    name: string;
}

export default function SiteContentPage() {
    const [initialTeamMembers, setInitialTeamMembers] = useState<TeamMember[]>([]);
    const [initialAboutContent, setInitialAboutContent] = useState<AboutPageContent | null>(null);
    const [initialHeroImages, setInitialHeroImages] = useState<HeroImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [teamMembers, aboutContent, heroImagesContent] = await Promise.all([
                    getTeamMembers(),
                    getAboutPageContent(),
                    getHeroImagesContent()
                ]);

                setInitialTeamMembers(teamMembers);
                setInitialAboutContent(aboutContent);
                
                // Convert hero images content to the format expected by HeroImageManager
                const heroImages = [
                    { id: '1', url: heroImagesContent.image1Url, name: 'Hero Image 1' },
                    { id: '2', url: heroImagesContent.image2Url, name: 'Hero Image 2' },
                    { id: '3', url: heroImagesContent.image3Url, name: 'Hero Image 3' },
                    { id: '4', url: heroImagesContent.image4Url, name: 'Hero Image 4' },
                ];
                setInitialHeroImages(heroImages);
            } catch (error) {
                console.error('Error loading content data:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, []);

    const handleContentUpdate = () => {
        // Refresh data when content is updated
        window.location.reload();
    };

    if (isLoading || !initialAboutContent) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline text-primary mb-2">Gestión de Contenido</h1>
                    <p className="text-muted-foreground">Administra el contenido de tu sitio web, imágenes e información del equipo.</p>
                </div>
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline text-primary mb-2">Gestión de Contenido</h1>
                <p className="text-muted-foreground">Administra el contenido de tu sitio web, imágenes e información del equipo.</p>
            </div>

            <Tabs defaultValue="cms" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="cms">CMS Dinámico</TabsTrigger>
                    <TabsTrigger value="hero">Imágenes Hero</TabsTrigger>
                    <TabsTrigger value="about">Información "Sobre Nosotros"</TabsTrigger>
                    <TabsTrigger value="team">Miembros del Equipo</TabsTrigger>
                    <TabsTrigger value="events">Editor de Eventos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="cms" className="space-y-6">
                    <ContentManager onSectionUpdate={handleContentUpdate} />
                </TabsContent>
                
                <TabsContent value="hero" className="space-y-6">
                    <HeroImageManager initialImages={initialHeroImages} />
                </TabsContent>
                
                <TabsContent value="about" className="space-y-6">
                    <AboutPageContentManager initialContent={initialAboutContent} />
                </TabsContent>
                
                <TabsContent value="team" className="space-y-6">
                    <TeamMemberManager initialTeamMembers={initialTeamMembers} />
                </TabsContent>
                
                <TabsContent value="events" className="space-y-6">
                    <EventVisualEditor />
                </TabsContent>
            </Tabs>
        </div>
    );
}
