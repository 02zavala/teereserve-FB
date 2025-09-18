
import { SignUpForm } from "@/components/auth/SignUpForm";
import Link from "next/link";

export default function SignUpPage() {
    return (
        <div className="container mx-auto flex min-h-[80vh] items-center justify-center">
            <div className="w-full max-w-md">
                 <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold font-headline text-primary">Create an Account</h1>
                    <p className="text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary hover:underline">
                            Log In
                        </Link>
                    </p>
                </div>
                <SignUpForm />
            </div>
        </div>
    );
}
