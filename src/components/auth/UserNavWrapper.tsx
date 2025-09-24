"use client";

import { useEffect, useState } from 'react';
import { UserNav } from './UserNav';
import { Skeleton } from '../ui/skeleton';

export function UserNavWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until component is mounted on client
  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    );
  }

  return <UserNav />;
}