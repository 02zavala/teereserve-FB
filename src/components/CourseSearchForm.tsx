
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useRouter, usePathname } from "next/navigation"
import { format } from "date-fns"
import { MapPin, Calendar as CalendarIcon, Users, Clock, Send, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getCourseLocations } from "@/lib/data"
import { useEffect, useState } from "react"
import { getDictionary } from "@/lib/get-dictionary"
import type { Locale } from "@/i18n-config"
import { dateLocales } from "@/lib/date-utils";


const formSchema = z.object({
  location: z.string().min(1, "Location is required"),
  date: z.date({
    required_error: "A date is required.",
  }),
  players: z.string().min(1, "Number of players is required"),
  time: z.string().optional(),
})

interface CourseSearchFormProps {
    dictionary: Awaited<ReturnType<typeof getDictionary>>['courseSearch'];
}


export function CourseSearchForm({ dictionary }: CourseSearchFormProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [locations, setLocations] = useState<string[]>([]);
    const [isGroupBooking, setIsGroupBooking] = useState(false);
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
        setIsClient(true);
        getCourseLocations().then(setLocations);
    }, []);

    const lang = (pathname?.split('/')[1] || 'en') as Locale;


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            location: "all",
            players: "2",
            time: "any",
        },
    })
    
    useEffect(() => {
        // Set default date only on the client to avoid hydration mismatch
        if (isClient) {
            form.setValue('date', new Date());
        }
    }, [isClient, form]);


    function onSubmit(values: z.infer<typeof formSchema>) {
        if(isGroupBooking) {
            router.push(`/${lang}/contact`);
            return;
        }

        const params = new URLSearchParams({
            location: values.location,
            date: format(values.date, "yyyy-MM-dd"),
            players: values.players,
        });
        if (values.time) {
            params.set("time", values.time)
        }
        router.push(`/${lang}/courses?${params.toString()}`)
    }
    
    const handlePlayersChange = (value: string) => {
        if (value === 'group') {
            setIsGroupBooking(true);
        } else {
            setIsGroupBooking(false);
        }
        form.setValue('players', value);
    }

    return (
        <Card className="bg-card/90 backdrop-blur-sm border-border/60 shadow-lg">
            <CardContent className="p-4 md:p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 lg:items-end">
                            <FormField
                                control={form.control}
                                name="location"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center text-xs text-muted-foreground">
                                            <MapPin className="mr-1 h-3 w-3" /> {dictionary.location}
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isGroupBooking}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a location" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="all">{dictionary.allLocations}</SelectItem>
                                                {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center text-xs text-muted-foreground">
                                            <CalendarIcon className="mr-1 h-3 w-3" /> {dictionary.date}
                                        </FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                disabled={isGroupBooking || !isClient}
                                                >
                                                {field.value && isClient ? (
                                                    format(field.value, "PPP", { locale: dateLocales[lang] })
                                                ) : (
                                                    <span>{dictionary.pickDate}</span>
                                                )}
                                                </Button>
                                            </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                    date < new Date(new Date().setHours(0,0,0,0)) || isGroupBooking
                                                    }
                                                    initialFocus
                                                    locale={dateLocales[lang]}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="players"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center text-xs text-muted-foreground">
                                            <Users className="mr-1 h-3 w-3" /> {dictionary.players}
                                        </FormLabel>
                                        <Select onValueChange={handlePlayersChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select players" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Array.from({ length: 4 }, (_, i) => i + 1).map(p => <SelectItem key={p} value={p.toString()}>{p} {p > 1 ? dictionary.multiplePlayers : dictionary.onePlayer}</SelectItem>)}
                                                <SelectItem value="group">{dictionary.groupBooking}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="time"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center text-xs text-muted-foreground">
                                            <Clock className="mr-1 h-3 w-3" /> {dictionary.time}
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isGroupBooking}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Any time" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="any">{dictionary.anyTime}</SelectItem>
                                                <SelectItem value="afternoon">{dictionary.afternoon}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="lg:col-span-1">
                                <Button type="submit" className="w-full text-base font-bold h-10">
                                    {isGroupBooking ? <Send className="mr-2 h-4 w-4" /> : null}
                                    {isGroupBooking ? dictionary.contactUs : dictionary.search}
                                </Button>
                            </div>
                        </div>
                        {isGroupBooking && (
                             <div className="bg-primary/10 border-l-4 border-primary text-primary-foreground p-3 rounded-md text-sm flex items-start gap-3">
                                <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-foreground">For groups or mini-tournaments</p>
                                    <p className="text-muted-foreground">Please contact us directly at <a href="mailto:info@teereserve.golf" className="font-semibold text-primary underline">info@teereserve.golf</a></p>
                                </div>
                            </div>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
