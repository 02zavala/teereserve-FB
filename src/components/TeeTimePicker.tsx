
"use client"

import { useState, useEffect, useTransition } from "react"
import { format } from "date-fns"

import { Calendar as CalendarIcon, Users, Sun, Moon, Zap, Loader2, Send, MessageSquare, CheckCircle, Info, Star, ShieldCheck, Tag, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TeeTime } from "@/types"
import { cn } from "@/lib/utils"
import { getTeeTimesForCourse } from "@/lib/data"
import Link from "next/link"
import { Locale } from "@/i18n-config"
import { Skeleton } from "./ui/skeleton"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"
import { Separator } from "./ui/separator"
import { dateLocales, getDefaultBookingDate } from "@/lib/date-utils"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { gtagEvent } from "@/lib/ga"

interface TeeTimePickerProps {
    courseId: string
    basePrice: number,
    teeTimeInterval?: number,
    operatingHours?: {
        openingTime: string;
        closingTime: string;
    },
    availableHoles?: number[],
    holeDetails?: {
        holes9?: { yards?: number; par?: number };
        holes18?: { yards?: number; par?: number };
        holes27?: { yards?: number; par?: number };
    },
    lang: Locale,
}

const TAX_RATE = 0.16; // 16%

export function TeeTimePicker({ courseId, basePrice, teeTimeInterval, operatingHours, availableHoles = [18], holeDetails, lang }: TeeTimePickerProps) {
    const [date, setDate] = useState<Date | undefined>();
    const [players, setPlayers] = useState<number>(2)
    const [holes, setHoles] = useState<number>(availableHoles[0] || 18)
    const [teeTimes, setTeeTimes] = useState<TeeTime[]>([]);
    const [isPending, startTransition] = useTransition();
    const [isClient, setIsClient] = useState(false);
    const [selectedTeeTime, setSelectedTeeTime] = useState<TeeTime | null>(null);
    const [comments, setComments] = useState("");
    const [isGroupBooking, setIsGroupBooking] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const router = useRouter();
    const { user } = useAuth();


    useEffect(() => {
        setIsClient(true);
        // Set date only on the client side to prevent hydration errors.
        if (!date) {
            // Ajustar hora de corte según horario de operación del campo (cierre)
            let cutoffHour = 16;
            const closing = operatingHours?.closingTime;
            if (closing) {
                const match = closing.match(/^(\d{1,2}):(\d{2})/);
                if (match) {
                    const h = parseInt(match[1], 10);
                    // Usamos la hora de cierre como hora de corte
                    if (!isNaN(h)) cutoffHour = h;
                }
            }
            setDate(getDefaultBookingDate(cutoffHour));
        }
    }, [operatingHours]);

    useEffect(() => {
        if (!date || isGroupBooking) return;
        setSelectedTeeTime(null); 
        startTransition(async () => {
            const fetchedTeeTimes = await getTeeTimesForCourse(
                courseId, 
                date, 
                basePrice,
                // Remove extra arguments to match the expected 3 parameters
            );
            setTeeTimes(fetchedTeeTimes);
        });
    }, [courseId, date, basePrice, teeTimeInterval, operatingHours, isGroupBooking]);
    
    const handlePlayersChange = (value: string) => {
        if (value === 'group') {
            setIsGroupBooking(true);
            setSelectedTeeTime(null);
        } else {
            setIsGroupBooking(false);
            setPlayers(parseInt(value));
        }
    }

    const handleDateSelect = (selectedDate: Date | undefined) => {
        setDate(selectedDate);
        setIsCalendarOpen(false); // Cerrar el calendario automáticamente
    }
    
    const availableTimes = teeTimes.filter(t => {
        const availableSpots = t.availableSpots ?? (t.maxPlayers ?? 4);
        return (t.status === 'available' || t.status === 'partial') && availableSpots >= players;
    });
    
    // Calculate price based on holes selected
    const getHoleMultiplier = (holes: number) => {
        switch (holes) {
            case 9: return 0.6; // 60% of 18-hole price
            case 27: return 1.4; // 140% of 18-hole price
            default: return 1; // 18 holes = 100%
        }
    };
    
    const subtotal = selectedTeeTime ? selectedTeeTime.price * players * getHoleMultiplier(holes) : 0;
    const taxes = subtotal * TAX_RATE;
    const totalPrice = subtotal + taxes;

    const bookingUrl = selectedTeeTime && date
    ? (() => {
        const params = `courseId=${courseId}&date=${format(date, 'yyyy-MM-dd')}&time=${selectedTeeTime.time}&players=${players}&holes=${holes}&price=${subtotal.toFixed(2)}&teeTimeId=${selectedTeeTime.id}&comments=${encodeURIComponent(comments)}`;
        
        // Construir URL de reserva - todos van a book/confirm
        const bookingUrl = `/${lang}/book/confirm?${params}`;

        console.log('🔄 Redirection logic:', {
          hasUser: !!user,
          isAnonymous: user?.isAnonymous,
          redirectTo: bookingUrl
        });
        
        return bookingUrl;
    })()
    : '#';

    if (!isClient) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl text-primary">Book a Tee Time</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card id="booking-form">
            <CardHeader>
                <CardTitle className="font-headline text-2xl text-primary">Book a Tee Time</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Date, Players, Times */}
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground flex items-center"><CalendarIcon className="mr-2 h-4 w-4" /> Date</label>
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                    disabled={isGroupBooking}
                                    >
                                    {date ? format(date, "PPP", { locale: dateLocales[lang] }) : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={handleDateSelect}
                                        initialFocus
                                        disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                                        locale={dateLocales[lang]}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground flex items-center"><Users className="mr-2 h-4 w-4" /> Players</label>
                            <Select onValueChange={handlePlayersChange} defaultValue={players.toString()}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select players" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 4 }, (_, i) => i + 1).map(p => <SelectItem key={p} value={p.toString()}>{p} Player{p > 1 ? 's' : ''}</SelectItem>)}
                                    <SelectItem value="group">5+ Players (Groups)</SelectItem>
                                </SelectContent>
                            </Select>
                            {players > 4 && !isGroupBooking && (
                                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-2 rounded-md text-xs flex items-start gap-2">
                                    <Info className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">Máximo 4 jugadores por tee time</p>
                                        <p>Para más de 4 jugadores, selecciona "5+ Players (Groups)" o reserva múltiples tee times.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {availableHoles.length > 1 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground flex items-center"><Flag className="mr-2 h-4 w-4" /> Holes</label>
                                <Select onValueChange={(value) => setHoles(parseInt(value))} defaultValue={holes.toString()}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select holes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableHoles.map(h => {
                                            const holeKey = `holes${h}` as keyof typeof holeDetails;
                                            const details = holeDetails?.[holeKey] as { yards?: number; par?: number } | undefined;
                                            return (
                                                <SelectItem key={h} value={h.toString()}>
                                                    {h} Holes
                                                    {details && (
                                                        <span className="text-xs text-muted-foreground ml-2">
({details && details.yards ? `${details.yards} yds, ` : ''}Par {details && details.par ? details.par : (h === 9 ? 36 : h === 18 ? 72 : 108)})
                                                        </span>
                                                    )}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {isGroupBooking ? (
                        <div className="bg-primary/10 border-l-4 border-primary text-primary-foreground p-3 rounded-md text-sm flex items-start gap-3">
                            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-foreground">For groups or mini-tournaments</p>
                                <p className="text-muted-foreground">Please contact us directly at <a href="mailto:info@teereserve.golf" className="font-semibold text-primary underline">info@teereserve.golf</a></p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h4 className="font-medium mb-2 text-center text-muted-foreground">Select a Tee Time</h4>
                            {isPending ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : availableTimes.length > 0 ? (
                                selectedTeeTime ? (
                                    // Compressed view - show only selected time with expand option
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button 
                                                variant="default"
                                                className="flex flex-col h-auto min-w-[100px]"
                                            >
                                                <span className="font-semibold text-base">{selectedTeeTime.time}</span>
                                            </Button>
                                            <Button 
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedTeeTime(null)}
                                                className="text-xs text-muted-foreground hover:text-foreground"
                                            >
                                                Ver otros horarios
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    // Expanded view - show all available times
                                    <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-2">
                                        {availableTimes.map(teeTime => {
                                            const availableSpots = teeTime.availableSpots ?? (teeTime.maxPlayers ?? 4);
                                            const canBook = (teeTime.status === 'available' || teeTime.status === 'partial') && availableSpots >= players;
                                            const isPartial = teeTime.status === 'partial';
                                            
                                            return (
                                                <Button 
                                                    key={teeTime.id} 
                                                    variant={canBook ? (isPartial ? 'default' : 'outline') : 'secondary'}
                                                    className={cn(
                                                        "flex flex-col h-auto relative",
                                                        isPartial && canBook && "border-orange-300 bg-orange-50 hover:bg-orange-100",
                                                        !canBook && "opacity-50"
                                                    )}
                                                    disabled={!canBook}
                                                    onClick={() => {
                                                        setSelectedTeeTime(teeTime);
                                                        const subtotal = teeTime.price * players * getHoleMultiplier(holes);
                                                        if (process.env.NODE_ENV !== 'production') {
                                                          console.log('[TEE TIME] selectedTeeTime.price', { teeTimeId: teeTime.id, price: teeTime.price });
                                                          console.log('[CHECKOUT] subtotalFromTeeTime', { subtotal, players, holes });
                                                        }
                                                        gtagEvent('select_item', {
                                                            currency: 'USD',
                                                            value: subtotal,
                                                            items: [
                                                                {
                                                                    item_id: teeTime.id,
                                                                    item_name: `${courseId}-${teeTime.time}`,
                                                                    item_category: 'tee_time',
                                                                    price: teeTime.price,
                                                                    quantity: players,
                                                                },
                                                            ],
                                                        });
                                                    }}
                                                >
                                                    <span className="font-semibold text-base">{teeTime.time}</span>
                                                    {isPartial && (
                                                        <span className="text-xs text-orange-600 font-medium">
                                                            {availableSpots} spots left
                                                        </span>
                                                    )}
                                                </Button>
                                            )
                                        })}
                                    </div>
                                )
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No available tee times for this selection.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Booking Summary */}
                <div className={cn("space-y-4 border rounded-lg p-4 bg-card", !selectedTeeTime && "flex items-center justify-center text-center")}>
                   {selectedTeeTime && !isGroupBooking ? (
                    <>
                        <div className="bg-primary/10 border border-primary/20 rounded-md p-3 text-center">
                            <p className="font-bold text-primary">{date ? format(date, 'eeee, dd MMMM yyyy', { locale: dateLocales[lang] }) : ''}</p>
                            <Separator className="my-2 bg-primary/20" />
                            <p className="font-bold text-primary">{selectedTeeTime.time}</p>
                            <p className="text-sm text-primary/90">{players} Players ({holes} Holes)</p>
                        </div>
                        
                        <div className="text-sm space-y-1">
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium">{subtotal.toFixed(2)} USD</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Taxes (16%)</span>
                                <span className="font-medium">{taxes.toFixed(2)} USD</span>
                            </div>
                        </div>

                        <Separator />
                        
                        <div>
                             <h5 className="font-semibold text-xs text-muted-foreground mb-2 flex items-center"><Info className="mr-1.5 h-3 w-3"/>RATE INCLUDES / NOTES</h5>
                             <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                                <li>18 Holes of Golf</li>
                                <li>Shared Golf Cart</li>
                                <li>Access to Practice Facilities</li>
                                <li>All Applicable Taxes</li>
                                <li>Free Cancellation (up to 24h before)</li>
                             </ul>
                        </div>
                        
                         <div className="space-y-2">
                            <Label htmlFor="comments" className="text-xs text-muted-foreground flex items-center">
                                <MessageSquare className="mr-1.5 h-3 w-3"/>
                                Additional Comments (Optional)
                            </Label>
                            <Textarea
                                id="comments"
                                placeholder="e.g., Club rental needed, person with a disability, etc."
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                className="text-xs min-h-[60px]"
                            />
                        </div>
                        
                        <Button asChild size="lg" className="w-full font-bold text-base h-12">
                             <Link href={bookingUrl} className="flex justify-between items-center">
                                <span>Book Now</span>
                                <span className="bg-primary-foreground/20 px-3 py-1 rounded-md text-sm font-bold text-primary">${totalPrice.toFixed(2)}</span>
                            </Link>
                        </Button>
                        
                        <div className="flex justify-around items-center text-center text-xs text-muted-foreground pt-2">
                             <div className="flex flex-col items-center gap-1">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span>Instant Booking</span>
                            </div>
                             <div className="flex flex-col items-center gap-1">
                                <Star className="h-5 w-5 text-yellow-500" />
                                <span>Trusted Platform</span>
                            </div>
                             <div className="flex flex-col items-center gap-1">
                                <ShieldCheck className="h-5 w-5 text-blue-500" />
                                <span>Secure Payment</span>
                            </div>
                        </div>

                    </>
                   ) : (
                       <div className="text-muted-foreground p-8">
                         <p className="font-semibold">{isGroupBooking ? "Group Booking Inquiry" : "Your booking summary will appear here."}</p>
                         <p className="text-sm">{isGroupBooking ? "Please use the contact information provided." : "Please select an available tee time to continue."}</p>
                          {isGroupBooking && (
                            <Button className="w-full mt-4" onClick={() => router.push(`/${lang}/contact`)}>
                                <Send className="mr-2 h-4 w-4" />
                                Contact Us
                            </Button>
                          )}
                       </div>
                   )}
                </div>
            </CardContent>
        </Card>
    )
}

export default TeeTimePicker;
