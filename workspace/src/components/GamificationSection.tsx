
"use client";

import type { UserProfile, AchievementId } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Award, Sunrise, Map, MessageSquare, CalendarDays, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface GamificationSectionProps {
    userProfile: UserProfile;
}

const levels = [
    { name: "Bronze", minXp: 0, color: "text-amber-600" },
    { name: "Silver", minXp: 1000, color: "text-slate-400" },
    { name: "Gold", minXp: 5000, color: "text-primary" },
    { name: "Platinum", minXp: 15000, color: "text-cyan-400" },
];

const allAchievements: Record<AchievementId, { icon: React.ElementType, title: string, description: string }> = {
    firstBooking: {
        icon: Award,
        title: "Novato del Green",
        description: "Completa tu primera reserva."
    },
    earlyBird: {
        icon: Sunrise,
        title: "Madrugador",
        description: "Reserva y juega una ronda antes de las 8 AM."
    },
    courseExplorer: {
        icon: Map,
        title: "Explorador de Campos",
        description: "Juega en 5 campos diferentes."
    },
    trustedReviewer: {
        icon: MessageSquare,
        title: "Crítico Confiable",
        description: "Escribe 5 reseñas aprobadas."
    },
    weekendWarrior: {
        icon: CalendarDays,
        title: "Guerrero de Fin de Semana",
        description: "Juega 3 fines de semana seguidos."
    }
};

export function GamificationSection({ userProfile }: GamificationSectionProps) {
    const { xp, achievements } = userProfile;

    const currentLevel = [...levels].reverse().find(level => xp >= level.minXp) || levels[0];
    const nextLevel = levels.find(level => xp < level.minXp);
    
    const progressToNextLevel = nextLevel 
        ? ((xp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100
        : 100;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-3xl text-primary">Your Progress</CardTitle>
                <CardDescription>Earn points and unlock achievements by playing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Level and Progress */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <span className={`text-xl font-bold ${currentLevel.color}`}>{currentLevel.name} Level</span>
                            <span className="text-sm font-semibold text-muted-foreground">({xp} XP)</span>
                        </div>
                        {nextLevel && (
                            <span className="text-sm text-muted-foreground">Next Level: {nextLevel.name} ({nextLevel.minXp} XP)</span>
                        )}
                    </div>
                    <Progress value={progressToNextLevel} className="h-3" />
                </div>
                
                {/* Achievements */}
                <div>
                    <h3 className="text-lg font-bold mb-4">Achievements</h3>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                        {Object.entries(allAchievements).map(([id, achievement]) => {
                            const isUnlocked = achievements.includes(id as AchievementId);
                            const Icon = achievement.icon;
                            return (
                                <TooltipProvider key={id}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className={cn(
                                                "flex flex-col items-center justify-center p-4 border rounded-lg aspect-square transition-all",
                                                isUnlocked ? "bg-primary/10 border-primary/20" : "bg-muted/50"
                                            )}>
                                                <div className={cn(
                                                    "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                                                    isUnlocked ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
                                                )}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                <p className={cn(
                                                    "text-xs font-semibold text-center",
                                                    isUnlocked ? "text-primary" : "text-muted-foreground"
                                                )}>
                                                    {achievement.title}
                                                </p>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="font-bold">{achievement.title}</p>
                                            <p>{achievement.description}</p>
                                            {!isUnlocked && <p className="text-xs text-muted-foreground italic mt-1">Locked</p>}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default GamificationSection;
