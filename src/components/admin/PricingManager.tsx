'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, DollarSign, Settings, Plus, Edit, Trash2, Calculator, Download, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { PricingEngine } from '@/lib/pricing-engine';
import { Season, TimeBand, PriceRule, PriceRuleType, PriceCalculationInput, PriceCalculationResult, SpecialOverride } from '@/types';
import { format, parseISO } from 'date-fns';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ValidationError } from '@/lib/error-handling';
import { useAuth } from '@/context/AuthContext';

interface PricingManagerProps {
  courseId: string;
  courseName: string;
}

// Helper function to convert day names to numbers (0=Sunday, 1=Monday, etc.)
const getDayOfWeekNumber = (day: string): number => {
  const dayMap: { [key: string]: number } = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };
  return dayMap[day] ?? 1; // Default to Monday if not found
};

export function PricingManager({ courseId, courseName }: PricingManagerProps) {
  const { user } = useAuth();
  const pricingEngine = new PricingEngine();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [timeBands, setTimeBands] = useState<TimeBand[]>([]);
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [specialOverrides, setSpecialOverrides] = useState<SpecialOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Estados para diálogos
  const [seasonDialog, setSeasonDialog] = useState(false);
  const [timeBandDialog, setTimeBandDialog] = useState(false);
  const [priceRuleDialog, setPriceRuleDialog] = useState(false);
  const [calculatorDialog, setCalculatorDialog] = useState(false);
  
  // Estados para formularios
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [editingTimeBand, setEditingTimeBand] = useState<TimeBand | null>(null);
  const [editingPriceRule, setEditingPriceRule] = useState<PriceRule | null>(null);
  
  // Estados para el formulario de banda horaria
  const [timeBandForm, setTimeBandForm] = useState({
    label: '',
    startTime: '',
    endTime: '',
    active: true
  });
  
  // Estados para el formulario de temporada
  const [seasonForm, setSeasonForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    priority: 50,
    active: true
  });
  
  // Estados para configuración rápida de precios
  const [quickPricingDialog, setQuickPricingDialog] = useState(false);
  const [quickPricing, setQuickPricing] = useState({
    basePrice: 295,
    applicationType: 'timeBands', // 'timeBands', 'daily', 'weekly', 'monthly'
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 30 días después
    timeBands: [
      { startTime: '07:00', endTime: '11:00', price: 295, label: 'Early Morning' },
      { startTime: '11:00', endTime: '13:00', price: 235, label: 'Mid Morning' },
      { startTime: '13:00', endTime: '16:00', price: 195, label: 'Afternoon' }
    ],
    dailyPrice: 295,
    weeklyPrices: {
      monday: 295,
      tuesday: 295,
      wednesday: 235,
      thursday: 235,
      friday: 295,
      saturday: 350,
      sunday: 350
    },
    monthlyPrice: 295
  });
  
  // Estado para calculadora de precios
  const [priceCalculation, setPriceCalculation] = useState<PriceCalculationResult | null>(null);
  const [calculationInput, setCalculationInput] = useState<PriceCalculationInput>({
    courseId,
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    players: 2
  });

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Set auth token if user is available
      if (user) {
        const token = await user.getIdToken();
        pricingEngine.setAuthToken(token);
        
        // Try to load from Firestore first
        const loaded = await pricingEngine.loadPricingData(courseId);
        if (!loaded) {
          console.warn('Failed to load from Firestore, using default data');
        }
      }
      
      // Load data into state (either from Firestore or default)
      setSeasons(pricingEngine.getSeasons(courseId));
      setTimeBands(pricingEngine.getTimeBands(courseId));
      setPriceRules(pricingEngine.getPriceRules(courseId));
      setSpecialOverrides(pricingEngine.getSpecialOverrides(courseId));
    } catch (error) {
      console.error('Error loading pricing data:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los datos de precios',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const { handleAsyncError } = useErrorHandler();

  const handleSeasonSubmit = (formData: FormData) => {
    handleAsyncError(async () => {
      const name = formData.get('name') as string;
      const startDate = formData.get('startDate') as string;
      const endDate = formData.get('endDate') as string;
      const priority = formData.get('priority') as string;

      // Validación de datos
      if (!name || name.trim().length < 3) {
        throw new ValidationError('El nombre de la temporada debe tener al menos 3 caracteres');
      }

      if (!startDate || isNaN(new Date(startDate).getTime())) {
        throw new ValidationError('La fecha de inicio no es válida');
      }

      if (!endDate || isNaN(new Date(endDate).getTime())) {
        throw new ValidationError('La fecha de fin no es válida');
      }

      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      
      if (endDateTime <= startDateTime) {
        throw new ValidationError('La fecha de fin debe ser posterior a la fecha de inicio');
      }

      const priorityNum = parseInt(priority);
      if (isNaN(priorityNum) || priorityNum < 1 || priorityNum > 100) {
        throw new ValidationError('La prioridad debe ser un número entre 1 y 100');
      }

      const seasonData = {
        courseId,
        name,
        startDate,
        endDate,
        priority: priorityNum,
        active: formData.get('active') === 'on'
      };

      console.log('Guardando temporada:', seasonData);

      if (editingSeason) {
        await pricingEngine.updateSeasonWithPersistence(editingSeason.id, seasonData);
        toast({ title: 'Éxito', description: 'Temporada actualizada correctamente' });
      } else {
        await pricingEngine.addSeasonWithPersistence(seasonData);
        toast({ title: 'Éxito', description: 'Temporada creada correctamente' });
      }
      
      loadData();
      setSeasonDialog(false);
      setEditingSeason(null);
      setSeasonForm({
        name: '',
        startDate: '',
        endDate: '',
        priority: 50,
        active: true
      });
    }, { defaultMessage: 'Error al guardar la temporada' });
  };

  const handleTimeBandSubmit = (formData: FormData) => {
    handleAsyncError(async () => {
      const label = formData.get('label') as string;
      const startTime = formData.get('startTime') as string;
      const endTime = formData.get('endTime') as string;

      // Validación de datos
      if (!label || label.trim().length < 3) {
        throw new ValidationError('La etiqueta de la banda horaria debe tener al menos 3 caracteres');
      }

      if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) {
        throw new ValidationError('La hora de inicio no es válida (formato HH:MM)');
      }

      if (!endTime || !/^\d{2}:\d{2}$/.test(endTime)) {
        throw new ValidationError('La hora de fin no es válida (formato HH:MM)');
      }

      // Validar que la hora de fin sea posterior a la de inicio
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (endMinutes <= startMinutes) {
        throw new ValidationError('La hora de fin debe ser posterior a la hora de inicio');
      }

      const timeBandData = {
        courseId,
        label,
        startTime,
        endTime,
        active: formData.get('active') === 'on'
      };

      console.log('Guardando banda horaria:', timeBandData);

      if (editingTimeBand) {
        await pricingEngine.updateTimeBandWithPersistence(editingTimeBand.id, timeBandData);
        toast({ title: 'Éxito', description: 'Banda horaria actualizada correctamente' });
      } else {
        await pricingEngine.addTimeBandWithPersistence(timeBandData);
        toast({ title: 'Éxito', description: 'Banda horaria creada correctamente' });
      }
      
      loadData();
      setTimeBandDialog(false);
      setEditingTimeBand(null);
      setTimeBandForm({
        label: '',
        startTime: '',
        endTime: '',
        active: true
      });
    }, { defaultMessage: 'Error al guardar la banda horaria' });
  };

  const handlePriceRuleSubmit = (formData: FormData) => {
    handleAsyncError(async () => {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const priceType = formData.get('priceType') as PriceRuleType;
      const priceValue = formData.get('priceValue') as string;
      const priority = formData.get('priority') as string;
      const leadTimeMin = formData.get('leadTimeMin') as string;
      const leadTimeMax = formData.get('leadTimeMax') as string;
      const playersMin = formData.get('playersMin') as string;
      const playersMax = formData.get('playersMax') as string;
      const minPrice = formData.get('minPrice') as string;
      const maxPrice = formData.get('maxPrice') as string;

      // Validación de datos obligatorios
      if (!name || name.trim().length < 3) {
        throw new ValidationError('El nombre de la regla debe tener al menos 3 caracteres');
      }

      if (!priceType || !['fixed', 'delta', 'multiplier'].includes(priceType)) {
        throw new ValidationError('Debe seleccionar un tipo de precio válido');
      }

      const priceValueNum = parseFloat(priceValue);
      if (isNaN(priceValueNum) || priceValueNum <= 0) {
        throw new ValidationError('El valor del precio debe ser un número positivo');
      }

      // Validación específica por tipo de precio
      if (priceType === 'delta' && Math.abs(priceValueNum) > 10000) {
        throw new ValidationError('El valor delta no puede ser mayor a 10000');
      }

      if (priceType === 'multiplier' && (priceValueNum < 0.1 || priceValueNum > 10)) {
        throw new ValidationError('El multiplicador debe estar entre 0.1 y 10');
      }

      const priorityNum = parseInt(priority);
      if (isNaN(priorityNum) || priorityNum < 1 || priorityNum > 100) {
        throw new ValidationError('La prioridad debe ser un número entre 1 y 100');
      }

      // Validación de rangos opcionales
      let leadTimeMinNum, leadTimeMaxNum, playersMinNum, playersMaxNum;
      let minPriceNum, maxPriceNum;

      if (leadTimeMin) {
        leadTimeMinNum = parseInt(leadTimeMin);
        if (isNaN(leadTimeMinNum) || leadTimeMinNum < 0) {
          throw new ValidationError('El tiempo mínimo de anticipación debe ser un número positivo');
        }
      }

      if (leadTimeMax) {
        leadTimeMaxNum = parseInt(leadTimeMax);
        if (isNaN(leadTimeMaxNum) || leadTimeMaxNum < 0) {
          throw new ValidationError('El tiempo máximo de anticipación debe ser un número positivo');
        }
        if (leadTimeMinNum && leadTimeMaxNum <= leadTimeMinNum) {
          throw new ValidationError('El tiempo máximo debe ser mayor al tiempo mínimo');
        }
      }

      if (playersMin) {
        playersMinNum = parseInt(playersMin);
        if (isNaN(playersMinNum) || playersMinNum < 1 || playersMinNum > 8) {
          throw new ValidationError('El número mínimo de jugadores debe estar entre 1 y 8');
        }
      }

      if (playersMax) {
        playersMaxNum = parseInt(playersMax);
        if (isNaN(playersMaxNum) || playersMaxNum < 1 || playersMaxNum > 8) {
          throw new ValidationError('El número máximo de jugadores debe estar entre 1 y 8');
        }
        if (playersMinNum && playersMaxNum < playersMinNum) {
          throw new ValidationError('El número máximo de jugadores debe ser mayor o igual al mínimo');
        }
      }

      if (minPrice) {
        minPriceNum = parseFloat(minPrice);
        if (isNaN(minPriceNum) || minPriceNum < 0) {
          throw new ValidationError('El precio mínimo debe ser un número positivo');
        }
      }

      if (maxPrice) {
        maxPriceNum = parseFloat(maxPrice);
        if (isNaN(maxPriceNum) || maxPriceNum < 0) {
          throw new ValidationError('El precio máximo debe ser un número positivo');
        }
        if (minPriceNum && maxPriceNum <= minPriceNum) {
          throw new ValidationError('El precio máximo debe ser mayor al precio mínimo');
        }
      }

      const priceRuleData = {
        courseId,
        name,
        description,
        seasonId: formData.get('seasonId') as string || undefined,
        timeBandId: formData.get('timeBandId') as string || undefined,
        dow: formData.get('dow') ? (formData.get('dow') as string).split(',').map(Number) : undefined,
        leadTimeMin: leadTimeMinNum,
        leadTimeMax: leadTimeMaxNum,
        occupancyMin: formData.get('occupancyMin') ? parseInt(formData.get('occupancyMin') as string) : undefined,
        occupancyMax: formData.get('occupancyMax') ? parseInt(formData.get('occupancyMax') as string) : undefined,
        playersMin: playersMinNum,
        playersMax: playersMaxNum,
        priceType,
        priceValue: priceValueNum,
        priority: priorityNum,
        active: formData.get('active') === 'on',
        minPrice: minPriceNum,
        maxPrice: maxPriceNum,
        roundTo: formData.get('roundTo') ? parseInt(formData.get('roundTo') as string) : undefined
      };

      console.log('Guardando regla de precio:', priceRuleData);

      if (editingPriceRule) {
        await pricingEngine.updatePriceRuleWithPersistence(editingPriceRule.id, priceRuleData);
        toast({ title: 'Éxito', description: 'Regla de precio actualizada correctamente' });
      } else {
        await pricingEngine.addPriceRuleWithPersistence(priceRuleData);
        toast({ title: 'Éxito', description: 'Regla de precio creada correctamente' });
      }
      
      loadData();
      setPriceRuleDialog(false);
      setEditingPriceRule(null);
    }, { defaultMessage: 'Error al guardar la regla de precio' });
  };

  const handleCalculatePrice = async () => {
    handleAsyncError(async () => {
      // Validación de entrada para el cálculo de precios
      if (!calculationInput.courseId) {
        throw new ValidationError('Debe seleccionar un campo de golf');
      }

      if (!calculationInput.date || !calculationInput.time) {
        throw new ValidationError('Debe especificar una fecha y hora');
      }

      if (!calculationInput.players || calculationInput.players < 1 || calculationInput.players > 8) {
        throw new ValidationError('El número de jugadores debe estar entre 1 y 8');
      }

      const teeDate = new Date(`${calculationInput.date}T${calculationInput.time}:00`);
      const now = new Date();
      
      if (teeDate <= now) {
        throw new ValidationError('La fecha y hora del tee time debe ser futura');
      }

      console.log('Calculando precio con datos:', calculationInput);
      
      const result = await pricingEngine.calculatePrice(calculationInput);
      setPriceCalculation(result);
      
      toast({
        title: 'Éxito',
        description: 'Precio calculado correctamente'
      });
    }, { defaultMessage: 'Error al calcular el precio' });
  };
  
  const handleQuickPricingSetup = () => {
    handleAsyncError(async () => {
      const { applicationType } = quickPricing;
      
      if (applicationType === 'timeBands') {
        // Crear o actualizar bandas horarias
        for (const timeBandConfig of quickPricing.timeBands) {
          // Buscar si ya existe una banda horaria para este rango
          const existingBand = timeBands.find(band => 
            band.startTime === timeBandConfig.startTime && 
            band.endTime === timeBandConfig.endTime
          );
          
          if (existingBand) {
            // Actualizar banda existente
            await pricingEngine.updateTimeBandWithPersistence(existingBand.id, {
              ...existingBand,
              label: timeBandConfig.label
            });
          } else {
            // Crear nueva banda horaria
            await pricingEngine.addTimeBandWithPersistence({
              courseId,
              label: timeBandConfig.label,
              startTime: timeBandConfig.startTime,
              endTime: timeBandConfig.endTime,
              active: true
            });
          }
        }
        
        // Recargar bandas horarias
        const updatedTimeBands = pricingEngine.getTimeBands(courseId);
        setTimeBands(updatedTimeBands);
        
        // Crear reglas de precio para cada banda
        for (const timeBandConfig of quickPricing.timeBands) {
          const band = updatedTimeBands.find(b => 
            b.startTime === timeBandConfig.startTime && 
            b.endTime === timeBandConfig.endTime
          );
          
          if (band) {
            // Crear regla de precio fijo para esta banda
            await pricingEngine.addPriceRuleWithPersistence({
              courseId,
              name: `Precio ${timeBandConfig.label}`,
              description: `Precio fijo para ${timeBandConfig.label} (${timeBandConfig.startTime}-${timeBandConfig.endTime})`,
              timeBandId: band.id,
              priceType: 'fixed',
              priceValue: timeBandConfig.price,
              priority: 80,
              active: true
            });
          }
        }
      } else if (applicationType === 'daily') {
        // Crear regla de precio diario
        await pricingEngine.addPriceRuleWithPersistence({
          courseId,
          name: 'Precio Diario Fijo',
          description: `Precio fijo diario de $${quickPricing.dailyPrice}`,
          effectiveFrom: quickPricing.startDate,
          effectiveTo: quickPricing.endDate,
          priceType: 'fixed',
          priceValue: quickPricing.dailyPrice,
          priority: 70,
          active: true
        });
      } else if (applicationType === 'weekly') {
        // Crear reglas de precio por día de la semana
        const dayNames = {
          monday: 'Lunes',
          tuesday: 'Martes',
          wednesday: 'Miércoles',
          thursday: 'Jueves',
          friday: 'Viernes',
          saturday: 'Sábado',
          sunday: 'Domingo'
        };
        
        for (const [day, price] of Object.entries(quickPricing.weeklyPrices)) {
          await pricingEngine.addPriceRuleWithPersistence({
            courseId,
            name: `Precio ${dayNames[day as keyof typeof dayNames]}`,
            description: `Precio para ${dayNames[day as keyof typeof dayNames]}: $${price}`,
            effectiveFrom: quickPricing.startDate,
            effectiveTo: quickPricing.endDate,
            dow: [getDayOfWeekNumber(day)],
            priceType: 'fixed',
            priceValue: price,
            priority: 75,
            active: true
          });
        }
      } else if (applicationType === 'monthly') {
        // Crear regla de precio mensual
        await pricingEngine.addPriceRuleWithPersistence({
          courseId,
          name: 'Precio Mensual Fijo',
          description: `Precio fijo mensual de $${quickPricing.monthlyPrice}`,
          effectiveFrom: quickPricing.startDate,
          effectiveTo: quickPricing.endDate,
          priceType: 'fixed',
          priceValue: quickPricing.monthlyPrice,
          priority: 60,
          active: true
        });
      }
      
      loadData();
      setQuickPricingDialog(false);
      
      toast({ 
        title: 'Éxito', 
        description: `Configuración rápida de precios ${applicationType === 'timeBands' ? 'por bandas horarias' : applicationType === 'daily' ? 'diaria' : applicationType === 'weekly' ? 'semanal' : 'mensual'} aplicada correctamente` 
      });
    }, { defaultMessage: 'Error al aplicar la configuración rápida' });
  };
  
  const updateQuickPricingBand = (index: number, field: string, value: any) => {
    setQuickPricing(prev => ({
      ...prev,
      timeBands: prev.timeBands.map((band, i) => 
        i === index ? { ...band, [field]: value } : band
      )
    }));
  };
  
  const addQuickPricingBand = () => {
    setQuickPricing(prev => ({
      ...prev,
      timeBands: [...prev.timeBands, {
        startTime: '16:00',
        endTime: '18:00',
        price: 150,
        label: 'Evening'
      }]
    }));
  };
  
  const removeQuickPricingBand = (index: number) => {
    setQuickPricing(prev => ({
      ...prev,
      timeBands: prev.timeBands.filter((_, i) => i !== index)
    }));
  };
  
  const getHighestPrice = () => {
    const { applicationType } = quickPricing;
    
    if (applicationType === 'timeBands') {
      return Math.max(...quickPricing.timeBands.map(band => band.price));
    } else if (applicationType === 'daily') {
      return quickPricing.dailyPrice;
    } else if (applicationType === 'weekly') {
      return Math.max(...Object.values(quickPricing.weeklyPrices));
    } else if (applicationType === 'monthly') {
      return quickPricing.monthlyPrice;
    }
    
    return 295; // Precio por defecto
  };

  const deleteSeason = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta temporada?')) {
      handleAsyncError(async () => {
        if (!id || typeof id !== 'string') {
          throw new ValidationError('ID de temporada inválido');
        }

        console.log('Eliminando temporada:', id);
        
        pricingEngine.deleteSeason(id);
        loadData();
        
        toast({ title: 'Éxito', description: 'Temporada eliminada correctamente' });
      }, { defaultMessage: 'Error al eliminar la temporada' });
    }
  };

  const deleteTimeBand = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta banda horaria?')) {
      handleAsyncError(async () => {
        if (!id || typeof id !== 'string') {
          throw new ValidationError('ID de banda horaria inválido');
        }

        console.log('Eliminando banda horaria:', id);
        
        pricingEngine.deleteTimeBand(id);
        loadData();
        
        toast({ title: 'Éxito', description: 'Banda horaria eliminada correctamente' });
      }, { defaultMessage: 'Error al eliminar la banda horaria' });
    }
  };

  const deletePriceRule = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta regla de precio?')) {
      pricingEngine.deletePriceRule(id);
      loadData();
      toast({ title: 'Éxito', description: 'Regla de precio eliminada correctamente' });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Precios</h1>
          <p className="text-muted-foreground">{courseName}</p>
        </div>
        <Button onClick={() => setCalculatorDialog(true)} variant="outline">
          <Calculator className="h-4 w-4 mr-2" />
          Calculadora de Precios
        </Button>
      </div>

      <Tabs defaultValue="quick" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quick">Configuración Rápida</TabsTrigger>
          <TabsTrigger value="seasons">Temporadas</TabsTrigger>
          <TabsTrigger value="timebands">Bandas Horarias</TabsTrigger>
          <TabsTrigger value="rules">Reglas de Precios</TabsTrigger>
          <TabsTrigger value="overrides">Excepciones Especiales</TabsTrigger>
        </TabsList>

        <TabsContent value="seasons" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Temporadas
                  </CardTitle>
                  <CardDescription>
                    Gestiona las temporadas alta, media y baja del campo
                  </CardDescription>
                </div>
                <Dialog open={seasonDialog} onOpenChange={setSeasonDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingSeason(null);
                      setSeasonForm({
                        name: '',
                        startDate: '',
                        endDate: '',
                        priority: 50,
                        active: true
                      });
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Temporada
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingSeason ? 'Editar Temporada' : 'Nueva Temporada'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData();
                      formData.append('name', seasonForm.name);
                      formData.append('startDate', seasonForm.startDate);
                      formData.append('endDate', seasonForm.endDate);
                      formData.append('priority', seasonForm.priority.toString());
                      formData.append('active', seasonForm.active ? 'on' : 'off');
                      handleSeasonSubmit(formData);
                    }} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                          id="name"
                          name="name"
                          value={seasonForm.name}
                          onChange={(e) => setSeasonForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ej: Alta Temporada Oct-Nov"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startDate">Fecha Inicio</Label>
                          <Input
                            id="startDate"
                            name="startDate"
                            type="date"
                            value={seasonForm.startDate}
                            onChange={(e) => setSeasonForm(prev => ({ ...prev, startDate: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate">Fecha Fin</Label>
                          <Input
                            id="endDate"
                            name="endDate"
                            type="date"
                            value={seasonForm.endDate}
                            onChange={(e) => setSeasonForm(prev => ({ ...prev, endDate: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="priority">Prioridad</Label>
                        <Input
                          id="priority"
                          name="priority"
                          type="number"
                          value={seasonForm.priority}
                          onChange={(e) => setSeasonForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 50 }))}
                          placeholder="Mayor número = mayor prioridad"
                          required
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="active"
                          name="active"
                          checked={seasonForm.active}
                          onCheckedChange={(checked) => setSeasonForm(prev => ({ ...prev, active: checked }))}
                        />
                        <Label htmlFor="active">Activa</Label>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => {
                          setSeasonDialog(false);
                          setEditingSeason(null);
                          setSeasonForm({
                            name: '',
                            startDate: '',
                            endDate: '',
                            priority: 50,
                            active: true
                          });
                        }}>
                          Cancelar
                        </Button>
                        <Button type="submit">
                          {editingSeason ? 'Actualizar' : 'Crear'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seasons.map((season) => (
                    <TableRow key={season.id}>
                      <TableCell className="font-medium">{season.name}</TableCell>
                      <TableCell>
                        {format(parseISO(season.startDate), 'dd/MM/yyyy')} - {format(parseISO(season.endDate), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{season.priority}</TableCell>
                      <TableCell>
                        <Badge variant={season.active ? 'default' : 'secondary'}>
                          {season.active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSeason(season);
                              setSeasonForm({
                                name: season.name,
                                startDate: season.startDate,
                                endDate: season.endDate,
                                priority: season.priority,
                                active: season.active
                              });
                              setSeasonDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSeason(season.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timebands" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Bandas Horarias
                  </CardTitle>
                  <CardDescription>
                    Define los períodos Early, Prime y Twilight
                  </CardDescription>
                </div>
                <Dialog open={timeBandDialog} onOpenChange={setTimeBandDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingTimeBand(null);
                      setTimeBandForm({
                        label: '',
                        startTime: '',
                        endTime: '',
                        active: true
                      });
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Banda Horaria
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingTimeBand ? 'Editar Banda Horaria' : 'Nueva Banda Horaria'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData();
                      formData.append('label', timeBandForm.label);
                      formData.append('startTime', timeBandForm.startTime);
                      formData.append('endTime', timeBandForm.endTime);
                      formData.append('active', timeBandForm.active.toString());
                      handleTimeBandSubmit(formData);
                    }} className="space-y-4">
                      <div>
                        <Label htmlFor="label">Etiqueta</Label>
                        <Input
                          id="label"
                          name="label"
                          placeholder="Ej: Early, Prime, Twilight"
                          value={timeBandForm.label}
                          onChange={(e) => setTimeBandForm(prev => ({ ...prev, label: e.target.value }))}
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startTime">Hora de Inicio</Label>
                          <Input
                            id="startTime"
                            name="startTime"
                            type="time"
                            value={timeBandForm.startTime}
                            onChange={(e) => setTimeBandForm(prev => ({ ...prev, startTime: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="endTime">Hora de Fin</Label>
                          <Input
                            id="endTime"
                            name="endTime"
                            type="time"
                            value={timeBandForm.endTime}
                            onChange={(e) => setTimeBandForm(prev => ({ ...prev, endTime: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="active"
                          name="active"
                          checked={timeBandForm.active}
                          onCheckedChange={(checked) => setTimeBandForm(prev => ({ ...prev, active: checked as boolean }))}
                        />
                        <Label htmlFor="active">Banda activa</Label>
                      </div>
                      
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => {
                          setTimeBandDialog(false);
                          setEditingTimeBand(null);
                          setTimeBandForm({
                            label: '',
                            startTime: '',
                            endTime: '',
                            active: true
                          });
                        }}>
                          Cancelar
                        </Button>
                        <Button type="submit">
                          {editingTimeBand ? 'Actualizar' : 'Crear'} Banda
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Etiqueta</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeBands.map((band) => (
                    <TableRow key={band.id}>
                      <TableCell className="font-medium">{band.label}</TableCell>
                      <TableCell>{band.startTime} - {band.endTime}</TableCell>
                      <TableCell>
                        <Badge variant={band.active ? 'default' : 'secondary'}>
                          {band.active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTimeBand(band);
                              setTimeBandForm({
                                label: band.label,
                                startTime: band.startTime,
                                endTime: band.endTime,
                                active: band.active
                              });
                              setTimeBandDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTimeBand(band.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Reglas de Precios
                  </CardTitle>
                  <CardDescription>
                    Configura las reglas de cálculo de precios dinámicos
                  </CardDescription>
                </div>
                <Dialog open={priceRuleDialog} onOpenChange={setPriceRuleDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingPriceRule(null)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Regla
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingPriceRule ? 'Editar Regla' : 'Nueva Regla de Precio'}
                      </DialogTitle>
                    </DialogHeader>
                    <form action={handlePriceRuleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Nombre</Label>
                          <Input
                            id="name"
                            name="name"
                            defaultValue={editingPriceRule?.name}
                            placeholder="Ej: Premium Fin de Semana"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="priority">Prioridad</Label>
                          <Input
                            id="priority"
                            name="priority"
                            type="number"
                            defaultValue={editingPriceRule?.priority || 50}
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                          id="description"
                          name="description"
                          defaultValue={editingPriceRule?.description}
                          placeholder="Descripción opcional de la regla"
                        />
                      </div>

                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="seasonId">Temporada</Label>
                          <Select name="seasonId" defaultValue={editingPriceRule?.seasonId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar temporada" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Cualquier temporada</SelectItem>
                              {seasons.map((season) => (
                                <SelectItem key={season.id} value={season.id}>
                                  {season.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="timeBandId">Banda Horaria</Label>
                          <Select name="timeBandId" defaultValue={editingPriceRule?.timeBandId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar banda" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Cualquier horario</SelectItem>
                              {timeBands.map((band) => (
                                <SelectItem key={band.id} value={band.id}>
                                  {band.label} ({band.startTime}-{band.endTime})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="priceType">Tipo de Precio</Label>
                          <Select name="priceType" defaultValue={editingPriceRule?.priceType} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Precio Fijo</SelectItem>
                              <SelectItem value="delta">Delta (+/-)</SelectItem>
                              <SelectItem value="multiplier">Multiplicador</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="priceValue">Valor</Label>
                          <Input
                            id="priceValue"
                            name="priceValue"
                            type="number"
                            step="0.01"
                            defaultValue={editingPriceRule?.priceValue}
                            placeholder="Ej: 2200, 150, 1.10"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="roundTo">Redondear a</Label>
                          <Input
                            id="roundTo"
                            name="roundTo"
                            type="number"
                            defaultValue={editingPriceRule?.roundTo}
                            placeholder="Ej: 5, 10"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="active"
                          name="active"
                          defaultChecked={editingPriceRule?.active ?? true}
                        />
                        <Label htmlFor="active">Regla Activa</Label>
                      </div>

                      <DialogFooter>
                        <Button type="submit">
                          {editingPriceRule ? 'Actualizar' : 'Crear'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.priceType}</Badge>
                      </TableCell>
                      <TableCell>{rule.priceValue}</TableCell>
                      <TableCell>{rule.priority}</TableCell>
                      <TableCell>
                        <Badge variant={rule.active ? 'default' : 'secondary'}>
                          {rule.active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingPriceRule(rule);
                              setPriceRuleDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePriceRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overrides" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Excepciones Especiales
                  </CardTitle>
                  <CardDescription>
                    Gestiona precios especiales para fechas específicas
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Excepción
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialOverrides.map((override) => (
                    <TableRow key={override.id}>
                      <TableCell className="font-medium">{override.name}</TableCell>
                      <TableCell>{format(parseISO(override.startDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        {override.startTime && override.endTime 
                          ? `${override.startTime} - ${override.endTime}`
                          : 'Todo el día'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={override.overrideType === 'block' ? 'destructive' : 'default'}>
                          {override.overrideType === 'block' ? 'Bloqueado' : 'Precio Especial'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={override.active ? 'default' : 'secondary'}>
                          {override.active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configuración Rápida de Precios
                  </CardTitle>
                  <CardDescription>
                    Configura precios de forma rápida y sencilla
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Precio Base</div>
                  <div className="text-2xl font-bold text-green-600">${getHighestPrice()}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selector de tipo de aplicación */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="application-type">Tipo de Aplicación</Label>
                  <Select
                    value={quickPricing.applicationType}
                    onValueChange={(value) => setQuickPricing(prev => ({ ...prev, applicationType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo de aplicación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="timeBands">Por Bandas Horarias</SelectItem>
                      <SelectItem value="daily">Precio Diario Fijo</SelectItem>
                      <SelectItem value="weekly">Por Día de la Semana</SelectItem>
                      <SelectItem value="monthly">Precio Mensual Fijo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Fechas de aplicación */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Fecha Inicio</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={quickPricing.startDate}
                      onChange={(e) => setQuickPricing(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">Fecha Fin</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={quickPricing.endDate}
                      onChange={(e) => setQuickPricing(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              
              {/* Configuración por bandas horarias */}
              {quickPricing.applicationType === 'timeBands' && (
                <div className="space-y-4">
                  <h4 className="font-medium">Configuración de Bandas Horarias</h4>
                  <div className="grid gap-4">
                    {quickPricing.timeBands.map((band, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                        <div>
                          <Label htmlFor={`label-${index}`}>Etiqueta</Label>
                          <Input
                            id={`label-${index}`}
                            value={band.label}
                            onChange={(e) => updateQuickPricingBand(index, 'label', e.target.value)}
                            placeholder="Ej: Mañana"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`start-${index}`}>Hora Inicio</Label>
                          <Input
                            id={`start-${index}`}
                            type="time"
                            value={band.startTime}
                            onChange={(e) => updateQuickPricingBand(index, 'startTime', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`end-${index}`}>Hora Fin</Label>
                          <Input
                            id={`end-${index}`}
                            type="time"
                            value={band.endTime}
                            onChange={(e) => updateQuickPricingBand(index, 'endTime', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`price-${index}`}>Precio (USD)</Label>
                          <Input
                            id={`price-${index}`}
                            type="number"
                            value={band.price}
                            onChange={(e) => updateQuickPricingBand(index, 'price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeQuickPricingBand(index)}
                            disabled={quickPricing.timeBands.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={addQuickPricingBand}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Banda Horaria
                  </Button>
                </div>
              )}
              
              {/* Configuración precio diario */}
              {quickPricing.applicationType === 'daily' && (
                <div className="space-y-4">
                  <h4 className="font-medium">Precio Diario Fijo</h4>
                  <div>
                    <Label htmlFor="daily-price">Precio por Día (USD)</Label>
                    <Input
                      id="daily-price"
                      type="number"
                      value={quickPricing.dailyPrice}
                      onChange={(e) => setQuickPricing(prev => ({ ...prev, dailyPrice: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      step="0.01"
                      placeholder="295"
                    />
                  </div>
                </div>
              )}
              
              {/* Configuración precios semanales */}
              {quickPricing.applicationType === 'weekly' && (
                <div className="space-y-4">
                  <h4 className="font-medium">Precios por Día de la Semana</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries({
                      monday: 'Lunes',
                      tuesday: 'Martes',
                      wednesday: 'Miércoles',
                      thursday: 'Jueves',
                      friday: 'Viernes',
                      saturday: 'Sábado',
                      sunday: 'Domingo'
                    }).map(([day, label]) => (
                      <div key={day}>
                        <Label htmlFor={`${day}-price`}>{label}</Label>
                        <Input
                          id={`${day}-price`}
                          type="number"
                          value={quickPricing.weeklyPrices[day as keyof typeof quickPricing.weeklyPrices]}
                          onChange={(e) => setQuickPricing(prev => ({
                            ...prev,
                            weeklyPrices: {
                              ...prev.weeklyPrices,
                              [day]: parseFloat(e.target.value) || 0
                            }
                          }))}
                          min="0"
                          step="0.01"
                          placeholder="295"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Configuración precio mensual */}
              {quickPricing.applicationType === 'monthly' && (
                <div className="space-y-4">
                  <h4 className="font-medium">Precio Mensual Fijo</h4>
                  <div>
                    <Label htmlFor="monthly-price">Precio por Mes (USD)</Label>
                    <Input
                      id="monthly-price"
                      type="number"
                      value={quickPricing.monthlyPrice}
                      onChange={(e) => setQuickPricing(prev => ({ ...prev, monthlyPrice: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      step="0.01"
                      placeholder="295"
                    />
                  </div>
                </div>
              )}
              
              {/* Botón aplicar */}
              <div className="flex justify-end">
                <Button
                  onClick={handleQuickPricingSetup}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Aplicar Configuración
                </Button>
              </div>
              
              {/* Información */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">¿Cómo funciona?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {quickPricing.applicationType === 'timeBands' && (
                    <>
                      <li>• Define las bandas horarias y sus precios correspondientes</li>
                      <li>• Al aplicar se crearán automáticamente las bandas horarias y reglas de precio</li>
                      <li>• Puedes agregar o quitar bandas horarias según tus necesidades</li>
                    </>
                  )}
                  {quickPricing.applicationType === 'daily' && (
                    <>
                      <li>• Establece un precio fijo para todos los días en el rango de fechas</li>
                      <li>• Ideal para promociones o precios estándar</li>
                    </>
                  )}
                  {quickPricing.applicationType === 'weekly' && (
                    <>
                      <li>• Define precios diferentes para cada día de la semana</li>
                      <li>• Perfecto para ajustar precios de fin de semana</li>
                    </>
                  )}
                  {quickPricing.applicationType === 'monthly' && (
                    <>
                      <li>• Establece un precio fijo para todo el mes</li>
                      <li>• Útil para precios de temporada o promociones mensuales</li>
                    </>
                  )}
                  <li>• Las fechas de inicio y fin determinan el período de aplicación</li>
                  <li>• El precio base mostrado arriba se actualiza automáticamente</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Calculadora de Precios */}
      <Dialog open={calculatorDialog} onOpenChange={setCalculatorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculadora de Precios
            </DialogTitle>
            <DialogDescription>
              Simula el cálculo de precios para diferentes escenarios
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="calc-date">Fecha</Label>
                <Input
                  id="calc-date"
                  type="date"
                  value={calculationInput.date}
                  onChange={(e) => setCalculationInput(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="calc-time">Hora</Label>
                <Input
                  id="calc-time"
                  type="time"
                  value={calculationInput.time}
                  onChange={(e) => setCalculationInput(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="calc-players">Jugadores</Label>
              <Input
                id="calc-players"
                type="number"
                min="1"
                max="4"
                value={calculationInput.players}
                onChange={(e) => setCalculationInput(prev => ({ ...prev, players: parseInt(e.target.value) }))}
              />
            </div>
            
            <Button onClick={handleCalculatePrice} className="w-full">
              <DollarSign className="h-4 w-4 mr-2" />
              Calcular Precio
            </Button>
            
            {priceCalculation && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultado del Cálculo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Precio Base</Label>
                      <p className="text-2xl font-bold">${priceCalculation.basePrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <Label>Precio Final por Jugador</Label>
                      <p className="text-2xl font-bold text-primary">${priceCalculation.finalPricePerPlayer.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Total ({priceCalculation.players} jugadores)</Label>
                    <p className="text-3xl font-bold text-green-600">${priceCalculation.totalPrice.toFixed(2)}</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label>Reglas Aplicadas</Label>
                    <div className="space-y-2 mt-2">
                      {priceCalculation.appliedRules.map((rule, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{rule.ruleName}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{rule.ruleType}</Badge>
                            <span className="text-sm font-medium">${rule.resultPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}