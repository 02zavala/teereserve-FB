"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, DollarSign, Clock, Users, Ticket, Eye, Code, Palette, Save, Plus, Trash2 } from "lucide-react";
import { createCMSSection, updateCMSSection, getCMSSection } from "@/lib/data";
import { useAuth } from "@/context/AuthContext";
import type { CMSSection, CMSEventSection } from "@/types";

interface EventVisualEditorProps {
  section?: CMSSection;
  onSave?: (section: CMSSection) => void;
  onCancel?: () => void;
}

export function EventVisualEditor({ section, onSave, onCancel }: EventVisualEditorProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<CMSSection>>({
    type: 'event',
    title: '',
    content: {
      eventTitle: '',
      eventDescription: '',
      eventDate: '',
      eventTime: '',
      eventLocation: '',
      eventPrice: 0,
      eventCurrency: 'USD',
      maxTickets: 100,
      soldTickets: 0,
      isTicketSaleActive: true,
      eventFeatures: []
    },
    isActive: true,
    order: 0
  });
  
  const [newFeature, setNewFeature] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (section) {
      setFormData(section);
    }
  }, [section]);

  const handleContentChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [field]: value
      }
    }));
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    
    const currentFeatures = (formData.content as any)?.eventFeatures || [];
    handleContentChange('eventFeatures', [...currentFeatures, newFeature.trim()]);
    setNewFeature('');
  };

  const removeFeature = (index: number) => {
    const currentFeatures = (formData.content as any)?.eventFeatures || [];
    const updatedFeatures = currentFeatures.filter((_: any, i: number) => i !== index);
    handleContentChange('eventFeatures', updatedFeatures);
  };

  const handleSave = async () => {
    if (!user || !formData.title) return;

    setSaving(true);
    try {
      let savedSection: CMSSection;
      
      if (section) {
        await updateCMSSection(section.id, formData);
        savedSection = { ...section, ...formData } as CMSSection;
      } else {
        const newId = await createCMSSection({
          ...formData as Omit<CMSSection, 'id' | 'createdAt' | 'updatedAt'>,
          createdBy: user.uid
        });
        const fetched = await getCMSSection(newId);
        savedSection = (fetched || ({ id: newId, ...formData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: user.uid } as any)) as CMSSection;
      }
      
      onSave?.(savedSection);
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderPreview = () => {
    const content = formData.content as CMSEventSection['content'];
    
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{content.eventTitle || 'Título del Evento'}</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                {formData.title || 'Título de la Sección'}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white">
              <Ticket className="h-4 w-4 mr-1" />
              Evento Especial
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                {content.eventDescription || 'Descripción del evento aparecerá aquí...'}
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {content.eventDate ? new Date(content.eventDate).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Fecha del evento'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="font-medium">{content.eventTime || 'Hora del evento'}</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="font-medium">{content.eventLocation || 'Ubicación del evento'}</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {content.soldTickets || 0} / {content.maxTickets || 0} tickets vendidos
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-center items-center space-y-4 p-6 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="h-6 w-6 text-primary" />
                  <span className="text-3xl font-bold text-primary">
                    {content.eventPrice || 0}
                  </span>
                  <span className="text-lg text-muted-foreground">
                    {content.eventCurrency || 'MXN'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">por persona</p>
              </div>
              
              {content.isTicketSaleActive ? (
                <Button size="lg" className="w-full">
                  <Ticket className="h-4 w-4 mr-2" />
                  Comprar Tickets
                </Button>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Venta de tickets no disponible
                </Badge>
              )}
            </div>
          </div>
          
          {content.eventFeatures && content.eventFeatures.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-3">Incluye:</h4>
              <div className="flex flex-wrap gap-2">
                {content.eventFeatures.map((feature, index) => (
                  <Badge key={index} variant="outline">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Editor Visual de Eventos</h2>
          <p className="text-muted-foreground">
            Crea y edita eventos con vista previa en tiempo real
          </p>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Evento'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Vista Previa
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Panel de Edición */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Información Básica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="sectionTitle">Título de la Sección</Label>
                    <Input
                      id="sectionTitle"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ej: Evento Especial de Golf"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="eventTitle">Título del Evento</Label>
                    <Input
                      id="eventTitle"
                      value={(formData.content as any)?.eventTitle || ''}
                      onChange={(e) => handleContentChange('eventTitle', e.target.value)}
                      placeholder="Ej: Torneo de Golf Los Cabos 2024"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="eventDescription">Descripción</Label>
                    <Textarea
                      id="eventDescription"
                      rows={4}
                      value={(formData.content as any)?.eventDescription || ''}
                      onChange={(e) => handleContentChange('eventDescription', e.target.value)}
                      placeholder="Describe tu evento aquí..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Fecha y Ubicación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventDate">Fecha</Label>
                      <Input
                        id="eventDate"
                        type="date"
                        value={(formData.content as any)?.eventDate || ''}
                        onChange={(e) => handleContentChange('eventDate', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="eventTime">Hora</Label>
                      <Input
                        id="eventTime"
                        type="time"
                        value={(formData.content as any)?.eventTime || ''}
                        onChange={(e) => handleContentChange('eventTime', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="eventLocation">Ubicación</Label>
                    <Input
                      id="eventLocation"
                      value={(formData.content as any)?.eventLocation || ''}
                      onChange={(e) => handleContentChange('eventLocation', e.target.value)}
                      placeholder="Ej: Club de Golf Los Cabos"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Precios y Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventPrice">Precio</Label>
                      <Input
                        id="eventPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={(formData.content as any)?.eventPrice || ''}
                        onChange={(e) => handleContentChange('eventPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxTickets">Máximo de Tickets</Label>
                      <Input
                        id="maxTickets"
                        type="number"
                        min="1"
                        value={(formData.content as any)?.maxTickets || ''}
                        onChange={(e) => handleContentChange('maxTickets', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isTicketSaleActive"
                      checked={(formData.content as any)?.isTicketSaleActive || false}
                      onCheckedChange={(checked) => handleContentChange('isTicketSaleActive', checked)}
                    />
                    <Label htmlFor="isTicketSaleActive">Venta de tickets activa</Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Características del Evento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Ej: Almuerzo incluido"
                      onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                    />
                    <Button onClick={addFeature} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {((formData.content as any)?.eventFeatures || []).map((feature: string, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{feature}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFeature(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Configuración</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">Sección activa</Label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vista Previa en Tiempo Real */}
            <div className="space-y-4">
              <div className="sticky top-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Vista Previa en Tiempo Real
                </h3>
                {renderPreview()}
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-6">
          <div className="max-w-4xl mx-auto">
            {renderPreview()}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
