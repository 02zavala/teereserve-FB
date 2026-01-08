"use client";
import dynamic from "next/dynamic";

const RegistrationForm = dynamic(() => import("@/components/auth/RegistrationForm"), {
  ssr: false,
  loading: () => (
    <div className="text-center text-muted-foreground">Cargando formulario de registro...</div>
  ),
});

export default function RegistrationFormClient() {
  return <RegistrationForm />;
}