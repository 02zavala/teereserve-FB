
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
    browserSessionPersistence,
    sendPasswordResetEmail,
    sendEmailVerification
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
    login: (email: string, pass: string, remember?: boolean) => Promise<any>;
    signup: (email: string, pass: string, displayName: string, handicap?: number, extra?: { lastName?: string; dob?: string; phone?: string; acceptedTerms?: boolean }) => Promise<any>;
    logout: () => Promise<void>;
    googleSignIn: () => Promise<any>;
    resetPassword: (email: string) => Promise<void>;
    refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const createUserInFirestore = async (userCredential: User, handicap?: number, extra?: { lastName?: string; dob?: string; phone?: string; acceptedTerms?: boolean }) => {
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
        // Add extra profile fields if provided
        if (extra) {
            if (extra.lastName) userData.lastName = extra.lastName;
            if (extra.dob) userData.dob = extra.dob;
            if (extra.phone) userData.phone = extra.phone;
            if (typeof extra.acceptedTerms !== 'undefined') userData.acceptedTerms = !!extra.acceptedTerms;
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
                  const savedRemember = (typeof window !== 'undefined' && localStorage.getItem('TR_REMEMBER_ME')) === '1';
                  await setPersistence(auth, savedRemember ? browserLocalPersistence : browserSessionPersistence);
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

        // Manejar getRedirectResult con mejor manejo de errores
        const handleRedirectResult = async () => {
            try {
                // Verificar conectividad antes de intentar getRedirectResult
                if (!navigator.onLine) {
                    console.warn("Skipping redirect result check - offline mode");
                    return;
                }
                
                if (!auth) {
                    console.warn("Auth not available - skipping redirect result");
                    return;
                }
                
                const result = await getRedirectResult(auth);
                if (result) {
                    await createUserInFirestore(result.user);
                    // NUEVO: Registrar IP del usuario al hacer login con Google
                    await logUserIPAction(result.user.uid, 'login');
                }
            } catch (error: any) {
                // Manejar errores específicos de Google APIs
                if (error.code === 'auth/internal-error') {
                    console.warn("Google APIs not available - redirect result skipped");
                    return;
                }
                
                // Manejar errores de red
                if (error.message?.includes('Failed to fetch') || 
                    error.message?.includes('Network request failed')) {
                    console.warn("Network error during redirect result - skipped");
                    return;
                }
                
                // Solo mostrar errores que no sean de conectividad
                if (!error.message?.includes('apis.google.com') && 
                    !error.message?.includes('Network unavailable')) {
                    console.error("Error getting redirect result:", error);
                }
            }
        };
        
        // Ejecutar con un pequeño delay para permitir que la red se estabilice
        setTimeout(handleRedirectResult, 1000);

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
    
    // NUEVO: Función para registrar IP del usuario
    const logUserIPAction = async (userId: string, action: 'login' | 'register' | 'guest_booking') => {
        try {
            await fetch('/api/log-user-ip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    action
                }),
            });
        } catch (error) {
            console.error('Error logging user IP:', error);
            // No relanzar el error para no interrumpir el flujo de autenticación
        }
    };

    const login = async (email: string, pass: string, remember?: boolean) => {
      if (!auth) throw new Error("Authentication is not available.");
      const rememberFinal = !!remember;
      try {
        await setPersistence(auth, rememberFinal ? browserLocalPersistence : browserSessionPersistence);
      } catch (e) {
        console.warn('setPersistence error', e);
      }
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      
      // NUEVO: Registrar IP del usuario al hacer login
      if (userCredential.user) {
          await logUserIPAction(userCredential.user.uid, 'login');
          // Persistir preferencia de sesión y timestamp
          try {
            localStorage.setItem('TR_REMEMBER_ME', rememberFinal ? '1' : '0');
            localStorage.setItem('TR_SESSION_LOGIN_TS', String(Date.now()));
            const maxAge = 28 * 24 * 60 * 60; // 28 días (segundos)
            document.cookie = `tr_remember=${rememberFinal ? '1' : '0'}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
            document.cookie = `tr_login_ts=${Math.floor(Date.now()/1000)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
          } catch {}
      }
      
      return userCredential;
    };
    
    const signup = async (email: string, pass: string, displayName: string, handicap?: number, extra?: { lastName?: string; dob?: string; phone?: string; acceptedTerms?: boolean }) => {
        if (!auth) throw new Error("Authentication is not available.");
        console.log('Creating user with email and password...');
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        console.log('User created, updating profile...');
        await updateFirebaseAuthProfile(userCredential.user, { displayName });
        console.log('Profile updated, creating user in Firestore...');
        await createUserInFirestore(userCredential.user, handicap, extra);
        console.log('User created in Firestore, fetching profile...');
        await fetchUserProfile(userCredential.user);
        
        // Send email verification (conditionally disabled)
        const REQUIRE_EMAIL_VERIFICATION = process.env.NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION === 'true';
        if (REQUIRE_EMAIL_VERIFICATION) {
          try {
            const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
            let currentLang: 'es' | 'en' = 'es';
            if (typeof window !== 'undefined') {
              const seg = window.location.pathname.split('/')[1];
              if (seg === 'es' || seg === 'en') currentLang = seg as 'es' | 'en';
            }
            const actionCodeSettings = origin ? {
              url: `${origin}/${currentLang}/auth/action`,
              handleCodeInApp: true,
            } : undefined;
        
            // Prefer custom verification email via API route
            try {
              const idToken = await userCredential.user.getIdToken();
              const resp = await fetch('/api/auth/send-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: email,
                  lang: currentLang,
                  displayName,
                  idToken,
                  origin,
                }),
              });
              if (!resp.ok) throw new Error('Custom verification email failed');
              console.log('Custom verification email sent');
            } catch (customErr) {
              console.warn('Falling back to Firebase default verification email', customErr);
              await sendEmailVerification(userCredential.user, actionCodeSettings as any);
              console.log('Default verification email sent');
            }
          } catch (err) {
            console.warn('Failed to send verification email', err);
          }
        } else {
          console.log('Email verification disabled by config (NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION=false)');
        }
        
        // NUEVO: Registrar IP del usuario al registrarse
        await logUserIPAction(userCredential.user.uid, 'register');
        
        console.log('Profile fetched successfully');
        return userCredential;
    };
    
    const logout = async () => {
        if (!auth) return;
        try {
            setUser(null);
            setUserProfile(null);
            await signOut(auth);
            
            // Borrar banderas locales/cookies
            try {
              localStorage.removeItem('TR_REMEMBER_ME');
              localStorage.removeItem('TR_SESSION_LOGIN_TS');
              document.cookie = `tr_remember=; Max-Age=0; Path=/; SameSite=Lax`;
              document.cookie = `tr_login_ts=; Max-Age=0; Path=/; SameSite=Lax`;
            } catch {}
            
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

    // NUEVO: Guardia de sesión (idle 30 min y tope 28 días en modo recordar)
    useEffect(() => {
      if (!user) return;
      const isRemember = (typeof window !== 'undefined' && localStorage.getItem('TR_REMEMBER_ME')) === '1';
      const THIRTY_MIN = 30 * 60 * 1000;
      const TWENTY_EIGHT_DAYS = 28 * 24 * 60 * 60 * 1000;
  
      let lastActivity = Date.now();
      let intervalId: any;
  
      const updateActivity = () => { lastActivity = Date.now(); };
  
      const getLoginTsMs = () => {
        try {
          const ls = localStorage.getItem('TR_SESSION_LOGIN_TS');
          if (ls) return parseInt(ls, 10);
          const cookieTs = document.cookie.split('; ').find(c => c.startsWith('tr_login_ts='));
          if (cookieTs) {
            const v = cookieTs.split('=')[1];
            return parseInt(v, 10) * 1000;
          }
        } catch {}
        return Date.now();
      };
  
      const startCheck = () => {
        intervalId = setInterval(() => {
          const now = Date.now();
          if (!isRemember && now - lastActivity > THIRTY_MIN) {
            console.warn('Auto-logout por inactividad (30 min)');
            logout();
          }
          if (isRemember) {
            const loginTsMs = getLoginTsMs();
            if (Date.now() - loginTsMs > TWENTY_EIGHT_DAYS) {
              console.warn('Auto-logout por tope de 28 días');
              logout();
            }
          }
        }, 60 * 1000);
      };
  
      // listeners sólo si NO recuerda
      if (!isRemember) {
        ['mousemove','keydown','click','touchstart','scroll'].forEach(evt => {
          window.addEventListener(evt, updateActivity, { passive: true });
        });
      }
  
      startCheck();
  
      return () => {
        if (!isRemember) {
          ['mousemove','keydown','click','touchstart','scroll'].forEach(evt => {
            window.removeEventListener(evt, updateActivity);
          });
        }
        if (intervalId) clearInterval(intervalId);
      };
    }, [user]);

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
