'use client';

import React from 'react';
import type { Locale } from '@/i18n-config';
import FeedTimeline from '@/components/social/FeedTimeline';

export default function FeedPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = React.use(params);

  return (
    <div className="container mx-auto max-w-2xl py-6">
      <h1 className="text-xl font-semibold mb-4">Feed social</h1>
      <FeedTimeline lang={lang} />
    </div>
  );
}