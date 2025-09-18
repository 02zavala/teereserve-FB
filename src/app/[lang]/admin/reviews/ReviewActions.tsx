
"use client";

import { Button } from "@/components/ui/button";
import { updateReviewStatus } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { ThumbsDown, ThumbsUp, Loader2 } from "lucide-react";
import { useTransition } from "react";
import type { Review } from "@/types";
import { useRouter } from "next/navigation";

interface ReviewActionsProps {
    review: Review;
}

export function ReviewActions({ review }: ReviewActionsProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();


    const handleDecision = (approved: boolean) => {
        startTransition(async () => {
            try {
                await updateReviewStatus(review.courseId, review.id, approved);
                toast({
                    title: `Review ${approved ? 'Approved' : 'Rejected'}`,
                    description: "The review status has been updated.",
                });
                router.refresh();
            } catch (error) {
                 toast({
                    title: "Error",
                    description: "Failed to update review status.",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleDecision(true)} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ThumbsUp className="mr-2 h-4 w-4" />}
                Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleDecision(false)} disabled={isPending}>
                 {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ThumbsDown className="mr-2 h-4 w-4" />}
                Reject
            </Button>
        </div>
    );
}
