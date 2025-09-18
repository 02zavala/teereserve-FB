
"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import type { getDictionary } from "@/lib/get-dictionary";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types";
import { Locale } from "@/i18n-config";

interface ProtectedDashboardLinkProps {
    dictionary: Awaited<ReturnType<typeof getDictionary>>['footer'];
    lang: Locale;
}

export function ProtectedDashboardLink({ dictionary, lang }: ProtectedDashboardLinkProps) {
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        if (user && db) {
            const userDocRef = doc(db, 'users', user.uid);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    setUserProfile(docSnap.data() as UserProfile);
                }
            })
        } else {
            setUserProfile(null);
        }
    }, [user]);

    const isAdmin = userProfile?.role === 'Admin' || userProfile?.role === 'SuperAdmin';

    if (!isAdmin) {
        return null;
    }

    return (
        <li>
            <Link 
                href={`/${lang}/admin/dashboard`} 
                className="text-muted-foreground hover:text-primary transition-colors flex items-center group"
            >
                <span className="w-1 h-1 bg-primary/50 rounded-full mr-3 group-hover:bg-primary transition-colors"></span>
                {dictionary.adminDashboard}
            </Link>
        </li>
    );
}
