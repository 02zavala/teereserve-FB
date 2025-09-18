
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Loader2 } from "lucide-react";
import { getBookings } from "@/lib/data";
import type { Booking, BookingStatus } from "@/types";
import { format } from "date-fns";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n-config";
import { dateLocales } from "@/lib/date-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingActionsMenu } from "@/components/admin/BookingActionsMenu";
import { toast } from "@/hooks/use-toast";


function getStatusVariant(status: BookingStatus) {
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

function getStatusLabel(status: BookingStatus): string {
    const labels: Record<BookingStatus, string> = {
        pending: 'Pendiente',
        confirmed: 'Confirmada',
        rescheduled: 'Reprogramada',
        checked_in: 'Check-in',
        completed: 'Completada',
        canceled_customer: 'Cancelada (Cliente)',
        canceled_admin: 'Cancelada (Admin)',
        no_show: 'No Show',
        disputed: 'En Disputa'
    };
    return labels[status] || status;
}

function BookingRow({ booking, lang }: { booking: Booking, lang: Locale }) {
    const [formattedDate, setFormattedDate] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (booking.date && isClient) {
            try {
                const dateObj = typeof booking.date === 'string' ? new Date(booking.date) : booking.date;
                if (!isNaN(dateObj.getTime())) {
                    setFormattedDate(format(dateObj, 'PPP', { locale: dateLocales[lang] }));
                } else {
                    setFormattedDate("Invalid Date");
                }
            } catch (e) {
                console.error("Invalid date format for booking:", booking.id, booking.date);
                setFormattedDate("Invalid Date");
            }
        }
    }, [booking.date, booking.id, lang, isClient]);


    return (
        <TableRow>
            <TableCell className="font-medium">{booking.id.substring(0, 7)}...</TableCell>
            <TableCell>{booking.courseName}</TableCell>
            <TableCell>{booking.userName}</TableCell>
            <TableCell>
                {isClient && formattedDate ? formattedDate : <Skeleton className="h-4 w-24" />}
            </TableCell>
            <TableCell>{booking.players} players</TableCell>
            <TableCell>{booking.holes || 18} holes</TableCell>
            <TableCell>${booking.totalPrice.toFixed(2)}</TableCell>
            <TableCell>
                <Badge variant={getStatusVariant(booking.status)}>{getStatusLabel(booking.status)}</Badge>
            </TableCell>
            <TableCell>
                <BookingActionsMenu booking={booking} />
            </TableCell>
        </TableRow>
    );
}

export default function BookingsAdminPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const lang = (pathname?.split('/')[1] || 'en') as Locale;

    useEffect(() => {
        getBookings().then(fetchedBookings => {
            setBookings(fetchedBookings);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to fetch bookings", err);
            setLoading(false);
        });
    }, []);
    
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                 <h1 className="text-3xl font-bold font-headline text-primary">Manage Bookings</h1>
                 <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Booking
                 </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                         <div className="flex justify-center items-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Booking ID</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Players</TableHead>
                                    <TableHead>Holes</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>
                                        <span className="sr-only">Actions</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings.map(booking => (
                                    <BookingRow key={booking.id} booking={booking} lang={lang} />
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
