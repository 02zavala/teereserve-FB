"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useRouter, usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import { useErrorHandler, commonValidators } from "@/hooks/useErrorHandler"
import { ValidationError } from "@/lib/error-handling"
import { useTriggerOnboarding } from "@/hooks/useOnboarding"
import { sendWelcomeEmail } from "@/ai/flows/send-welcome-email"
import { sendWebhook } from "@/lib/webhooks"
import { FirebaseError } from "firebase/app"
import { Loader2 } from "lucide-react"
import { translateFirebaseError } from "@/lib/error-handling"
import { detectAuthMethods, handleEmailAlreadyInUse } from "@/lib/auth-utils"
// Removed PaymentTermsCheckbox and added Checkbox/Label/Link
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import Link from "next/link"

const formSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, { message: "Name must be less than 50 characters." }),
    lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }).max(50, { message: "Last name must be less than 50 characters." }),
    email: z.string().email({ message: "Please enter a valid email." }).max(254, { message: "Email is too long." }),
    phone: z.string().min(8, { message: "Phone must be at least 8 digits." }).max(20, { message: "Phone is too long." }),
    dob: z.string().refine((v) => {
      const d = new Date(v);
      return !isNaN(d.getTime());
    }, { message: "Please provide a valid date of birth." }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." })
      .max(128, { message: "Password is too long." })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: "Password must contain at least one uppercase letter, one lowercase letter, and one number." }),
    confirmPassword: z.string(),
    handicap: z.coerce.number().min(0, { message: "Handicap must be 0 or higher." }).max(54, { message: "Handicap must be 54 or lower." }).optional(),
    acceptTerms: z.boolean().refine((v) => v === true, { message: "You must accept the terms to continue." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export default function RegistrationForm() {
  const { toast } = useToast()
  const { signup } = useAuth()
  const { handleAsyncError } = useErrorHandler()
  const { triggerOnboarding } = useTriggerOnboarding()
  const router = useRouter()
  const pathname = usePathname()
  const lang = pathname?.split('/')[1] || 'en'

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      lastName: "",
      email: "",
      phone: "",
      dob: "",
      password: "",
      confirmPassword: "",
      handicap: undefined,
      acceptTerms: false,
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    handleAsyncError(async () => {
      console.log('Starting signup process with values:', { ...values, password: '[REDACTED]' });
      
      // Additional validations
      if (!commonValidators.isValidName(values.name)) {
        throw new ValidationError('Name must contain only letters, numbers, spaces, and basic punctuation');
      }
      if (!commonValidators.isValidName(values.lastName)) {
        throw new ValidationError('Last name must contain only letters, numbers, spaces, and basic punctuation');
      }
      
      if (!commonValidators.isValidEmail(values.email)) {
        throw new ValidationError('Please enter a valid email address');
      }
      
      if (values.password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters long');
      }
      
      // Password strength
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(values.password)) {
        throw new ValidationError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }
      
      if (values.handicap !== undefined && (values.handicap < 0 || values.handicap > 54)) {
        throw new ValidationError('Handicap must be between 0 and 54');
      }
      
      // Check if email exists before creating account
      const emailToCheck = values.email.trim().toLowerCase();
      const authInfo = await detectAuthMethods(emailToCheck);
      
      if (authInfo.exists) {
        const errorInfo = await handleEmailAlreadyInUse(emailToCheck);
        
        toast({
          title: "Email ya registrado",
          description: errorInfo.message,
          variant: "destructive",
        });
        
        // Redirect to login after brief delay
        setTimeout(() => {
          router.push(`/${lang}/login`);
        }, 2000);
        
        return; // Stop registration flow
      }
      
      const fullName = `${values.name.trim()} ${values.lastName.trim()}`;
      const result = await signup(emailToCheck, values.password, fullName, values.handicap, {
        lastName: values.lastName.trim(),
        dob: values.dob,
        phone: values.phone.trim(),
        acceptedTerms: !!values.acceptTerms,
      });
      console.log('Signup successful:', result);
      
      // Welcome email (optional)
      try {
        await sendWelcomeEmail({
          userName: fullName,
          userEmail: emailToCheck,
          locale: lang as 'en' | 'es'
        });
        console.log('Welcome email sent successfully');
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
      
      // Webhook for automation
      try {
        await sendWebhook('user.registered', {
          userId: result.user?.uid,
          userName: fullName,
          userEmail: emailToCheck,
          locale: lang,
          registrationDate: new Date().toISOString(),
          source: 'signup_form'
        });
        console.log('Registration webhook sent successfully');
      } catch (webhookError) {
        console.error('Failed to send registration webhook:', webhookError);
      }
      
      const requireVerification = process.env.NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION === 'true';
      if (requireVerification) {
        toast({
          title: lang === 'es' ? "Verifica tu email" : "Verify your email",
          description:
            lang === 'es'
              ? "Te hemos enviado un enlace de verificación. Revisa tu bandeja y la carpeta de spam."
              : "We sent you a verification link. Check your inbox and spam folder.",
        });
      } else {
        toast({
          title: lang === 'es' ? "¡Bienvenido a TeeReserve!" : "Welcome to TeeReserve!",
          description:
            lang === 'es'
              ? "Tu cuenta ha sido creada exitosamente."
              : "Your account has been created successfully.",
        });
      }
      
      // Trigger onboarding
      triggerOnboarding();
      
      // Redirect depending on verification requirement
      setTimeout(() => {
        if (requireVerification) {
          router.push(`/${lang}/verify-email`);
        } else {
          router.push(`/${lang}`);
        }
      }, 500);
    }, {
      onError: async (error: any) => {
        if (error.code === 'auth/email-already-in-use') {
          const errorInfo = await handleEmailAlreadyInUse(values.email.trim().toLowerCase());
          
          toast({
            title: "Email ya registrado",
            description: errorInfo.message,
            variant: "destructive",
          });
          
          setTimeout(() => {
            router.push(`/${lang}/login`);
          }, 2000);
          
          return;
        }
        
        const friendlyMessage = translateFirebaseError(error as FirebaseError);
        
        toast({
          title: "Error en el registro",
          description: friendlyMessage,
          variant: "destructive",
        });
        
        throw error;
      }
    });
  }

  const termsAccepted = form.watch('acceptTerms');

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+52 55 1234 5678" {...field} />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="handicap"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Handicap Index (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="e.g., 12.5" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            
            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-3">
                    <FormControl>
                      <Checkbox id="accept-terms" checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <Label htmlFor="accept-terms" className="text-sm leading-relaxed cursor-pointer">
                      {lang === 'es' ? (
                        <>Acepto el uso de datos personales de acuerdo con la{' '}<Link href={`/${lang}/privacy`} className="text-primary underline hover:text-primary/80" target="_blank">Política de Privacidad</Link>.</>
                      ) : (
                        <>I accept the use of personal data in accordance with the{' '}<Link href={`/${lang}/privacy`} className="text-primary underline hover:text-primary/80" target="_blank">Privacy Policy</Link>.</>
                      )}
                    </Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || !termsAccepted}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}