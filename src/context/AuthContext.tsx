
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
    onAuthStateChanged, 
    User, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile as updateFirebaseAuthProfile,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    setPersistence,
    browserLocalPersistence,
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { UserProfile, Locale } from '@/types';
import { useStableNavigation } from '@/hooks/useStableNavigation';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<any>;
    signup: (email: string, pass: string, displayName: string, handicap?: number) => Promise<any>;
    logout: () => Promise<void>;
    googleSignIn: () => Promise<any>;
    resetPassword: (email: string) => Promise<void>;
    refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const createUserInFirestore = async (userCredential: User, handicap?: number) => {
    if (!db) return; // Do nothing if db is not initialized
    const user = userCredential;
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        const role: UserProfile['role'] = user.email === 'oscargomez@teereserve.golf' ? 'SuperAdmin' : 'Customer';
        const userData: any = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: role,
            createdAt: new Date().toISOString(),
            xp: 0,
            achievements: [],
        };
        
        // Only add handicap if it's not undefined
        if (handicap !== undefined) {
            userData.handicap = handicap;
        }
        
        await setDoc(userDocRef, userData);
    }
}


export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true); // Only for initial auth state check
    const router = useRouter();
    const pathname = usePathname();
    const lang = (pathname?.split('/')[1] || 'en') as Locale;
    const { go } = useStableNavigation();
    
    useEffect(() => {
        if (!auth) {
            console.warn("Firebase auth is not available. Setting loading to false.");
            setLoading(false);
            return;
        }

        const enablePersistence = async () => {
            try {
                if (auth) {
                  await setPersistence(auth, browserLocalPersistence);
                }
            } catch (error: any) {
                if (error.code !== 'failed-precondition') {
                    console.error("Firebase persistence error:", error);
                }
            }
        };
        enablePersistence();

        // Set a timeout to ensure loading state is resolved even if Firebase fails
        const loadingTimeout = setTimeout(() => {
            console.warn("Auth state check timed out. Setting loading to false.");
            setLoading(false);
        }, 5000); // 5 second timeout

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            clearTimeout(loadingTimeout); // Clear timeout since auth state changed
            setUser(user);
            if (user) {
                try {
                    await fetchUserProfile(user);
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    // Continue anyway, don't block the UI
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        getRedirectResult(auth)
            .then(async (result) => {
                if (result) {
                    await createUserInFirestore(result.user);
                }
            })
            .catch((error) => {
                console.error("Error getting redirect result:", error);
            });

        return () => {
            clearTimeout(loadingTimeout);
            unsubscribe();
        };
    }, []);

    const fetchUserProfile = useCallback(async (firebaseUser: User) => {
        if (!db) {
            console.warn("Firestore is not available. Creating local user profile.");
            // Create a local profile when Firestore is not available
            const localProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: firebaseUser.email === 'oscargomez@teereserve.golf' ? 'SuperAdmin' : 'Customer',
                createdAt: new Date().toISOString(),
                xp: 0,
                achievements: [],
            };
            setUserProfile(localProfile);
            return;
        }
        
        try {
            if (!db) return;
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                setUserProfile(docSnap.data() as UserProfile);
            } else {
                const profile: any = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    role: firebaseUser.email === 'oscargomez@teereserve.golf' ? 'SuperAdmin' : 'Customer',
                    createdAt: new Date().toISOString(),
                    xp: 0,
                    achievements: [],
                };
                await setDoc(userDocRef, profile);
                setUserProfile(profile);
            }
        } catch (error) {
            console.error("Error fetching user profile from Firestore:", error);
            // Create a fallback local profile
            const fallbackProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: firebaseUser.email === 'oscargomez@teereserve.golf' ? 'SuperAdmin' : 'Customer',
                createdAt: new Date().toISOString(),
                xp: 0,
                achievements: [],
            };
            setUserProfile(fallbackProfile);
        }
    }, []);

     const refreshUserProfile = useCallback(async () => {
        if (user) {
            await fetchUserProfile(user);
        }
    }, [user, fetchUserProfile]);
    
    const login = async (email: string, pass: string) => {
      if (!auth) throw new Error("Authentication is not available.");
      return await signInWithEmailAndPassword(auth, email, pass);
    };

    const signup = async (email: string, pass: string, displayName: string, handicap?: number) => {
        if (!auth) throw new Error("Authentication is not available.");
        console.log('Creating user with email and password...');
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        console.log('User created, updating profile...');
        await updateFirebaseAuthProfile(userCredential.user, { displayName });
        console.log('Profile updated, creating user in Firestore...');
        await createUserInFirestore(userCredential.user, handicap);
        console.log('User created in Firestore, fetching profile...');
        await fetchUserProfile(userCredential.user);
        console.log('Profile fetched successfully');
        return userCredential;
    };
    
    const logout = async () => {
        if (!auth) return;
        try {
            setUser(null);
            setUserProfile(null);
            await signOut(auth);
            
            // Redirect to home page with proper language using stable navigation
            go('/');
        } catch (error) {
            console.error('Error during logout:', error);
            // Even if there's an error, try to redirect
            go('/');
        }
    };

    const googleSignIn = async () => {
        if (!auth) throw new Error("Authentication is not available.");
        const provider = new GoogleAuthProvider();
        return signInWithRedirect(auth, provider);
    };

    const resetPassword = async (email: string) => {
        if (!auth) throw new Error("Authentication is not available.");
        return await sendPasswordResetEmail(auth, email);
    };

    const value = {
        user,
        userProfile,
        loading,
        login,
        signup,
        logout,
        googleSignIn,
        resetPassword,
        refreshUserProfile
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
