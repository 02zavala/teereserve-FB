
import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
    return (
        <div className={cn("relative", className)}>
            <Image
                src="/logo.svg"
                alt="TeeReserve Logo"
                fill
                sizes="(max-width: 640px) 120px, 150px"
                className="object-contain dark:invert"
                priority
            />
        </div>
    );
}
