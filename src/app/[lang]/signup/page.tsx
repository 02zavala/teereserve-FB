
import Link from "next/link";
import RegistrationFormClient from "./RegistrationFormClient";

interface SignUpPageProps {
    params: Promise<{
        lang: string;
    }>;
}

export default async function SignUpPage({ params: paramsProp }: SignUpPageProps) {
    const { lang } = await paramsProp;
    
    return (
        <div className="container mx-auto flex min-h-[80vh] items-center justify-center">
            <div className="w-full max-w-md">
                 <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold font-headline text-primary">Create an Account</h1>
                    <p className="text-muted-foreground">
                        Already have an account?{" "}
                        <Link href={`/${lang}/login`} className="text-primary hover:underline">
                            Log In
                        </Link>
                    </p>
                </div>
                <RegistrationFormClient />
            </div>
        </div>
    );
}
