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
import { Copy, Upload, Download, Percent, DollarSign, Calendar, Settings, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { PricingEngine } from '@/lib/pricing-engine';
import { Season, PriceRule, PriceRuleType } from '@/types';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface BulkPricingOperationsProps {
  courseId: string;
  courseName: string;
}

interface SeasonTemplate {
  id: string;
  name: string;
  description: string;
  rules: Omit<PriceRule, 'id' | 'courseId' | 'createdAt' | 'updatedAt'>[];
  seasons: Omit<Season, 'id' | 'courseId' | 'createdAt' | 'updatedAt'>[];
}

const SEASON_TEMPLATES: SeasonTemplate[] = [
  {
    id: 'los-cabos-oct-nov',
    name: 'Los Cabos - Alta Temporada (Oct-Nov)',
    description: 'Configuración típica para temporada alta en Los Cabos durante octubre y noviembre',
    seasons: [
      {
        name: 'Alta Temporada Oct-Nov',
        startDate: '2024-10-01',
        endDate: '2024-11-30',
        priority: 90,
        active: true
      }
    ],
    rules: [
      {
        name: 'Precio Base Temporada Alta',
        description: 'Precio rack para temporada alta',
        priceType: 'fixed',
        priceValue: 2200,
        priority: 90,
        active: true
      },
      {
        name: 'Recargo Fin de Semana',
        description: 'Incremento para sábados y domingos',
        dow: [0, 6],
        priceType: 'delta',
        priceValue: 150,
        priority: 80,
        active: true
      },
      {
        name: 'Premium Prime Time',
        description: 'Multiplicador para horario prime',
        priceType: 'multiplier',
        priceValue: 1.10,
        priority: 70,
        active: true
      },
      {
        name: 'Descuento Twilight',
        description: 'Descuento para horario vespertino',
        priceType: 'multiplier',
        priceValue: 0.85,
        priority: 70,
        active: true
      },
      {
        name: 'Early Bird Discount',
        description: 'Descuento por reserva anticipada (30+ días)',
        leadTimeMin: 720,
        priceType: 'multiplier',
        priceValue: 0.90,
        priority: 60,
        active: true
      },
      {
        name: 'High Occupancy Premium',
        description: 'Recargo por alta ocupación (+70%)',
        occupancyMin: 70,
        priceType: 'multiplier',
        priceValue: 1.05,
        priority: 65,
        active: true
      },
      {
        name: 'Grupo 4 Jugadores',
        description: 'Descuento para grupos de 4 jugadores',
        playersMin: 4,
        playersMax: 4,
        priceType: 'delta',
        priceValue: -50,
        priority: 50,
        active: true
      }
    ]
  },
  {
    id: 'summer-low-season',
    name: 'Temporada Baja Verano',
    description: 'Configuración para temporada baja de verano con precios reducidos',
    seasons: [
      {
        name: 'Temporada Baja Verano',
        startDate: '2024-06-01',
        endDate: '2024-08-31',
        priority: 60,
        active: true
      }
    ],
    rules: [
      {
        name: 'Precio Base Verano',
        description: 'Precio base reducido para verano',
        priceType: 'fixed',
        priceValue: 1500,
        priority: 60,
        active: true
      },
      {
        name: 'Promoción Fin de Semana Verano',
        description: 'Menor incremento en fin de semana durante verano',
        dow: [0, 6],
        priceType: 'delta',
        priceValue: 100,
        priority: 50,
        active: true
      }
    ]
  }
];

export function BulkPricingOperations({ courseId, courseName }: BulkPricingOperationsProps) {
  const pricingEngine = new PricingEngine();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para operaciones en lote
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [bulkOperation, setBulkOperation] = useState<'percentage' | 'fixed' | 'copy'>('percentage');
  const [bulkValue, setBulkValue] = useState('');
  const [targetMonth, setTargetMonth] = useState('');
  const [sourceMonth, setSourceMonth] = useState('');
  
  // Estados para plantillas
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateYear, setTemplateYear] = useState(new Date().getFullYear().toString());
  
  // Estados para diálogos
  const [bulkDialog, setBulkDialog] = useState(false);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [copyDialog, setCopyDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = () => {
    try {
      setSeasons(pricingEngine.getSeasons(courseId));
      setPriceRules(pricingEngine.getPriceRules(courseId));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al cargar los datos',
        variant: 'destructive'
      });
    }
  };

  const handleBulkPriceUpdate = async () => {
    if (selectedRules.length === 0) {
      toast({
        title: 'Error',
        description: 'Selecciona al menos una regla para actualizar',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const value = parseFloat(bulkValue);
      if (isNaN(value)) {
        throw new Error('Valor inválido');
      }

      for (const ruleId of selectedRules) {
        const rule = priceRules.find(r => r.id === ruleId);
        if (!rule) continue;

        let newValue = rule.priceValue;
        
        switch (bulkOperation) {
          case 'percentage':
            newValue = rule.priceValue * (1 + value / 100);
            break;
          case 'fixed':
            newValue = rule.priceValue + value;
            break;
        }

        await pricingEngine.updatePriceRule(ruleId, {
          ...rule,
          priceValue: newValue
        });
      }

      loadData();
      setBulkDialog(false);
      setSelectedRules([]);
      setBulkValue('');
      
      toast({
        title: 'Éxito',
        description: `${selectedRules.length} reglas actualizadas correctamente`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al actualizar las reglas',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyRules = async () => {
    if (!sourceMonth || !targetMonth) {
      toast({
        title: 'Error',
        description: 'Selecciona los meses de origen y destino',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Obtener reglas del mes origen
      const sourceDate = new Date(sourceMonth + '-01');
      const targetDate = new Date(targetMonth + '-01');
      
      const sourceSeasons = seasons.filter(season => {
        const seasonStart = new Date(season.startDate);
        const seasonEnd = new Date(season.endDate);
        return sourceDate >= seasonStart && sourceDate <= seasonEnd;
      });

      // Crear nuevas temporadas para el mes destino
      for (const sourceSeason of sourceSeasons) {
        const monthDiff = (targetDate.getFullYear() - sourceDate.getFullYear()) * 12 + 
                         (targetDate.getMonth() - sourceDate.getMonth());
        
        const newStartDate = addMonths(new Date(sourceSeason.startDate), monthDiff);
        const newEndDate = addMonths(new Date(sourceSeason.endDate), monthDiff);
        
        const newSeason = {
          courseId,
          name: `${sourceSeason.name} - ${format(newStartDate, 'MMM yyyy', { locale: es })}`,
          startDate: format(newStartDate, 'yyyy-MM-dd'),
          endDate: format(newEndDate, 'yyyy-MM-dd'),
          priority: sourceSeason.priority,
          active: sourceSeason.active
        };
        
        const createdSeason = await pricingEngine.addSeason(newSeason);
        
        // Copiar reglas asociadas a esta temporada
        const seasonRules = priceRules.filter(rule => rule.seasonId === sourceSeason.id);
        
        for (const rule of seasonRules) {
          const newRule = {
            ...rule,
            courseId,
            name: `${rule.name} - ${format(newStartDate, 'MMM yyyy', { locale: es })}`,
            seasonId: createdSeason.id
          };
          
          delete (newRule as any).id;
          delete (newRule as any).createdAt;
          delete (newRule as any).updatedAt;
          
          await pricingEngine.addPriceRule(newRule);
        }
      }

      loadData();
      setCopyDialog(false);
      setSourceMonth('');
      setTargetMonth('');
      
      toast({
        title: 'Éxito',
        description: 'Reglas copiadas correctamente al mes destino'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al copiar las reglas',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) {
      toast({
        title: 'Error',
        description: 'Selecciona una plantilla',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const template = SEASON_TEMPLATES.find(t => t.id === selectedTemplate);
      if (!template) throw new Error('Plantilla no encontrada');

      const year = parseInt(templateYear);
      
      // Crear temporadas de la plantilla
      const createdSeasons: { [key: string]: string } = {};
      
      for (const seasonTemplate of template.seasons) {
        const startDate = new Date(seasonTemplate.startDate);
        const endDate = new Date(seasonTemplate.endDate);
        
        startDate.setFullYear(year);
        endDate.setFullYear(year);
        
        const newSeason = {
          courseId,
          name: `${seasonTemplate.name} ${year}`,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          priority: seasonTemplate.priority,
          active: seasonTemplate.active
        };
        
        const created = await pricingEngine.addSeason(newSeason);
        createdSeasons[seasonTemplate.name] = created.id;
      }
      
      // Crear reglas de la plantilla
      for (const ruleTemplate of template.rules) {
        const newRule = {
          ...ruleTemplate,
          courseId,
          name: `${ruleTemplate.name} ${year}`,
          // Asociar con la temporada correspondiente si existe
          seasonId: template.seasons.length > 0 ? createdSeasons[template.seasons[0].name] : undefined
        };
        
        await pricingEngine.addPriceRule(newRule);
      }

      loadData();
      setTemplateDialog(false);
      setSelectedTemplate('');
      
      toast({
        title: 'Éxito',
        description: `Plantilla "${template.name}" aplicada correctamente`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al aplicar la plantilla',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportConfiguration = () => {
    const config = {
      seasons: seasons,
      priceRules: priceRules,
      exportDate: new Date().toISOString(),
      courseId,
      courseName
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pricing-config-${courseName}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Éxito',
      description: 'Configuración exportada correctamente'
    });
  };

  const toggleRuleSelection = (ruleId: string) => {
    setSelectedRules(prev => 
      prev.includes(ruleId) 
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const selectAllRules = () => {
    setSelectedRules(priceRules.map(rule => rule.id));
  };

  const clearSelection = () => {
    setSelectedRules([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operaciones en Lote</h1>
          <p className="text-muted-foreground">{courseName}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportConfiguration}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Configuración
          </Button>
        </div>
      </div>

      <Tabs defaultValue="bulk" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bulk">Actualización Masiva</TabsTrigger>
          <TabsTrigger value="copy">Copiar Entre Meses</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Actualización Masiva de Precios
              </CardTitle>
              <CardDescription>
                Selecciona reglas y aplica cambios de precio en lote
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAllRules}
                  disabled={priceRules.length === 0}
                >
                  Seleccionar Todas
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearSelection}
                  disabled={selectedRules.length === 0}
                >
                  Limpiar Selección
                </Button>
                <Badge variant="secondary">
                  {selectedRules.length} de {priceRules.length} seleccionadas
                </Badge>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Sel.</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor Actual</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRules.includes(rule.id)}
                          onCheckedChange={() => toggleRuleSelection(rule.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.priceType}</Badge>
                      </TableCell>
                      <TableCell>{rule.priceValue}</TableCell>
                      <TableCell>
                        <Badge variant={rule.active ? 'default' : 'secondary'}>
                          {rule.active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <Separator />
              
              <div className="flex items-center gap-4">
                <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
                  <DialogTrigger asChild>
                    <Button disabled={selectedRules.length === 0}>
                      <Settings className="h-4 w-4 mr-2" />
                      Aplicar Cambios Masivos
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Actualización Masiva de Precios</DialogTitle>
                      <DialogDescription>
                        Aplicar cambios a {selectedRules.length} reglas seleccionadas
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label>Tipo de Operación</Label>
                        <Select value={bulkOperation} onValueChange={(value: any) => setBulkOperation(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                            <SelectItem value="fixed">Cantidad Fija</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Valor</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={bulkValue}
                          onChange={(e) => setBulkValue(e.target.value)}
                          placeholder={bulkOperation === 'percentage' ? 'Ej: 5 (para +5%)' : 'Ej: 100 (para +$100)'}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          {bulkOperation === 'percentage' 
                            ? 'Porcentaje de incremento/decremento (usar números negativos para decrementos)'
                            : 'Cantidad fija a sumar/restar (usar números negativos para restar)'
                          }
                        </p>
                      </div>
                      
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <p className="text-sm text-yellow-800">
                            Esta operación modificará permanentemente las reglas seleccionadas. 
                            Asegúrate de tener una copia de seguridad si es necesario.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        onClick={handleBulkPriceUpdate} 
                        disabled={!bulkValue || isLoading}
                      >
                        {isLoading ? 'Aplicando...' : 'Aplicar Cambios'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="copy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Copiar Reglas Entre Meses
              </CardTitle>
              <CardDescription>
                Duplica la configuración de precios de un mes a otro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={copyDialog} onOpenChange={setCopyDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Configuración
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Copiar Reglas Entre Meses</DialogTitle>
                    <DialogDescription>
                      Selecciona el mes origen y destino para copiar la configuración
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Mes Origen</Label>
                      <Input
                        type="month"
                        value={sourceMonth}
                        onChange={(e) => setSourceMonth(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Mes Destino</Label>
                      <Input
                        type="month"
                        value={targetMonth}
                        onChange={(e) => setTargetMonth(e.target.value)}
                      />
                    </div>
                    
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Se copiarán todas las temporadas y reglas que estén activas en el mes origen.
                        Las nuevas reglas tendrán fechas ajustadas al mes destino.
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      onClick={handleCopyRules} 
                      disabled={!sourceMonth || !targetMonth || isLoading}
                    >
                      {isLoading ? 'Copiando...' : 'Copiar Reglas'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Plantillas de Temporada
              </CardTitle>
              <CardDescription>
                Aplica configuraciones predefinidas para diferentes tipos de temporada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {SEASON_TEMPLATES.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{template.seasons.length} temporadas</Badge>
                        <Badge variant="outline">{template.rules.length} reglas</Badge>
                      </div>
                    </div>
                    
                    <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedTemplate(template.id)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Aplicar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Aplicar Plantilla</DialogTitle>
                          <DialogDescription>
                            {template.name}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <Label>Año</Label>
                            <Input
                              type="number"
                              min="2024"
                              max="2030"
                              value={templateYear}
                              onChange={(e) => setTemplateYear(e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Vista Previa de Temporadas</Label>
                            {template.seasons.map((season, index) => {
                              const startDate = new Date(season.startDate);
                              const endDate = new Date(season.endDate);
                              startDate.setFullYear(parseInt(templateYear));
                              endDate.setFullYear(parseInt(templateYear));
                              
                              return (
                                <div key={index} className="p-2 bg-muted rounded text-sm">
                                  {season.name} {templateYear}: {format(startDate, 'dd/MM')} - {format(endDate, 'dd/MM')}
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Reglas Incluidas</Label>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {template.rules.map((rule, index) => (
                                <div key={index} className="p-2 bg-muted rounded text-sm">
                                  <div className="flex items-center justify-between">
                                    <span>{rule.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {rule.priceType}: {rule.priceValue}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button 
                            onClick={handleApplyTemplate} 
                            disabled={isLoading}
                          >
                            {isLoading ? 'Aplicando...' : 'Aplicar Plantilla'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}