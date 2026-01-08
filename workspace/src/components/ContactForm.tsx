
"use client";

import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { getDictionary } from '@/lib/get-dictionary';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

interface ContactFormProps {
    dictionary: Awaited<ReturnType<typeof getDictionary>>['contactPage']['form'];
}

export function ContactForm({ dictionary }: ContactFormProps) {
    const { executeRecaptcha } = useGoogleReCaptcha();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [serverError, setServerError] = useState<string | null>(null);

    const formSchema = z.object({
        name: z.string().min(2, dictionary.errors.name),
        email: z.string().email(dictionary.errors.email),
        message: z.string().min(10, dictionary.errors.message),
    });
    
    type FormData = z.infer<typeof formSchema>;

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            message: "",
        }
    });

    const onSubmit = useCallback(async (data: FormData) => {
        setIsSubmitting(true);
        setSubmitStatus('idle');
        setServerError(null);

        if (!executeRecaptcha) {
            console.error("reCAPTCHA not ready");
            setSubmitStatus('error');
            setServerError("reCAPTCHA is not available. Please try again later.");
            setIsSubmitting(false);
            return;
        }

        try {
            const recaptchaToken = await executeRecaptcha('contact_form');
            
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...data, recaptchaToken }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send message.');
            }

            setSubmitStatus('success');
            form.reset();
        } catch (error) {
            console.error("Submission error:", error);
            setSubmitStatus('error');
            setServerError(error instanceof Error ? error.message : dictionary.errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    }, [executeRecaptcha, form, dictionary.errorMessage]);
    
    const isButtonDisabled = isSubmitting || !executeRecaptcha;

    return (
        <Card className="border">
            <CardHeader>
                <CardTitle className="font-headline text-2xl text-primary">{dictionary.title}</CardTitle>
                <CardDescription>{dictionary.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{dictionary.nameLabel}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={dictionary.namePlaceholder} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{dictionary.emailLabel}</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder={dictionary.emailPlaceholder} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{dictionary.messageLabel}</FormLabel>
                                    <FormControl>
                                        <Textarea rows={5} placeholder={dictionary.messagePlaceholder} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isButtonDisabled}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? dictionary.submitting : dictionary.submit}
                        </Button>
                        {!executeRecaptcha && (
                            <p className="text-xs text-center text-muted-foreground">
                                Preparing secure form...
                            </p>
                        )}
                        {submitStatus === 'success' && (
                            <p className="text-sm font-medium text-green-600">{dictionary.successMessage}</p>
                        )}
                        {submitStatus === 'error' && (
                            <p className="text-sm font-medium text-destructive">{serverError || dictionary.errorMessage}</p>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
