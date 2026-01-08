
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Phone, Clock, CheckCircle, Zap, Shield, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function WhatsAppIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-8 w-8"
        >
            <path
                d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.61 15.35 3.5 16.82L2.1 21.9L7.29 20.53C8.75 21.36 10.37 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 6.45 17.5 2 12.04 2M12.04 3.67C16.56 3.67 20.28 7.38 20.28 11.91C20.28 16.44 16.56 20.15 12.04 20.15C10.56 20.15 9.14 19.74 7.9 19L7.23 18.63L3.81 19.44L4.65 16.11L4.26 15.4C3.4 14.07 2.95 12.53 2.95 11.91C2.95 7.38 6.66 3.67 12.04 3.67M9.21 7.64C8.95 7.64 8.71 7.72 8.52 7.91C8.33 8.1 8.08 8.41 8.08 8.89C8.08 9.38 8.52 9.92 8.65 10.08C8.77 10.25 10.13 12.63 12.44 13.56C14.75 14.5 15.17 14.32 15.52 14.29C15.87 14.26 16.86 13.68 17.02 13.1C17.18 12.52 17.18 12.06 17.1 11.91C17.02 11.76 16.86 11.68 16.59 11.55C16.31 11.42 15.17 10.86 14.92 10.77C14.66 10.68 14.49 10.63 14.32 10.86C14.15 11.09 13.64 11.68 13.48 11.85C13.31 12.02 13.14 12.04 12.88 11.91C12.62 11.78 11.78 11.51 10.77 10.59C10.02 9.9 9.5 9.07 9.37 8.84C9.24 8.61 9.37 8.45 9.5 8.32C9.62 8.2 9.77 8.02 9.91 7.87C10.05 7.72 10.11 7.64 10.25 7.41C10.38 7.18 10.31 6.99 10.25 6.86C10.18 6.72 9.77 5.72 9.59 5.34C9.41 4.96 9.24 5.02 9.09 5.02"
            />
        </svg>
    );
}


export function WhatsAppButton() {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const pathname = usePathname();

    const phoneNumber = "5216241352986";
    const message = "Hola TeeReserve Golf, me gustaría obtener más información para reservar un tee time.";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    const telUrl = `tel:+${phoneNumber}`;

    // This effect will run every time the user navigates to a new page,
    // making the button visible again.
    useEffect(() => {
        setIsVisible(true);
    }, [pathname]);

    if (!isVisible) {
        return null;
    }
    
    return (
        <div className="fixed bottom-6 right-6 z-50">
             <div className="relative group">
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            size="icon"
                            className="h-16 w-16 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 z-50 animate-bounce"
                            aria-label="Contact options"
                        >
                            <WhatsAppIcon />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 mr-4 mb-2" side="top" align="end">
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => setPopoverOpen(false)}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close Popover</span>
                        </Button>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="mt-1">
                                    <WhatsAppIcon />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-primary">Reserva por WhatsApp</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Contacta directamente con nuestro equipo para reservar tu tee time.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Button className="w-full bg-green-500 hover:bg-green-600" asChild>
                                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                                    <WhatsAppIcon /> Reservar por WhatsApp
                                </a>
                                </Button>
                                <Button variant="outline" className="w-full" asChild>
                                    <a href={telUrl}>
                                        <Phone /> Llamar Ahora
                                    </a>
                                </Button>
                            </div>

                            <div className="text-center text-sm text-muted-foreground">
                                <p className="font-semibold text-foreground">+52 624 135 2986</p>
                                <p className="flex items-center justify-center gap-1.5">
                                    <Clock className="h-3 w-3" />
                                    Horario: 7:00 AM - 8:00 PM
                                </p>
                            </div>

                            <div className="bg-card border rounded-lg p-3 text-xs space-y-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span>Reserva Inmediata</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-yellow-500" />
                                    <span>Confirmación Rápida</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-blue-500" />
                                    <span>Pago Seguro</span>
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
                 <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Dismiss WhatsApp Button"
                    className={cn(
                        "absolute -top-2 -right-2 h-6 w-6 rounded-full bg-card/80 text-card-foreground backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100",
                        popoverOpen && "opacity-100"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsVisible(false);
                    }}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
