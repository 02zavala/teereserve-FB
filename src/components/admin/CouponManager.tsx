
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Coupon } from '@/types';
import { addCoupon, deleteCoupon } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler, commonValidators } from '@/hooks/useErrorHandler';
import { ValidationError } from '@/lib/error-handling';
import { Loader2, PlusCircle, Trash2, TicketPercent } from 'lucide-react';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { dateLocales } from '@/lib/date-utils';
import type { Locale } from '@/i18n-config';
import { usePathname } from 'next/navigation';

interface CouponManagerProps {
  initialCoupons: Coupon[];
}

const formSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters.').max(50),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.coerce.number().min(0, 'Discount value must be positive.'),
  expiresAt: z.string().optional(),
});

type CouponFormValues = z.infer<typeof formSchema>;

function CouponRow({ coupon, onDelete, lang }: { coupon: Coupon; onDelete: (code: string) => void; lang: Locale }) {
    const [formattedDate, setFormattedDate] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (coupon.expiresAt && isClient) {
            try {
                setFormattedDate(format(new Date(coupon.expiresAt), 'PPP', { locale: dateLocales[lang] }));
            } catch (e) {
                console.error("Invalid date format for coupon:", coupon.code, coupon.expiresAt);
                setFormattedDate("Invalid Date");
            }
        }
    }, [coupon.expiresAt, coupon.code, lang, isClient]);

    return (
        <TableRow>
            <TableCell>
                <Badge><TicketPercent className="mr-1 h-3 w-3"/>{coupon.code}</Badge>
            </TableCell>
            <TableCell>
                {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue}`}
            </TableCell>
            <TableCell>
                {coupon.expiresAt ? (isClient && formattedDate ? formattedDate : <Skeleton className="h-4 w-24" />) : 'Never'}
            </TableCell>
            <TableCell>
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the coupon "{coupon.code}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(coupon.code)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            </TableCell>
        </TableRow>
    );
}

export function CouponManager({ initialCoupons }: CouponManagerProps) {
  const { userProfile } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { handleAsyncError, handleError } = useErrorHandler();
  const pathname = usePathname();
  const lang = (pathname?.split('/')[1] || 'en') as Locale;

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      discountType: 'percentage',
    },
  });

  if (userProfile?.role !== 'SuperAdmin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You do not have permission to manage coupons.</p>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = async (values: CouponFormValues) => {
    setIsLoading(true);
    
    // Validación de datos antes de enviar
    let hasErrors = false;
    
    // Validar código del cupón
    if (!values.code?.trim()) {
      form.setError('code', { message: 'Coupon code is required' });
      hasErrors = true;
    } else if (values.code.length < 3) {
      form.setError('code', { message: 'Coupon code must be at least 3 characters' });
      hasErrors = true;
    } else if (!/^[A-Z0-9_-]+$/i.test(values.code)) {
      form.setError('code', { message: 'Coupon code can only contain letters, numbers, hyphens, and underscores' });
      hasErrors = true;
    } else if (coupons.some(coupon => coupon.code.toLowerCase() === values.code.toLowerCase())) {
      form.setError('code', { message: 'A coupon with this code already exists' });
      hasErrors = true;
    }
    
    // Validar valor del descuento
    if (!values.discountValue || values.discountValue <= 0) {
      form.setError('discountValue', { message: 'Discount value must be greater than 0' });
      hasErrors = true;
    } else if (values.discountType === 'percentage' && values.discountValue > 100) {
      form.setError('discountValue', { message: 'Percentage discount cannot exceed 100%' });
      hasErrors = true;
    }
    
    // Validar fecha de expiración
    if (values.expiresAt) {
      const expirationDate = new Date(values.expiresAt);
      const now = new Date();
      if (expirationDate <= now) {
        form.setError('expiresAt', { message: 'Expiration date must be in the future' });
        hasErrors = true;
      }
    }
    
    if (hasErrors) {
      setIsLoading(false);
      return;
    }

    try {
      const newCoupon = await addCoupon({
        ...values,
        code: values.code.toUpperCase(), // Normalizar código a mayúsculas
        expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
      });
      
      setCoupons(prev => [newCoupon, ...prev]);
      toast({ 
        title: 'Success', 
        description: `Coupon "${newCoupon.code}" created successfully.` 
      });
      
      form.reset({
        code: '',
        discountType: 'percentage',
        discountValue: undefined,
        expiresAt: '',
      });
    } catch (error) {
      handleError(error, {
        defaultMessage: 'Failed to create coupon. Please try again.',
        onError: (error) => {
          console.error('Coupon creation error:', {
            error,
            couponData: values,
            timestamp: new Date().toISOString()
          });
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!code?.trim()) {
      toast({
        title: 'Error',
        description: 'Invalid coupon code.',
        variant: 'destructive',
      });
      return;
    }

    const result = await handleAsyncError(async () => {
      await deleteCoupon(code);
      setCoupons(prev => prev.filter(c => c.code !== code));
      toast({ 
        title: 'Success', 
        description: `Coupon "${code}" deleted successfully.` 
      });
      return true;
    }, {
      defaultMessage: 'Failed to delete coupon. Please try again.',
      onError: (error) => {
        console.error('Coupon deletion error:', {
          error,
          couponCode: code,
          timestamp: new Date().toISOString()
        });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle /> Add New Coupon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SUMMER25" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Value</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 25" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Coupon
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Existing Coupons</CardTitle>
            <CardDescription>List of all available discount codes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <CouponRow key={coupon.code} coupon={coupon} onDelete={handleDelete} lang={lang} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CouponManager;
