'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Download, Upload, Copy, Settings } from 'lucide-react';
import { PricingEngine } from '@/lib/pricing-engine';
import type { Season, PriceRule, PriceRuleType } from '@/types';
import { toast } from '@/hooks/use-toast';

interface PricingTemplatesProps {
  courseId: string;
}

interface PricingTemplate {
  id: string;
  name: string;
  description: string;
  seasons: Omit<Season, 'id' | 'courseId' | 'createdAt' | 'updatedAt'>[];
  priceRules: Omit<PriceRule, 'id' | 'courseId' | 'createdAt' | 'updatedAt'>[];
}

const DEFAULT_TEMPLATES: PricingTemplate[] = [
  {
    id: 'los-cabos-alta-temporada',
    name: 'Los Cabos - Alta Temporada (Oct-Nov)',
    description: 'Configuración de precios para temporada alta en Los Cabos',
    seasons: [
      {
        name: 'Alta Temporada Oct-Nov',
        startDate: '2024-10-01',
        endDate: '2024-11-30',
        priority: 90,
        active: true
      }
    ],
    priceRules: [
      {
        name: 'Precio Base Alta Temporada',
        description: 'Precio rack para temporada alta',
        seasonId: 'alta-temporada-oct-nov',
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
        description: 'Multiplicador para horario prime (09:12-12:00)',
        timeBandId: 'prime',
        priceType: 'multiplier',
        priceValue: 1.10,
        priority: 70,
        active: true
      },
      {
        name: 'Descuento Twilight',
        description: 'Descuento para horario twilight (15:00-18:00)',
        timeBandId: 'twilight',
        priceType: 'multiplier',
        priceValue: 0.85,
        priority: 70,
        active: true
      },
      {
        name: 'Early Bird Discount',
        description: 'Descuento por reserva anticipada (30+ días)',
        leadTimeMin: 720, // 30 días en horas
        priceType: 'multiplier',
        priceValue: 0.90,
        priority: 60,
        active: true
      },
      {
        name: 'High Occupancy Premium',
        description: 'Recargo por alta ocupación (>70%)',
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
    id: 'temporada-media',
    name: 'Temporada Media (Sep)',
    description: 'Configuración de precios para temporada media',
    seasons: [
      {
        name: 'Temporada Media Sep',
        startDate: '2024-09-01',
        endDate: '2024-09-30',
        priority: 70,
        active: true
      }
    ],
    priceRules: [
      {
        name: 'Precio Base Temporada Media',
        description: 'Precio rack para temporada media',
        seasonId: 'temporada-media-sep',
        priceType: 'fixed',
        priceValue: 1800,
        priority: 70,
        active: true
      },
      {
        name: 'Recargo Fin de Semana',
        description: 'Incremento para sábados y domingos',
        dow: [0, 6],
        priceType: 'delta',
        priceValue: 100,
        priority: 60,
        active: true
      }
    ]
  },
  {
    id: 'temporada-baja',
    name: 'Temporada Baja (Jun-Ago)',
    description: 'Configuración de precios para temporada baja de verano',
    seasons: [
      {
        name: 'Temporada Baja Verano',
        startDate: '2024-06-01',
        endDate: '2024-08-31',
        priority: 60,
        active: true
      }
    ],
    priceRules: [
      {
        name: 'Precio Base Temporada Baja',
        description: 'Precio rack para temporada baja',
        seasonId: 'temporada-baja-verano',
        priceType: 'fixed',
        priceValue: 1400,
        priority: 60,
        active: true
      },
      {
        name: 'Promoción Verano',
        description: 'Descuento especial de verano',
        priceType: 'multiplier',
        priceValue: 0.80,
        priority: 50,
        active: true
      }
    ]
  }
];

export function PricingTemplates({ courseId }: PricingTemplatesProps) {
  const pricingEngine = new PricingEngine();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customYear, setCustomYear] = useState<number>(new Date().getFullYear());
  const [isApplying, setIsApplying] = useState(false);

  const applyTemplate = async (templateId: string) => {
    const template = DEFAULT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setIsApplying(true);
    try {
      // Aplicar temporadas
      const createdSeasons: { [key: string]: string } = {};
      for (const seasonData of template.seasons) {
        const adjustedSeason = {
          ...seasonData,
          courseId,
          startDate: seasonData.startDate.replace('2024', customYear.toString()),
          endDate: seasonData.endDate.replace('2024', customYear.toString())
        };
        const newSeason = pricingEngine.addSeason(adjustedSeason);
        createdSeasons[seasonData.name.toLowerCase().replace(/\s+/g, '-')] = newSeason.id;
      }

      // Aplicar reglas de precios
      for (const ruleData of template.priceRules) {
        const adjustedRule = {
          ...ruleData,
          courseId
        };

        // Mapear seasonId si existe
        if (ruleData.seasonId) {
          const seasonKey = Object.keys(createdSeasons)[0]; // Usar la primera temporada creada
          adjustedRule.seasonId = createdSeasons[seasonKey];
        }

        pricingEngine.addPriceRule(adjustedRule);
      }

      toast({
        title: 'Plantilla aplicada',
        description: `Se ha aplicado la plantilla "${template.name}" correctamente.`,
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo aplicar la plantilla. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const exportCurrentPricing = () => {
    const data = pricingEngine.exportPricingData(courseId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pricing-config-${courseId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Configuración exportada',
      description: 'La configuración de precios se ha descargado correctamente.',
    });
  };

  const importPricing = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        pricingEngine.importPricingData(courseId, data);
        
        toast({
          title: 'Configuración importada',
          description: 'La configuración de precios se ha importado correctamente.',
        });
        
        window.location.reload();
      } catch (error) {
        toast({
          title: 'Error de importación',
          description: 'El archivo no tiene un formato válido.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Plantillas de Precios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="template-select">Seleccionar Plantilla</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige una plantilla..." />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="year-input">Año de Aplicación</Label>
              <Input
                id="year-input"
                type="number"
                value={customYear}
                onChange={(e) => setCustomYear(parseInt(e.target.value))}
                min={2024}
                max={2030}
              />
            </div>
          </div>

          {selectedTemplate && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">
                {DEFAULT_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                {DEFAULT_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
              </p>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Temporadas: </span>
                  {DEFAULT_TEMPLATES.find(t => t.id === selectedTemplate)?.seasons.map((season, index) => (
                    <Badge key={index} variant="outline" className="ml-1">
                      {season.name}
                    </Badge>
                  ))}
                </div>
                
                <div>
                  <span className="text-sm font-medium">Reglas: </span>
                  <span className="text-sm text-muted-foreground">
                    {DEFAULT_TEMPLATES.find(t => t.id === selectedTemplate)?.priceRules.length} reglas de precios
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={() => selectedTemplate && applyTemplate(selectedTemplate)}
              disabled={!selectedTemplate || isApplying}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              {isApplying ? 'Aplicando...' : 'Aplicar Plantilla'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Importar/Exportar Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={exportCurrentPricing} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar Configuración
            </Button>
            
            <div>
              <input
                type="file"
                accept=".json"
                onChange={importPricing}
                style={{ display: 'none' }}
                id="import-file"
              />
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('import-file')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Configuración
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}