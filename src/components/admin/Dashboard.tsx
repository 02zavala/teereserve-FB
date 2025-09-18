"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, CreditCard, Activity, Loader2, Flag, TrendingUp } from "lucide-react";
import { getDashboardStats, getRevenueLast7Days } from "@/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Booking } from "@/types";
import { format } from "date-fns";
import Link from "next/link";
import dynamic from 'next/dynamic';

const RevenueChart = dynamic(() => import('@/components/admin/RevenueChart').then(mod => ({ default: mod.RevenueChart })), { ssr: false });
const HoleDistributionChart = dynamic(() => import('@/components/admin/HoleDistributionChart').then(mod => ({ default: mod.HoleDistributionChart })), { ssr: false });
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n-config";
import { dateLocales } from "@/lib/date-utils";

interface DashboardStats {
    totalRevenue: number;
    totalUsers: number;
    totalBookings: number;
    recentBookings: Booking[];
    holeStats: { holes9: number; holes18: number; holes27: number };
    revenueByHoles: { holes9: number; holes18: number; holes27: number };
}

function getStatusVariant(status: Booking['status']) {
    switch (status) {
        case 'confirmed': return 'default';
        case 'completed': return 'secondary';
        case 'canceled_customer':
        case 'canceled_admin': return 'destructive';
        case 'checked_in': return 'default';
        case 'rescheduled': return 'secondary';
        case 'no_show': return 'destructive';
        case 'disputed': return 'destructive';
        case 'pending':
        default:
            return 'outline';
    }
}

function RecentBookingRow({ booking, lang }: { booking: Booking, lang: Locale }) {
    const [formattedDate, setFormattedDate] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient && booking.date) {
            try {
                const bookingDate = typeof booking.date === 'string' ? new Date(booking.date) : booking.date;
                const locale = dateLocales[lang] || dateLocales.en;
                setFormattedDate(format(bookingDate, 'PPP', { locale }));
            } catch (error) {
                console.error('Error formatting date:', error);
                setFormattedDate('Invalid date');
            }
        }
    }, [isClient, booking.date, lang]);

    if (!isClient) {
        return (
            <TableRow>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
            </TableRow>
        );
    }

    return (
        <TableRow>
            <TableCell className="font-medium">{booking.id}</TableCell>
            <TableCell>{booking.userName}</TableCell>
            <TableCell>{formattedDate}</TableCell>
            <TableCell>${booking.totalPrice?.toFixed(2) || '0.00'}</TableCell>
            <TableCell>
                <Badge variant={getStatusVariant(booking.status)}>
                    {booking.status}
                </Badge>
            </TableCell>
        </TableRow>
    );
}

export function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [revenueData, setRevenueData] = useState<{ date: string; revenue: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const lang = (pathname?.split('/')[1] || 'en') as Locale;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Add timeout to prevent infinite loading
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Dashboard data fetch timeout')), 10000)
                );
                
                const dataPromise = Promise.all([
                    getDashboardStats(),
                    getRevenueLast7Days(),
                ]);
                
                const [statsData, revenueChartData] = await Promise.race([
                    dataPromise,
                    timeoutPromise
                ]) as [any, any];
                
                setStats(statsData);
                setRevenueData(revenueChartData);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
                // Set empty data on error to prevent infinite loading
                setStats({
                    totalRevenue: 0,
                    totalUsers: 0,
                    totalBookings: 0,
                    recentBookings: [],
                    holeStats: { holes9: 0, holes18: 0, holes27: 0 },
                    revenueByHoles: { holes9: 0, holes18: 0, holes27: 0 }
                });
                setRevenueData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }
    
    if (!stats) {
        return (
             <div className="flex justify-center items-center h-full">
                <p className="text-muted-foreground">Could not load dashboard data.</p>
            </div>
        )
    }

    return (
        <div>
            <h1 className="text-3xl font-bold font-headline text-primary mb-6">Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Revenue
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            Based on completed bookings
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            Registered users
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Bookings
                        </CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalBookings}</div>
                        <p className="text-xs text-muted-foreground">
                            All time bookings
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Avg. Revenue per Booking
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${stats.totalBookings > 0 ? (stats.totalRevenue / stats.totalBookings).toFixed(2) : '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Per completed booking
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-6">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                        <CardDescription>
                            Revenue for the last 7 days
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <RevenueChart data={revenueData} />
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Hole Distribution</CardTitle>
                        <CardDescription>
                            Bookings by hole count
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <HoleDistributionChart data={stats.holeStats} />
                    </CardContent>
                </Card>
            </div>

            <div className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Bookings</CardTitle>
                        <CardDescription>
                            Latest booking activity
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Booking ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.recentBookings.map((booking) => (
                                    <RecentBookingRow key={booking.id} booking={booking} lang={lang} />
                                ))}
                            </TableBody>
                        </Table>
                        {stats.recentBookings.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No recent bookings found.
                            </div>
                        )}
                        <div className="mt-4 text-center">
                            <Link 
                                href={`/${lang}/admin/bookings`} 
                                className="text-primary hover:underline"
                            >
                                View all bookings →
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}