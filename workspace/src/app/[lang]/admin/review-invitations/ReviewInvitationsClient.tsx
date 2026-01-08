'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { processCompletedBookingsForReviewInvitations, triggerReviewInvitation } from '@/lib/data';
import { Booking } from '@/types';
import { Mail, Calendar, Users, MapPin, Clock, Send } from 'lucide-react';
import { Locale } from '@/i18n-config';

interface Props {
  dictionary: any;
  lang: Locale;
}

export default function ReviewInvitationsClient({ dictionary, lang }: Props) {
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingInvitations, setSendingInvitations] = useState(false);
  const [sendingIndividual, setSendingIndividual] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCompletedBookings();
  }, []);

  const loadCompletedBookings = async () => {
    try {
      setLoading(true);
      // Get completed bookings from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // This would need to be implemented in data.ts
      // For now, we'll use a placeholder
      const bookings: Booking[] = [];
      setCompletedBookings(bookings);
    } catch (error) {
      console.error('Error loading completed bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load completed bookings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendAllInvitations = async () => {
    try {
      setSendingInvitations(true);
      await processCompletedBookingsForReviewInvitations();
      toast({
        title: 'Success',
        description: 'Review invitations sent successfully',
      });
      await loadCompletedBookings();
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to send review invitations',
        variant: 'destructive',
      });
    } finally {
      setSendingInvitations(false);
    }
  };

  const handleSendIndividualInvitation = async (bookingId: string) => {
    try {
      setSendingIndividual(bookingId);
      await triggerReviewInvitation(bookingId);
      toast({
        title: 'Success',
        description: 'Review invitation sent successfully',
      });
      await loadCompletedBookings();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to send review invitation',
        variant: 'destructive',
      });
    } finally {
      setSendingIndividual(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading completed bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Review Invitations Management
        </h1>
        <p className="text-gray-600">
          Manage and send review invitations for completed bookings
        </p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            <Mail className="w-4 h-4 mr-1" />
            {completedBookings.filter(b => !b.reviewInvitationSent).length} pending invitations
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <Send className="w-4 h-4 mr-1" />
            {completedBookings.filter(b => b.reviewInvitationSent).length} sent
          </Badge>
        </div>
        
        <Button 
          onClick={handleSendAllInvitations}
          disabled={sendingInvitations || completedBookings.filter(b => !b.reviewInvitationSent).length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          {sendingInvitations ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Send All Pending
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4">
        {completedBookings.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No completed bookings found
                </h3>
                <p className="text-gray-600">
                  No completed bookings from the last 30 days
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          completedBookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{booking.courseName}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(booking.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(booking.time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {booking.players} players
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {booking.reviewInvitationSent ? (
                      <Badge variant="secondary" className="text-sm">
                        <Send className="w-3 h-3 mr-1" />
                        Sent {booking.reviewInvitationSentAt && formatDate(booking.reviewInvitationSentAt)}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleSendIndividualInvitation(booking.id!)}
                        disabled={sendingIndividual === booking.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {sendingIndividual === booking.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-3 h-3 mr-1" />
                            Send Invitation
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Booking ID: {booking.id}</span>
                  <span>Player: {booking.userName}</span>
                  <span>Total: ${booking.totalPrice}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}