'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, DollarSign, Eye, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { PricingEngine } from '@/lib/pricing-engine';
import { TimeBand, PriceCalculationInput, PriceCalculationResult } from '@/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface PricingCalendarProps {
  courseId: string;
  courseName: string;
}

interface DayPricing {
  date: string;
  prices: {
    [timeBandId: string]: {
      pricePerPlayer: number;
      totalPrice: number;
      appliedRules: string[];
    };
  };
}

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const TIME_SLOTS = ['07:00', '09:00', '12:00', '15:00', '17:00'];

export function PricingCalendar({ courseId, courseName }: PricingCalendarProps) {
  const pricingEngine = new PricingEngine();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeBands, setTimeBands] = useState<TimeBand[]>([]);
  const [monthlyPricing, setMonthlyPricing] = useState<DayPricing[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState(2);
  const [selectedTimeBand, setSelectedTimeBand] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayPricing | null>(null);

  useEffect(() => {
    loadTimeBands();
  }, [courseId]);

  useEffect(() => {
    if (timeBands.length > 0) {
      calculateMonthlyPricing();
    }
  }, [currentDate, timeBands, selectedPlayers]);

  const loadTimeBands = () => {
    try {
      const bands = pricingEngine.getTimeBands(courseId);
      setTimeBands(bands);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al cargar las bandas horarias',
        variant: 'destructive'
      });
    }
  };

  const calculateMonthlyPricing = async () => {
    setIsLoading(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      const pricingPromises = daysInMonth.map(async (day) => {
        const dayPricing: DayPricing = {
          date: format(day, 'yyyy-MM-dd'),
          prices: {}
        };

        // Calcular precios para cada banda horaria
        for (const timeBand of timeBands) {
          if (!timeBand.active) continue;
          
          try {
            const input: PriceCalculationInput = {
              courseId,
              date: format(day, 'yyyy-MM-dd'),
              time: timeBand.startTime,
              players: selectedPlayers
            };
            
            const result = await pricingEngine.calculatePrice(input);
            
            dayPricing.prices[timeBand.id] = {
              pricePerPlayer: result.finalPricePerPlayer,
              totalPrice: result.totalPrice,
              appliedRules: result.appliedRules.map(rule => rule.ruleName)
            };
          } catch (error) {
            // Si hay error en el cálculo, usar precio base
            dayPricing.prices[timeBand.id] = {
              pricePerPlayer: 1500, // Precio base por defecto
              totalPrice: 1500 * selectedPlayers,
              appliedRules: ['Precio base']
            };
          }
        }
        
        return dayPricing;
      });

      const results = await Promise.all(pricingPromises);
      setMonthlyPricing(results);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al calcular los precios del mes',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriceForDay = (dayPricing: DayPricing, timeBandId?: string): number => {
    if (timeBandId && dayPricing.prices[timeBandId]) {
      return dayPricing.prices[timeBandId].pricePerPlayer;
    }
    
    // Si no se especifica banda horaria, devolver el precio promedio
    const prices = Object.values(dayPricing.prices);
    if (prices.length === 0) return 0;
    
    const avgPrice = prices.reduce((sum, price) => sum + price.pricePerPlayer, 0) / prices.length;
    return avgPrice;
  };

  const getPriceColor = (price: number): string => {
    if (price >= 2500) return 'bg-red-100 text-red-800';
    if (price >= 2000) return 'bg-orange-100 text-orange-800';
    if (price >= 1500) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Agregar días del mes anterior para completar la primera semana
  const startDay = getDay(monthStart);
  const paddingDays = Array.from({ length: startDay }, (_, i) => {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - (startDay - i));
    return date;
  });

  const allDays = [...paddingDays, ...daysInMonth];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando calendario de precios...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendario de Precios</h1>
          <p className="text-muted-foreground">{courseName}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Jugadores:</label>
            <Select value={selectedPlayers.toString()} onValueChange={(value) => setSelectedPlayers(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Banda:</label>
            <Select value={selectedTimeBand} onValueChange={setSelectedTimeBand}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {timeBands.map((band) => (
                  <SelectItem key={band.id} value={band.id}>
                    {band.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-100 rounded"></div>
                <span>$1,500-</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-100 rounded"></div>
                <span>$2,000-</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-100 rounded"></div>
                <span>$2,500-</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-100 rounded"></div>
                <span>$2,500+</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {/* Encabezados de días */}
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">
                {day}
              </div>
            ))}
            
            {/* Días del calendario */}
            {allDays.map((day, index) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayPricing = monthlyPricing.find(p => p.date === dayStr);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              
              const price = dayPricing ? getPriceForDay(dayPricing, selectedTimeBand === 'all' ? undefined : selectedTimeBand) : 0;
              
              return (
                <div
                  key={index}
                  className={`
                    p-2 min-h-[80px] border rounded-lg cursor-pointer transition-colors
                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${isCurrentDay ? 'ring-2 ring-primary' : ''}
                    hover:bg-gray-50
                  `}
                  onClick={() => {
                    if (dayPricing) {
                      setSelectedDay(dayPricing);
                      setDetailDialog(true);
                    }
                  }}
                >
                  <div className="flex flex-col h-full">
                    <div className={`text-sm font-medium ${
                      isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    
                    {isCurrentMonth && dayPricing && (
                      <div className="flex-1 flex flex-col justify-center items-center">
                        <div className={`text-xs px-2 py-1 rounded ${getPriceColor(price)}`}>
                          ${Math.round(price).toLocaleString()}
                        </div>
                        
                        {selectedTimeBand === 'all' && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {Object.keys(dayPricing.prices).length} bandas
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resumen de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Precio Mínimo</p>
                <p className="text-lg font-bold">
                  ${Math.min(...monthlyPricing.flatMap(day => 
                    Object.values(day.prices).map(p => p.pricePerPlayer)
                  )).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Precio Máximo</p>
                <p className="text-lg font-bold">
                  ${Math.max(...monthlyPricing.flatMap(day => 
                    Object.values(day.prices).map(p => p.pricePerPlayer)
                  )).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Precio Promedio</p>
                <p className="text-lg font-bold">
                  ${Math.round(
                    monthlyPricing.flatMap(day => 
                      Object.values(day.prices).map(p => p.pricePerPlayer)
                    ).reduce((sum, price) => sum + price, 0) / 
                    monthlyPricing.flatMap(day => Object.values(day.prices)).length
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Días con Precios</p>
                <p className="text-lg font-bold">
                  {monthlyPricing.filter(day => Object.keys(day.prices).length > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de detalles del día */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalles de Precios - {selectedDay && format(new Date(selectedDay.date), 'dd/MM/yyyy', { locale: es })}
            </DialogTitle>
            <DialogDescription>
              Precios por banda horaria para {selectedPlayers} jugador{selectedPlayers > 1 ? 'es' : ''}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDay && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banda Horaria</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Precio por Jugador</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Reglas Aplicadas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeBands.map((band) => {
                    const pricing = selectedDay.prices[band.id];
                    if (!pricing) return null;
                    
                    return (
                      <TableRow key={band.id}>
                        <TableCell className="font-medium">{band.label}</TableCell>
                        <TableCell>{band.startTime} - {band.endTime}</TableCell>
                        <TableCell>${pricing.pricePerPlayer.toLocaleString()}</TableCell>
                        <TableCell className="font-bold">${pricing.totalPrice.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {pricing.appliedRules.map((rule, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {rule}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}