// NUEVO: API endpoint para obtener métricas de visitas (solo admin)
import { NextRequest, NextResponse } from 'next/server';
import { getVisitMetrics, getTodayVisitStats, getUserIPs } from '@/lib/data';
import { verifyIdToken } from '@/lib/firebase-admin';

// Función para verificar si el usuario es admin
async function verifyAdminAccess(request: NextRequest): Promise<boolean> {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return false;
        }
        const token = authHeader.split('Bearer ')[1];
        const decoded = await verifyIdToken(token);
        return !!decoded.admin;
    } catch (error) {
        console.error('Error verifying admin access:', error);
        return false;
    }
}

export async function GET(request: NextRequest) {
    try {
        const isAdmin = await verifyAdminAccess(request);
        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 401 }
            );
        }
        
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '7');
        const includeIPs = searchParams.get('includeIPs') === 'true';
        
        // Obtener métricas de visitas
        const visitMetrics = await getVisitMetrics(days);
        const todayStats = await getTodayVisitStats();
        
        let userIPs = [] as any[];
        if (includeIPs) {
            userIPs = await getUserIPs(50); // Últimas 50 IPs
        }
        
        // Calcular estadísticas agregadas
        const totalVisitsAllTime = visitMetrics.reduce((sum, metric) => sum + metric.totalVisits, 0);
        const avgVisitsPerDay = visitMetrics.length > 0 ? totalVisitsAllTime / visitMetrics.length : 0;
        
        // Páginas más visitadas en el período
        const pageStats: { [page: string]: number } = {};
        visitMetrics.forEach(metric => {
            Object.entries(metric.pageViews || {}).forEach(([page, visits]) => {
                pageStats[page] = (pageStats[page] || 0) + (visits as number);
            });
        });
        
        const topPages = Object.entries(pageStats)
            .map(([page, visits]) => ({ page, visits }))
            .sort((a, b) => b.visits - a.visits)
            .slice(0, 10);
        
        return NextResponse.json({
            success: true,
            data: {
                todayStats,
                visitMetrics,
                aggregatedStats: {
                    totalVisitsAllTime,
                    avgVisitsPerDay: Math.round(avgVisitsPerDay * 100) / 100,
                    topPages
                },
                userIPs: includeIPs ? userIPs : undefined,
                period: {
                    days,
                    from: visitMetrics[visitMetrics.length - 1]?.date,
                    to: visitMetrics[0]?.date
                }
            }
        });
    } catch (error) {
        console.error('Error fetching visit metrics:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch visit metrics',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}