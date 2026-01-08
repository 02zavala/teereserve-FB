
"use client";

import { useState, useEffect, useTransition } from 'react';
import { format, startOfDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { GolfCourse, TeeTime } from '@/types';
import { getTeeTimesForCourse, updateTeeTimesForCourse } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import type { Locale } from '@/i18n-config';
import { dateLocales } from '@/lib/date-utils';

interface TeeTimeManagerProps {
    course: GolfCourse;
    lang: Locale;
}

export function TeeTimeManager({ course, lang }: TeeTimeManagerProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [teeTimes, setTeeTimes] = useState<TeeTime[]>([]);
    const [isFetching, startFetching] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const [isClient, setIsClient] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
      setIsClient(true);
      setSelectedDate(startOfDay(new Date()));
    }, []);

    useEffect(() => {
        if (!selectedDate) return;
        startFetching(async () => {
            const times = await getTeeTimesForCourse(
                course.id, 
                selectedDate, 
                course.basePrice
            );
            setTeeTimes(times);
        });
    }, [selectedDate, course.id, course.basePrice]);
    
    const handleTeeTimeChange = (id: string, field: 'price' | 'status', value: string | number) => {
        setTeeTimes(currentTimes =>
            currentTimes.map(tt => 
                tt.id === id ? { ...tt, [field]: value } : tt
            )
        );
    };

    const handleSave = () => {
        if (!selectedDate) return;
        startSaving(async () => {
            try {
                await updateTeeTimesForCourse(course.id, selectedDate, teeTimes);
                toast({
                    title: "Availability Saved",
                    description: `Tee times for ${format(selectedDate, "PPP")} have been updated.`,
                });
            } catch (error) {
                console.error("Failed to save tee times:", error);
                toast({
                    title: "Error",
                    description: "Could not save tee times. Please try again.",
                    variant: "destructive",
                });
            }
        });
    };

    const getStatusVariant = (status: TeeTime['status']) => {
        switch (status) {
            case 'available': return 'default';
            case 'booked': return 'destructive';
            case 'blocked': return 'secondary';
            default: return 'outline';
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <Card>
                    <CardContent className="p-2">
                         <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(startOfDay(date))}
                            disabled={(date) => date < startOfDay(new Date())}
                            className="w-full"
                            locale={dateLocales[lang]}
                        />
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="text-lg font-medium mb-4">
                            Tee Times for <span className="text-primary">{isClient && selectedDate ? format(selectedDate, "PPP", { locale: dateLocales[lang] }) : '...'}</span>
                        </h3>
                        {isFetching ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="max-h-[500px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">Time</TableHead>
                                            <TableHead>Price ($)</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {teeTimes.map((teeTime) => (
                                            <TableRow key={teeTime.id}>
                                                <TableCell className="font-medium">{teeTime.time}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={teeTime.price || ''}
                                                        onChange={(e) => handleTeeTimeChange(teeTime.id, 'price', parseInt(e.target.value))}
                                                        className="h-8 w-24"
                                                        disabled={isSaving}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                     <Select
                                                        value={teeTime.status || 'available'}
                                                        onValueChange={(value: TeeTime['status']) => handleTeeTimeChange(teeTime.id, 'status', value)}
                                                        disabled={isSaving}
                                                     >
                                                        <SelectTrigger className="h-8 w-32">
                                                            <SelectValue>
                                                                <Badge variant={getStatusVariant(teeTime.status)} className="capitalize">{teeTime.status}</Badge>
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="available">Available</SelectItem>
                                                            <SelectItem value="booked">Booked</SelectItem>
                                                            <SelectItem value="blocked">Blocked</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        <div className="mt-6 flex justify-end">
                            <Button onClick={handleSave} disabled={isSaving || isFetching}>
                                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
