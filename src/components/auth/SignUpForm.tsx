
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
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import { useErrorHandler, commonValidators } from "@/hooks/useErrorHandler"
import { ValidationError } from "@/lib/error-handling"
import { useTriggerOnboarding } from "@/hooks/useOnboarding"
import { sendWelcomeEmail } from "@/ai/flows/send-welcome-email"
import { sendWebhook } from "@/lib/webhooks"
import { FirebaseError } from "firebase/app"
import { Loader2 } from "lucide-react"
import { handleError, translateFirebaseError } from "@/lib/error-handling"
import { detectAuthMethods, handleEmailAlreadyInUse, getFriendlyErrorMessage } from "@/lib/auth-utils"


const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, { message: "Name must be less than 50 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }).max(254, { message: "Email is too long." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }).max(128, { message: "Password is too long." })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: "Password must contain at least one uppercase letter, one lowercase letter, and one number." }),
  handicap: z.coerce.number().min(0, { message: "Handicap must be 0 or higher." }).max(54, { message: "Handicap must be 54 or lower." }).optional(),
})

export function SignUpForm() {
    const { toast } = useToast()
    const { signup, googleSignIn } = useAuth()
    const { handleAsyncError } = useErrorHandler()
    const { triggerOnboarding } = useTriggerOnboarding()
    const router = useRouter()
    const pathname = usePathname()
    const lang = pathname?.split('/')[1] || 'en'

    const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      handicap: undefined,
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    handleAsyncError(async () => {
      console.log('Starting signup process with values:', { ...values, password: '[REDACTED]' });
      
      // Validación adicional de datos
      if (!commonValidators.isValidName(values.name)) {
        throw new ValidationError('Name must contain only letters, numbers, spaces, and basic punctuation');
      }
      
      if (!commonValidators.isValidEmail(values.email)) {
        throw new ValidationError('Please enter a valid email address');
      }
      
      if (values.password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters long');
      }
      
      // Validar fortaleza de contraseña
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(values.password)) {
        throw new ValidationError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }
      
      if (values.handicap !== undefined && (values.handicap < 0 || values.handicap > 54)) {
        throw new ValidationError('Handicap must be between 0 and 54');
      }
      
      // Verificar si el email ya existe antes de intentar crear la cuenta
      const emailToCheck = values.email.trim().toLowerCase();
      const authInfo = await detectAuthMethods(emailToCheck);
      
      if (authInfo.exists) {
        const errorInfo = await handleEmailAlreadyInUse(emailToCheck);
        
        toast({
          title: "Email ya registrado",
          description: errorInfo.message,
          variant: "destructive",
        });
        
        // Redirigir al login después de un breve delay
        setTimeout(() => {
          router.push(`/${lang}/login`);
        }, 2000);
        
        return; // No continuar con el registro
      }
      
      const result = await signup(emailToCheck, values.password, values.name.trim(), values.handicap);
      console.log('Signup successful:', result);
      
      // Enviar email de bienvenida
      try {
        await sendWelcomeEmail({
          userName: values.name.trim(),
          userEmail: values.email.trim().toLowerCase(),
          locale: lang as 'en' | 'es'
        });
        console.log('Welcome email sent successfully');
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // No interrumpir el flujo si falla el email
      }
      
      // Enviar webhook para automatización con n8n
      try {
        await sendWebhook('user.registered', {
          userId: result.user?.uid,
          userName: values.name.trim(),
          userEmail: values.email.trim().toLowerCase(),
          locale: lang,
          registrationDate: new Date().toISOString(),
          source: 'signup_form'
        });
        console.log('Registration webhook sent successfully');
      } catch (webhookError) {
        console.error('Failed to send registration webhook:', webhookError);
        // No interrumpir el flujo si falla el webhook
      }
      
      toast({
        title: "¡Bienvenido a TeeReserve!",
        description: "Tu cuenta ha sido creada exitosamente. Revisa tu email para más información.",
      });
      
      // Activar el onboarding para nuevos usuarios
      triggerOnboarding();
      
      // Esperar un momento antes de redirigir para que el onboarding se active
      setTimeout(() => {
        console.log('About to redirect to:', `/${lang}`);
        router.push(`/${lang}`);
        router.refresh();
        console.log('Redirect completed');
      }, 500);
    }, {
      // Manejo específico de errores de autenticación
      onError: async (error: any) => {
        if (error.code === 'auth/email-already-in-use') {
          // Fallback si la verificación previa falló
          const errorInfo = await handleEmailAlreadyInUse(values.email.trim().toLowerCase());
          
          toast({
            title: "Email ya registrado",
            description: errorInfo.message,
            variant: "destructive",
          });
          
          setTimeout(() => {
            router.push(`/${lang}/login`);
          }, 2000);
          
          return; // No relanzar el error
        }
        
        // Para otros errores, usar el mensaje amigable
        const friendlyMessage = getFriendlyErrorMessage(error.code);
        
        toast({
          title: "Error en el registro",
          description: friendlyMessage,
          variant: "destructive",
        });
        
        throw error; // Relanzar para que useErrorHandler lo maneje
      }
    });
  }

  function handleGoogleSignIn() {
    handleAsyncError(async () => {
      console.log('Starting Google sign-up...');
      
      await googleSignIn();
      console.log('Google sign-up successful');
      
      toast({
        title: "¡Bienvenido a TeeReserve!",
        description: "Tu cuenta ha sido creada exitosamente.",
      });
      
      // Activar el onboarding para nuevos usuarios
      triggerOnboarding();
      
      router.push(`/${lang}/profile`);
      router.refresh();
    }, {
      onError: async (error: any) => {
        if (error.code === 'auth/account-exists-with-different-credential') {
          toast({
            title: "Cuenta existente",
            description: "Ya tienes una cuenta con este email. Inicia sesión con tu contraseña.",
            variant: "destructive",
          });
          
          setTimeout(() => {
            router.push(`/${lang}/login`);
          }, 2000);
          
          return; // No relanzar el error
        }
        
        // Para otros errores, usar el mensaje amigable
        const friendlyMessage = getFriendlyErrorMessage(error.code);
        
        toast({
          title: "Error en el registro",
          description: friendlyMessage,
          variant: "destructive",
        });
        
        throw error; // Relanzar para que useErrorHandler lo maneje
      }
    });
  }

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
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </Form>
      </CardContent>
       <CardFooter className="flex flex-col gap-4">
        <div className="relative w-full">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">OR SIGN UP WITH</span>
        </div>
        <div className="grid grid-cols-1 gap-4 w-full">
            <Button variant="outline" onClick={handleGoogleSignIn}>Google</Button>
        </div>
      </CardFooter>
    </Card>
  )
}
