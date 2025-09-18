
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clock, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TimeIntervalSettingsProps {
  initialInterval: number;
  initialOperatingHours: {
    openingTime: string;
    closingTime: string;
  };
  onIntervalChange: (value: number) => void;
  onOperatingHoursChange: (hours: { openingTime: string, closingTime: string }) => void;
}

const INTERVAL_OPTIONS = [
  { value: 10, label: '10 minutos' },
  { value: 12, label: '12 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 20, label: '20 minutos' },
  { value: 30, label: '30 minutos' }
];

export default function TimeIntervalSettings({
  initialInterval,
  initialOperatingHours,
  onIntervalChange,
  onOperatingHoursChange
}: TimeIntervalSettingsProps) {
  const [interval, setInterval] = useState(initialInterval);
  const [operatingHours, setOperatingHours] = useState(initialOperatingHours);

  useEffect(() => {
    onIntervalChange(interval);
  }, [interval, onIntervalChange]);

  useEffect(() => {
    onOperatingHoursChange(operatingHours);
  }, [operatingHours, onOperatingHoursChange]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Configuración de Intervalos de Tiempo
        </CardTitle>
        <CardDescription>
          Configure los intervalos de tiempo y horarios de operación para este campo de golf.
          Los horarios pasados del día actual se bloquearán automáticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="interval">Intervalo de Tiempo</Label>
            <Select 
              value={interval.toString()} 
              onValueChange={(value) => setInterval(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar intervalo" />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opening-time">Hora de Apertura</Label>
            <Input
              id="opening-time"
              type="time"
              value={operatingHours.openingTime}
              onChange={(e) => setOperatingHours({ ...operatingHours, openingTime: e.target.value })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="closing-time">Hora de Cierre</Label>
            <Input
              id="closing-time"
              type="time"
              value={operatingHours.closingTime}
              onChange={(e) => setOperatingHours({ ...operatingHours, closingTime: e.target.value })}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
