
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { User } from 'firebase/auth';
import type { Scorecard, ScorecardInput } from '@/types';
import { addUserScorecard, getUserScorecards, deleteUserScorecard } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler, commonValidators } from '@/hooks/useErrorHandler';
import { ValidationError } from '@/lib/error-handling';
import { Loader2, PlusCircle, Trash2, Calendar, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Skeleton } from './ui/skeleton';
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
import { usePathname } from 'next/navigation';
import type { Locale } from '@/i18n-config';
import { dateLocales } from '@/lib/date-utils';


interface ScorecardManagerProps {
    user: User;
}

const formSchema = z.object({
    courseName: z.string().min(2, "Course name must be at least 2 characters.").max(100, "Course name is too long."),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
    score: z.coerce.number().min(18, "Score must be at least 18.").max(200, "Score must be less than 200."),
    notes: z.string().max(500, "Notes are too long.").optional(),
});

type ScorecardFormValues = z.infer<typeof formSchema>;

function ScorecardItem({ scorecard, onDelete, lang }: { scorecard: Scorecard, onDelete: (id: string) => Promise<void>, lang: Locale }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [formattedDate, setFormattedDate] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);


    useEffect(() => {
        if (scorecard.date && isClient) {
            try {
                setFormattedDate(format(parseISO(scorecard.date), 'PPP', { locale: dateLocales[lang] }));
            } catch (e) {
                console.error("Invalid date for scorecard:", scorecard.id, scorecard.date);
                setFormattedDate("Invalid Date");
            }
        }
    }, [scorecard.date, scorecard.id, lang, isClient]);

    const handleDelete = async () => {
        setIsDeleting(true);
        await onDelete(scorecard.id);
    };
    
    return (
         <Card>
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="font-bold text-lg">{scorecard.courseName}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                       <Calendar className="h-4 w-4" /> {isClient && formattedDate ? formattedDate : <Skeleton className="h-4 w-24 inline-block" />}
                    </p>
                    {scorecard.notes && <p className="text-xs italic text-muted-foreground mt-1">"{scorecard.notes}"</p>}
                </div>
                <div className="text-right flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-6 w-6 text-primary" />
                        <span className="text-3xl font-bold text-accent">{scorecard.score}</span>
                    </div>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your scorecard.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                    Yes, delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    )
}

export function ScorecardManager({ user }: ScorecardManagerProps) {
    const [scorecards, setScorecards] = useState<Scorecard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const { toast } = useToast();
    const { handleAsyncError } = useErrorHandler();
    const pathname = usePathname();
    const lang = (pathname?.split('/')[1] || 'en') as Locale;

    const form = useForm<ScorecardFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            courseName: "",
            date: "",
            score: 0,
            notes: "",
        },
    });

    useEffect(() => {
      setIsClient(true);
    }, []);
    
    useEffect(() => {
        if(isClient) {
            form.setValue('date', format(new Date(), 'yyyy-MM-dd'));
        }
    }, [isClient, form]);
    
    const fetchScorecards = () => {
        handleAsyncError(async () => {
            try {
                console.log('Fetching scorecards for user:', user.uid);
                
                if (!user.uid) {
                    throw new ValidationError('User ID is required to fetch scorecards');
                }
                
                const fetchedScorecards = await getUserScorecards(user.uid);
                setScorecards(fetchedScorecards);
                console.log('Successfully fetched', fetchedScorecards.length, 'scorecards');
            } finally {
                setIsLoading(false);
            }
        }, {
            defaultMessage: 'Failed to fetch scorecards'
        });
    };

    useEffect(() => {
        if (user?.uid) {
            fetchScorecards();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.uid]);

    const onSubmit = (values: ScorecardFormValues) => {
        handleAsyncError(async () => {
            console.log('Submitting scorecard with values:', { ...values, userId: user.uid });
            
            // Validación adicional de datos
            if (!values.courseName.trim()) {
                throw new ValidationError('Course name is required');
            }
            
            if (values.courseName.trim().length < 2) {
                throw new ValidationError('Course name must be at least 2 characters');
            }
            
            if (!/^[a-zA-Z0-9\s\-&'.]+$/.test(values.courseName.trim())) {
                throw new ValidationError('Course name contains invalid characters');
            }
            
            if (!values.date) {
                throw new ValidationError('Date is required');
            }
            
            // Validar que la fecha no sea futura
            const selectedDate = new Date(values.date);
            const today = new Date();
            today.setHours(23, 59, 59, 999); // Permitir fechas de hoy
            
            if (selectedDate > today) {
                throw new ValidationError('Cannot add scorecards for future dates');
            }
            
            if (!values.score || values.score < 18 || values.score > 200) {
                throw new ValidationError('Score must be between 18 and 200');
            }
            
            if (values.notes && values.notes.length > 500) {
                throw new ValidationError('Notes are too long (maximum 500 characters)');
            }
            
            if (!user.uid) {
                throw new ValidationError('User authentication required');
            }
            
            const input: ScorecardInput = {
                userId: user.uid,
                courseName: values.courseName.trim(),
                date: values.date,
                score: values.score,
                ...(values.notes?.trim() && { notes: values.notes.trim() })
            };
            
            await addUserScorecard(input);
            
            toast({ title: "Scorecard Added!", description: "Your new score has been saved." });
            
            form.reset({
                 courseName: "",
                 date: format(new Date(), 'yyyy-MM-dd'),
                 score: undefined,
                 notes: "",
            });
            
            await fetchScorecards();
            console.log('Scorecard added successfully');
        });
    };

    const handleDelete = async (id: string) => {
        handleAsyncError(async () => {
            console.log('Deleting scorecard with ID:', id);
            
            if (!id || !id.trim()) {
                throw new ValidationError('Scorecard ID is required for deletion');
            }
            
            if (!user.uid) {
                throw new ValidationError('User authentication required');
            }
            
            await deleteUserScorecard(user.uid, id.trim());
            
            toast({ title: "Scorecard Deleted", description: "The scorecard has been removed." });
            setScorecards(prev => prev.filter(sc => sc.id !== id));
            console.log('Scorecard deleted successfully');
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PlusCircle className="h-5 w-5" /> Add New Scorecard
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="courseName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Course Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Solmar Golf Links" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date Played</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} disabled={!isClient} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="score"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Final Score</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g., 85" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Notes (Optional)</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Any memorable shots or conditions?" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Scorecard
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2 space-y-4">
                 {isLoading ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                ) : scorecards.length > 0 ? (
                    scorecards.map(sc => <ScorecardItem key={sc.id} scorecard={sc} onDelete={handleDelete} lang={lang} />)
                ) : (
                    <p className="text-center text-muted-foreground pt-16">You haven't added any scorecards yet.</p>
                )}
            </div>
        </div>
    );
}

export default ScorecardManager;
