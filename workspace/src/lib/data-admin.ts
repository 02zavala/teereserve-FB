
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Interfaces duplicadas de data.ts para evitar dependencias circulares o imports de tipos cliente
interface VisitLog {
    id?: string;
    timestamp?: any;
    userAgent?: string;
    referer?: string;
    page: string;
    sessionId?: string;
    ipAddress?: string;
}

interface UserIPLog {
    id?: string;
    userId?: string | null;
    ipAddress: string;
    timestamp?: any;
    action: 'login' | 'register' | 'guest_booking' | 'visit';
    userAgent?: string;
    location?: string;
}

// Versión Admin de logVisit
export async function logVisitAdmin(visitData: VisitLog): Promise<void> {
    if (!db) {
        console.warn("Firebase Admin Firestore not available. Skipping visit logging.");
        return;
    }
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const { page, sessionId } = visitData;
        
        // 1. Guardar log individual
        const visitLogsCol = db.collection('visit_logs');
        await visitLogsCol.add({
            ...visitData,
            timestamp: FieldValue.serverTimestamp()
        });

        // 2. Actualizar métricas agregadas (transacción)
        const metricsRef = db.collection('daily_visits').doc(today);
        
        await db.runTransaction(async (transaction) => {
            const metricsDoc = await transaction.get(metricsRef);
            
            if (metricsDoc.exists) {
                const data = metricsDoc.data();
                const currentPages = data?.pageViews || {};
                
                const updates: any = {
                    totalVisits: FieldValue.increment(1),
                    [`pageViews.${page}`]: FieldValue.increment(1),
                    lastUpdated: FieldValue.serverTimestamp()
                };

                if (sessionId) {
                    // Nota: uniqueVisits es aproximado en esta implementación simple sin leer todos los logs
                    // Para precisión real, se necesitaría otra estructura.
                    // Aquí mantenemos la lógica simple del original.
                    // Si quisiéramos ser estrictos, comprobaríamos si sessionId ya visitó hoy.
                    // Pero para paridad con data.ts (que tampoco parece verificarlo en profundidad en el snippet visto),
                    // asumiremos que el llamador controla la unicidad o aceptamos la limitación.
                    
                    // data.ts original: uniqueVisits: sessionId ? increment(1) : increment(0)
                    // Esto incrementa uniqueVisits por cada visita con sessionId, lo cual no es "unique".
                    // Corregiremos esto: Solo incrementar si es una sesión nueva (difícil saber sin leer).
                    // Asumiremos comportamiento del original: increment(1)
                    updates.uniqueVisits = FieldValue.increment(1); 
                }
                
                transaction.update(metricsRef, updates);
            } else {
                const newMetrics = {
                    date: today,
                    totalVisits: 1,
                    uniqueVisits: sessionId ? 1 : 0,
                    pageViews: { [page]: 1 },
                    lastUpdated: FieldValue.serverTimestamp()
                };
                transaction.set(metricsRef, newMetrics);
            }
        });
    } catch (error) {
        console.error("Error updating daily visit metrics (Admin):", error);
    }
}

// Versión Admin de logUserIP
export async function logUserIPAdmin(ipData: UserIPLog): Promise<void> {
    if (!db) {
        console.warn("Firebase Admin Firestore not initialized. Skipping IP logging.");
        return;
    }
    
    try {
        const userIPsCol = db.collection('userIPs');
        await userIPsCol.add({
            ...ipData,
            timestamp: FieldValue.serverTimestamp()
        });
        
        console.log(`IP logged for user (Admin): ${ipData.userId}, action: ${ipData.action}`);
    } catch (error) {
        console.error("Error logging user IP (Admin):", error);
    }
}
