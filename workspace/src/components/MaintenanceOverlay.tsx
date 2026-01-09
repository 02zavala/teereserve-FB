"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function MaintenanceOverlay() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { userProfile, loading } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Si es Admin o SuperAdmin, permitir acceso completo
  // Solo aplicamos esta excepción si ya terminó de cargar la info del usuario
  if (!loading && (userProfile?.role === 'Admin' || userProfile?.role === 'SuperAdmin')) {
    return null;
  }

  // Permitir acceso a rutas de admin, auth (login) y api
  // También permitimos login para que los admins puedan entrar
  if (!mounted) return null;
  
  const isExcludedPath = 
    pathname?.includes("/admin") || 
    pathname?.includes("/api") || 
    pathname?.includes("/auth") ||
    pathname?.includes("/login");

  if (isExcludedPath) {
    return null;
  }

  // Número y mensaje
  const phoneNumber = "5216241352986";
  const message = "Hola, veo que el sitio está en mantenimiento. Me gustaría hacer una reserva o consulta.";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white p-4 text-center">
      <div className="max-w-md space-y-8 animate-in fade-in duration-500">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Sitio en Mantenimiento</h1>
          <div className="w-16 h-1 bg-green-600 mx-auto rounded-full"></div>
        </div>
        
        <p className="text-lg text-gray-600 leading-relaxed">
          <strong>Disculpe las molestias.</strong>
        </p>
        
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <p className="text-lg font-semibold text-gray-800 mb-4">
            Lo podemos atender directo por WhatsApp:
          </p>
          
          <div className="flex justify-center">
            <Button asChild className="bg-[#25D366] hover:bg-[#128C7E] text-white px-8 py-6 text-xl rounded-full shadow-lg transition-all hover:scale-105">
              <Link href={whatsappUrl} target="_blank">
                <span className="mr-2">💬</span> Contactar por WhatsApp
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
