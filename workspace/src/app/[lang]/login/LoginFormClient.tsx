"use client";
import dynamic from "next/dynamic";

const LoginForm = dynamic(() => import("@/components/auth/LoginForm"), {
  ssr: false,
  loading: () => (
    <div className="text-center text-muted-foreground">Cargando formulario...</div>
  ),
});

export default function LoginFormClient() {
  return <LoginForm />;
}