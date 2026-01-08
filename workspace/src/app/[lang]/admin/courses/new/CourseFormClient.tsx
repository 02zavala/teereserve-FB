"use client";
import dynamic from "next/dynamic";
import { Locale } from "@/i18n-config";

const CourseForm = dynamic(() => import("@/components/admin/CourseForm").then(m => m.CourseForm), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground">Cargando formulario de curso...</div>
  ),
});

export default function CourseFormClient(props: { lang: Locale }) {
  return <CourseForm {...props} />;
}
