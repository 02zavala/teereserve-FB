
"use client";

import { ContactForm } from "@/components/ContactForm";
import type { getDictionary } from "@/lib/get-dictionary";
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

interface ContactPageClientProps {
    dictionary: Awaited<ReturnType<typeof getDictionary>>['contactPage']['form'];
    recaptchaKey: string | undefined;
}

export function ContactPageClient({ dictionary, recaptchaKey }: ContactPageClientProps) {
    if (!recaptchaKey) {
        return <p className="text-destructive text-center">reCAPTCHA is not configured.</p>;
    }

    return (
        <GoogleReCaptchaProvider reCaptchaKey={recaptchaKey}>
            <ContactForm dictionary={dictionary} />
        </GoogleReCaptchaProvider>
    );
}
