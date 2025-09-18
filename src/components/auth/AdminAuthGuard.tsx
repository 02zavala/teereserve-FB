
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const lang = pathname?.split('/')[1] || 'en';

    useEffect(() => {
        // This effect runs whenever the auth state changes.
        // We only want to act once the loading is complete.
        if (loading) {
            return; // Still loading, do nothing yet.
        }

        // After loading, if there's no user, redirect to login.
        if (!user) {
            router.push(`/${lang}/login?redirect=${pathname}`);
            return;
        }

        // If a user exists but we are waiting for their profile to load, we also wait.
        if (!userProfile) {
            return;
        }
        
        // If the profile is loaded and the user is not an admin, redirect them away.
        if (userProfile.role !== 'Admin' && userProfile.role !== 'SuperAdmin') {
            router.push(`/${lang}`);
        }
        
    }, [user, userProfile, loading, router, lang, pathname]);

    // Show a loading spinner during the initial auth check.
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen w-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Verifying access...</p>
            </div>
        );
    }
    
    // If a user is logged in, but their profile is not yet available, show a spinner.
    if(user && !userProfile) {
         return (
            <div className="flex items-center justify-center h-screen w-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading user profile...</p>
            </div>
        );
    }

    // If the user is authenticated and has a valid admin role, render the children.
    if (user && userProfile && (userProfile.role === 'Admin' || userProfile.role === 'SuperAdmin')) {
        return <>{children}</>;
    }

    // This is a fallback for when a non-admin user is being redirected.
    // It prevents flashing the admin content before the redirect happens.
    return (
        <div className="flex items-center justify-center h-screen w-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Redirecting...</p>
        </div>
    );
}
