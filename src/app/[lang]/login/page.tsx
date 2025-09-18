
import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
    return (
        <div className="container mx-auto flex min-h-[80vh] items-center justify-center">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold font-headline text-primary">Log In</h1>
                    <p className="text-muted-foreground">
                        Don't have an account?{" "}
                        <Link href="/signup" className="text-primary hover:underline">
                            Sign Up
                        </Link>
                    </p>
                </div>
                <LoginForm />
            </div>
        </div>
    );
}
