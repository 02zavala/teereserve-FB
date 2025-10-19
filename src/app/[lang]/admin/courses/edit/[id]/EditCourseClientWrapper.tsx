"use client";
import dynamic from "next/dynamic";

const EditCourseClient = dynamic(() => import("@/components/admin/EditCourseClient").then(m => m.EditCourseClient), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground">Cargando editor de curso...</div>
  ),
});

export default function EditCourseClientWrapper(props: { course: any; lang: string }) {
  return <EditCourseClient {...props} />;
}