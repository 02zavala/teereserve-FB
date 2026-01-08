import { Metadata } from 'next';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/i18n-config';
import ReviewInvitationsClient from './ReviewInvitationsClient';

export const metadata: Metadata = {
  title: 'Review Invitations - Admin | TeeReserve',
  description: 'Manage review invitations for completed bookings',
};

interface Props {
  params: Promise<{
    lang: Locale;
  }>;
}

export default async function ReviewInvitationsPage({ params }: Props) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);

  return (
    <ReviewInvitationsClient 
      dictionary={dictionary} 
      lang={lang} 
    />
  );
}