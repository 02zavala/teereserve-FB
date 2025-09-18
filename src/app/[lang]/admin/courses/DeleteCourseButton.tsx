
"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { deleteCourse } from "@/lib/data";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface DeleteCourseButtonProps {
    courseId: string;
    courseName: string;
}

export function DeleteCourseButton({ courseId, courseName }: DeleteCourseButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();

    const handleDelete = () => {
        startTransition(async () => {
            try {
                await deleteCourse(courseId);
                toast({
                    title: "Course Deleted",
                    description: `The course "${courseName}" has been successfully deleted.`,
                });
                setIsOpen(false);
                router.refresh();
            } catch (error) {
                console.error("Failed to delete course:", error);
                toast({
                    title: "Error",
                    description: "Failed to delete the course. Please try again.",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem
                    className="text-destructive"
                    onSelect={(e) => e.preventDefault()} // Prevents DropdownMenu from closing
                >
                    Delete
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        course <span className="font-bold">"{courseName}"</span> and all of its associated data, including reviews and tee times.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Yes, delete course
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
