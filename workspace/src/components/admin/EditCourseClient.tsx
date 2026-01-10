'use client';

import { useState } from 'react';
import { CourseForm } from '@/components/admin/CourseForm';
import { TeeTimeManager } from '@/components/admin/TeeTimeManager';
import { PricingManager } from '@/components/admin/PricingManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GolfCourse, Locale } from "@/types";

interface EditCourseClientProps {
    course: GolfCourse;
    lang: Locale;
}

export function EditCourseClient({ course, lang }: EditCourseClientProps) {

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline text-primary mb-2">Edit Course</h1>
                <p className="text-muted-foreground">Manage course details, images, and pricing.</p>
            </div>
            <CourseForm course={course} lang={lang} />
            
            <Tabs defaultValue="availability" className="border-t pt-8">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="availability">Availability</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing Rules</TabsTrigger>
                </TabsList>
                
                <TabsContent value="availability" className="mt-6">
                    <TeeTimeManager course={course} lang={lang} />
                </TabsContent>
                
                <TabsContent value="pricing" className="mt-6">
                    <PricingManager courseId={course.id} courseName={course.name} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
