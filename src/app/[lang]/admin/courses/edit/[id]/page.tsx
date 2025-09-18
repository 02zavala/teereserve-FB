
import { getCourseById } from "@/lib/data";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n-config";
import { EditCourseClient } from "@/components/admin/EditCourseClient";

interface EditCoursePageProps {
    params: Promise<{
        id: string;
        lang: Locale;
    }>;
}

export default async function EditCoursePage({ params: paramsProp }: EditCoursePageProps) {
    const params = await paramsProp;
    const course = await getCourseById(params.id);

    if (!course) {
        notFound();
    }

    return <EditCourseClient course={course} lang={params.lang} />;
}
