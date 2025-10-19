
import { getCourseBySlugOrId } from "@/lib/data";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n-config";
import EditCourseClientWrapper from "./EditCourseClientWrapper";

interface EditCoursePageProps {
    params: Promise<{
        id: string;
        lang: Locale;
    }>;
}

export default async function EditCoursePage({ params: paramsProp }: EditCoursePageProps) {
    const params = await paramsProp;
    const course = await getCourseBySlugOrId(params.id);

    if (!course) {
        notFound();
    }

    return <EditCourseClientWrapper course={course} lang={params.lang as unknown as string} />;
}
