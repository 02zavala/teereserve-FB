
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getCourses } from "@/lib/data";
import { MoreHorizontal, PlusCircle, Eye, EyeOff, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { DeleteCourseButton } from "./DeleteCourseButton";
import { ToggleCourseVisibilityButton } from "./ToggleCourseVisibilityButton";
import { ToggleFeaturedButton } from "./ToggleFeaturedButton";
import { Locale } from "@/i18n-config";
import { pricingEngine } from "@/lib/pricing-engine";


export default async function CoursesAdminPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const courses = await getCourses({ includeHidden: true });
    const { lang } = await params;
    
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                 <h1 className="text-3xl font-bold font-headline text-primary">Manage Courses</h1>
                 <Button asChild>
                    <Link href={`/${lang}/admin/courses/new`}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Course
                    </Link>
                 </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="hidden w-[100px] sm:table-cell">
                                    <span className="sr-only">Image</span>
                                </TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead className="hidden md:table-cell">Base Price</TableHead>
                                <TableHead className="hidden lg:table-cell">Visibility</TableHead>
                                <TableHead>
                                    <span className="sr-only">Actions</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {courses.map(course => (
                                <TableRow key={course.id}>
                                    <TableCell className="hidden sm:table-cell">
                                        <Image
                                            alt={course.name}
                                            className="aspect-square rounded-md object-cover"
                                            height="64"
                                            src={course.imageUrls[0]}
                                            width="64"
                                            data-ai-hint="golf course"
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {course.isFeatured && (
                                                <Star className="h-4 w-4 text-primary fill-primary" />
                                            )}
                                            {course.name}
                                            {course.hidden && (
                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{course.location}</TableCell>
                                    <TableCell className="hidden md:table-cell">${pricingEngine.getMinimumPrice(course.id)}</TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        <Badge variant={course.hidden ? "secondary" : "default"}>
                                            {course.hidden ? (
                                                <><EyeOff className="mr-1 h-3 w-3" />Hidden</>
                                            ) : (
                                                <><Eye className="mr-1 h-3 w-3" />Visible</>
                                            )}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                   <Link href={`/${lang}/admin/courses/edit/${course.id}`}>Edit</Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <ToggleFeaturedButton
                                                    courseId={course.id}
                                                    courseName={course.name}
                                                    isFeatured={course.isFeatured || false}
                                                />
                                                <ToggleCourseVisibilityButton 
                                                    courseId={course.id} 
                                                    courseName={course.name}
                                                    isHidden={course.hidden || false}
                                                />
                                                <DropdownMenuSeparator />
                                                <DeleteCourseButton courseId={course.id} courseName={course.name} />
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
