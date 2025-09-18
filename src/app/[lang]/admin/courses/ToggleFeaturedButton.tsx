
'use client';

import { useState, useTransition } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Star, Loader2 } from 'lucide-react';
import { updateCourseFeaturedStatus } from '@/lib/data';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ToggleFeaturedButtonProps {
  courseId: string;
  courseName: string;
  isFeatured: boolean;
}

export function ToggleFeaturedButton({
  courseId,
  courseName,
  isFeatured,
}: ToggleFeaturedButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggleFeatured = () => {
    startTransition(async () => {
      try {
        await updateCourseFeaturedStatus(courseId, !isFeatured);
        const action = !isFeatured ? 'featured' : 'unfeatured';
        toast.success(`Course "${courseName}" has been successfully ${action}.`);
        router.refresh();
      } catch (error) {
        console.error('Error toggling course featured status:', error);
        toast.error('Failed to update course status.');
      }
    });
  };

  return (
    <DropdownMenuItem
      onClick={handleToggleFeatured}
      disabled={isPending}
      className="cursor-pointer"
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Star className="mr-2 h-4 w-4" />
      )}
      {isFeatured ? 'Remove from Featured' : 'Mark as Featured'}
    </DropdownMenuItem>
  );
}
