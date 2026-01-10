
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

function BookingRow({ 
    booking, 
    lang, 
    onStatusChange, 
    onEdit 
}: { 
    booking: Booking, 
    lang: Locale,
    onStatusChange: (bookingId: string, newStatus: BookingStatus, reason?: string, data?: any) => Promise<void>,
    onEdit: (booking: Partial<Booking>) => void
}) {
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
            <TableCell className="hidden md:table-cell">{booking.userName}</TableCell>
            <TableCell>
                {isClient && formattedDate ? formattedDate : <Skeleton className="h-4 w-24" />}
            </TableCell>
            <TableCell>{booking.players} players</TableCell>
            <TableCell className="hidden lg:table-cell">{booking.holes || 18} holes</TableCell>
            <TableCell className="hidden md:table-cell">${booking.totalPrice?.toFixed(2) ?? '0.00'}</TableCell>
            <TableCell className="hidden lg:table-cell">
                <Badge variant={getStatusVariant(booking.status)}>{getStatusLabel(booking.status)}</Badge>
            </TableCell>
            <TableCell>
                <BookingActionsMenu 
                    booking={booking} 
                    onStatusChange={onStatusChange}
                    onEdit={onEdit}
                    isAdmin={true}
                />
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
    
    const handleStatusChange = async (bookingId: string, newStatus: BookingStatus, reason?: string, data?: any) => {
        try {
            let response;
            if (newStatus === 'canceled_admin' || newStatus === 'canceled_customer') {
                 // Call cancellation API
                 response = await fetch(`/api/v1/bookings/${bookingId}/cancel`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ reason, ...data?.cancellationRequest }),
                 });
            } else {
                 // For other statuses, use the status update API
                 response = await fetch(`/api/v1/bookings/${bookingId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        status: newStatus, 
                        reason,
                        ...data 
                    }),
                 });
            }
            
            if (!response.ok) {
                 let errorMessage = `API failed with status ${response.status}`;
                 try {
                     const text = await response.text();
                     if (text && text.trim()) {
                        try {
                            const errorData = JSON.parse(text);
                            // Handle case where errorData is {} or { error: ... }
                            if (errorData && typeof errorData === 'object') {
                                if (errorData.error) {
                                    errorMessage = typeof errorData.error === 'string' 
                                        ? errorData.error 
                                        : JSON.stringify(errorData.error);
                                } else if (Object.keys(errorData).length > 0) {
                                    errorMessage = JSON.stringify(errorData);
                                }
                            }
                        } catch {
                            errorMessage = text;
                        }
                     }
                 } catch (e) {
                     console.warn('Failed to parse error response:', e);
                 }
                 
                 // Ensure errorMessage is never undefined or null
                 const safeErrorMessage = errorMessage || `Unknown API error (${response.status})`;
                 console.error('API Error:', safeErrorMessage);
                 throw new Error(safeErrorMessage);
            }
            
            const result = await response.json();
            
            // Update local state
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...result.data, status: newStatus } : b));
            
        } catch (error) {
            console.error('Error updating booking status:', error);
            throw error; // Re-throw to be caught by the component
        }
    };

    const handleUpdateBooking = async (updatedBooking: Partial<Booking>) => {
        // Since the Booking object has all fields, we need to extract the ID
        const bookingId = (updatedBooking as any).id;
        if (!bookingId) {
            console.error('No booking ID provided for update');
            return;
        }

        try {
            const response = await fetch(`/api/v1/bookings/${bookingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedBooking),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update booking');
            }

            const result = await response.json();

            // Update local state
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...result.data } : b));
            
            toast({
                title: "Reserva actualizada",
                description: "Los cambios se han guardado correctamente.",
            });

        } catch (error) {
             console.error('Error updating booking:', error);
             toast({
                 title: "Error",
                 description: "No se pudo actualizar la reserva.",
                 variant: "destructive"
             });
        }
    };

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
                        <Table className="min-w-[900px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Booking ID</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead className="hidden md:table-cell">User</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Players</TableHead>
                                    <TableHead className="hidden lg:table-cell">Holes</TableHead>
                                    <TableHead className="hidden md:table-cell">Total</TableHead>
                                    <TableHead className="hidden lg:table-cell">Status</TableHead>
                                    <TableHead>
                                        <span className="sr-only">Actions</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings.map(booking => (
                                    <BookingRow 
                                        key={booking.id} 
                                        booking={booking} 
                                        lang={lang} 
                                        onStatusChange={handleStatusChange}
                                        onEdit={(b) => handleUpdateBooking(b)}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
