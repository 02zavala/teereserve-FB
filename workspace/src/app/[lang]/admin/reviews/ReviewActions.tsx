
"use client";

import { Button } from "@/components/ui/button";
import { updateReviewStatus, deleteReview } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { ThumbsDown, ThumbsUp, Loader2, Trash2 } from "lucide-react";
import { useTransition, useState } from "react";
import type { Review } from "@/types";
import { useRouter } from "next/navigation";

interface ReviewActionsProps {
    review: Review;
}

export function ReviewActions({ review }: ReviewActionsProps) {
    const [isPending, startTransition] = useTransition();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

    const handleDelete = () => {
        if (!showDeleteConfirm) {
            setShowDeleteConfirm(true);
            return;
        }

        startTransition(async () => {
            try {
                await deleteReview(review.courseId, review.id);
                toast({
                    title: "Review Deleted",
                    description: "The review has been permanently deleted.",
                });
                router.refresh();
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to delete review.",
                    variant: "destructive",
                });
            } finally {
                setShowDeleteConfirm(false);
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
            <Button 
                size="sm" 
                variant={showDeleteConfirm ? "destructive" : "outline"} 
                onClick={handleDelete} 
                disabled={isPending}
                onBlur={() => setShowDeleteConfirm(false)}
            >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                {showDeleteConfirm ? "Confirm Delete" : "Delete"}
            </Button>
        </div>
    );
}
