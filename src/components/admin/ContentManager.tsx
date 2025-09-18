"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical, Calendar, MapPin, DollarSign } from "lucide-react";
import { getCMSSections, createCMSSection, updateCMSSection, deleteCMSSection, reorderCMSSections } from "@/lib/data";
import { useAuth } from "@/context/AuthContext";
import type { CMSSection, CMSEventSection } from "@/types";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface ContentManagerProps {
  onSectionUpdate?: () => void;
}

export function ContentManager({ onSectionUpdate }: ContentManagerProps) {
  const { user } = useAuth();
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<CMSSection | null>(null);
  const [formData, setFormData] = useState<Partial<CMSSection>>({
    type: 'text',
    title: '',
    content: {},
    isActive: true,
    order: 0
  });

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      const sectionsData = await getCMSSections();
      setSections(sectionsData);
    } catch (error) {
      console.error('Error loading sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSection = () => {
    setEditingSection(null);
    setFormData({
      type: 'text',
      title: '',
      content: {},
      isActive: true,
      order: sections.length
    });
    setIsDialogOpen(true);
  };

  const handleEditSection = (section: CMSSection) => {
    setEditingSection(section);
    setFormData(section);
    setIsDialogOpen(true);
  };

  const handleSaveSection = async () => {
    if (!user || !formData.title) return;

    try {
      if (editingSection) {
        await updateCMSSection(editingSection.id, formData);
      } else {
        await createCMSSection({
          ...formData as Omit<CMSSection, 'id' | 'createdAt' | 'updatedAt'>,
          createdBy: user.uid
        });
      }
      
      await loadSections();
      setIsDialogOpen(false);
      onSectionUpdate?.();
    } catch (error) {
      console.error('Error saving section:', error);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta sección?')) return;

    try {
      await deleteCMSSection(sectionId);
      await loadSections();
      onSectionUpdate?.();
    } catch (error) {
      console.error('Error deleting section:', error);
    }
  };

  const handleToggleActive = async (section: CMSSection) => {
    try {
      await updateCMSSection(section.id, { isActive: !section.isActive });
      await loadSections();
      onSectionUpdate?.();
    } catch (error) {
      console.error('Error toggling section:', error);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSections(items);

    try {
      await reorderCMSSections(items.map(item => item.id));
      onSectionUpdate?.();
    } catch (error) {
      console.error('Error reordering sections:', error);
      await loadSections(); // Revert on error
    }
  };

  const renderSectionContent = (section: CMSSection) => {
    switch (section.type) {
      case 'event':
        const eventContent = section.content as CMSEventSection['content'];
        return (
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{eventContent.eventDate} - {eventContent.eventTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{eventContent.eventLocation}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>{eventContent.eventPrice} {eventContent.eventCurrency}</span>
            </div>
            <p className="line-clamp-2">{eventContent.eventDescription}</p>
          </div>
        );
      case 'text':
        return (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {section.content.body || 'Sin contenido'}
          </p>
        );
      case 'hero':
        return (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {section.content.headline || 'Sin título'}
          </p>
        );
      default:
        return (
          <p className="text-sm text-muted-foreground">
            Sección de tipo {section.type}
          </p>
        );
    }
  };

  const renderSectionForm = () => {
    switch (formData.type) {
      case 'event':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventTitle">Título del Evento</Label>
                <Input
                  id="eventTitle"
                  value={formData.content?.eventTitle || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    content: { ...formData.content, eventTitle: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="eventPrice">Precio</Label>
                <Input
                  id="eventPrice"
                  type="number"
                  value={formData.content?.eventPrice || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    content: { ...formData.content, eventPrice: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="eventDescription">Descripción</Label>
              <Textarea
                id="eventDescription"
                value={formData.content?.eventDescription || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  content: { ...formData.content, eventDescription: e.target.value }
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventDate">Fecha</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={formData.content?.eventDate || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    content: { ...formData.content, eventDate: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="eventTime">Hora</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={formData.content?.eventTime || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    content: { ...formData.content, eventTime: e.target.value }
                  })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventLocation">Ubicación</Label>
                <Input
                  id="eventLocation"
                  value={formData.content?.eventLocation || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    content: { ...formData.content, eventLocation: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="maxTickets">Máximo de Tickets</Label>
                <Input
                  id="maxTickets"
                  type="number"
                  value={formData.content?.maxTickets || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    content: { ...formData.content, maxTickets: parseInt(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isTicketSaleActive"
                checked={formData.content?.isTicketSaleActive || false}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  content: { 
                    ...formData.content, 
                    isTicketSaleActive: checked,
                    eventCurrency: 'USD',
                    soldTickets: 0,
                    eventFeatures: []
                  }
                })}
              />
              <Label htmlFor="isTicketSaleActive">Venta de tickets activa</Label>
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="headline">Título (opcional)</Label>
              <Input
                id="headline"
                value={formData.content?.headline || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  content: { ...formData.content, headline: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="body">Contenido</Label>
              <Textarea
                id="body"
                rows={4}
                value={formData.content?.body || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  content: { ...formData.content, body: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="alignment">Alineación</Label>
              <Select
                value={formData.content?.alignment || 'left'}
                onValueChange={(value) => setFormData({
                  ...formData,
                  content: { ...formData.content, alignment: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Izquierda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Derecha</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      default:
        return (
          <p className="text-muted-foreground">
            Formulario para tipo {formData.type} no implementado aún.
          </p>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestor de Contenido</h2>
          <p className="text-muted-foreground">
            Administra las secciones dinámicas de tu sitio web
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateSection}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Sección
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSection ? 'Editar Sección' : 'Nueva Sección'}
              </DialogTitle>
              <DialogDescription>
                {editingSection ? 'Modifica los datos de la sección' : 'Crea una nueva sección para tu sitio web'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Título de la Sección</Label>
                  <Input
                    id="title"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo de Sección</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      type: value as CMSSection['type'],
                      content: {} // Reset content when type changes
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="event">Evento</SelectItem>
                      <SelectItem value="hero">Hero</SelectItem>
                      <SelectItem value="image">Imagen</SelectItem>
                      <SelectItem value="gallery">Galería</SelectItem>
                      <SelectItem value="testimonial">Testimonios</SelectItem>
                      <SelectItem value="cta">Call to Action</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {renderSectionForm()}
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Sección activa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSection}>
                {editingSection ? 'Guardar Cambios' : 'Crear Sección'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {sections.map((section, index) => (
                <Draggable key={section.id} draggableId={section.id} index={index}>
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`${!section.isActive ? 'opacity-60' : ''}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{section.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{section.type}</Badge>
                                <Badge variant={section.isActive ? "default" : "secondary"}>
                                  {section.isActive ? "Activa" : "Inactiva"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(section)}
                            >
                              {section.isActive ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSection(section)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSection(section.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {renderSectionContent(section)}
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {sections.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No hay secciones creadas. Crea tu primera sección para comenzar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}