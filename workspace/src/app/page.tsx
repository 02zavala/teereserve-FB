import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to Spanish version by default
  redirect('/es');
}