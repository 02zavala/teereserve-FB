
import Link from "next/link";
import LoginFormClient from "./LoginFormClient";

interface LoginPageProps {
    params: Promise<{
        lang: string;
    }>;
}

export default async function LoginPage({ params: paramsProp }: LoginPageProps) {
    const { lang } = await paramsProp;
    
    return (
        <div className="container mx-auto flex min-h-[80vh] items-center justify-center">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold font-headline text-primary">Log In</h1>
                    <p className="text-muted-foreground">
                        Don't have an account?{" "}
                        <Link href={`/${lang}/signup`} className="text-primary hover:underline">
                            Sign Up
                        </Link>
                    </p>
                </div>
                <LoginFormClient />
            </div>
        </div>
    );
}
