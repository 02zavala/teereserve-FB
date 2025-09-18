import { CourseForm } from "@/components/admin/CourseForm";
import { Locale } from "@/i18n-config";

export default async function NewCoursePage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    return (
        <div>
            <h1 className="text-3xl font-bold font-headline text-primary mb-6">Add a New Course</h1>
            <CourseForm lang={lang} />
        </div>
    );
}
