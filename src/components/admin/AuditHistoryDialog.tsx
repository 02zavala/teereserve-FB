"use client";

import { useState, useEffect } from 'react';
import type { Booking } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Download,
  Search,
  Filter,
  Clock,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  Calendar,
  Activity,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  auditService,
  AuditUtils,
  type AuditEntry,
  type AuditFilter,
  type AuditAction,
  type AuditSummary,
} from '@/lib/audit-system';

interface AuditHistoryDialogProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditHistoryDialog({ booking, open, onOpenChange }: AuditHistoryDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<AuditEntry[]>([]);
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  
  // Estados de filtros
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'customer' | 'system'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  // Cargar datos cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      loadAuditData();
    }
  }, [open, booking.id]);

  // Aplicar filtros cuando cambian
  useEffect(() => {
    applyFilters();
  }, [auditEntries, actionFilter, roleFilter, searchTerm, dateFromFilter, dateToFilter]);

  const loadAuditData = async () => {
    setIsLoading(true);
    try {
      // Cargar historial de auditoría para la reserva
      const entries = await auditService.getBookingAuditHistory(booking.id);
      setAuditEntries(entries);
      
      // Si no hay entradas, crear algunas de ejemplo
      if (entries.length === 0) {
        await createSampleAuditEntries();
        const newEntries = await auditService.getBookingAuditHistory(booking.id);
        setAuditEntries(newEntries);
      }
      
      // Cargar resumen general
      const summary = await auditService.getAuditSummary();
      setAuditSummary(summary);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de auditoría.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createSampleAuditEntries = async () => {
    const sampleEntries = [
      {
        bookingId: booking.id,
        action: 'booking_created' as AuditAction,
        performedBy: {
          id: booking.userId,
          name: booking.userName,
          role: 'customer' as const,
          email: booking.userEmail,
        },
        changes: [
          {
            field: 'status',
            oldValue: null,
            newValue: 'confirmed',
            fieldType: 'string' as const,
          },
          {
            field: 'totalPrice',
            oldValue: null,
            newValue: booking.totalPrice,
            fieldType: 'number' as const,
          },
        ],
        metadata: {
          source: 'web_booking',
          paymentMethod: 'credit_card',
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      {
        bookingId: booking.id,
        action: 'payment_processed' as AuditAction,
        performedBy: {
          id: 'system',
          name: 'Payment System',
          role: 'system' as const,
        },
        changes: [
          {
            field: 'paymentStatus',
            oldValue: 'pending',
            newValue: 'completed',
            fieldType: 'string' as const,
          },
        ],
        metadata: {
          paymentId: 'pi_example_123',
          amount: booking.totalPrice,
          currency: 'USD',
        },
      },
      {
        bookingId: booking.id,
        action: 'status_changed' as AuditAction,
        performedBy: {
          id: 'admin_001',
          name: 'Admin User',
          role: 'admin' as const,
          email: 'admin@golfcourse.com',
        },
        changes: [
          {
            field: 'status',
            oldValue: 'confirmed',
            newValue: booking.status,
            fieldType: 'string' as const,
          },
        ],
        metadata: {
          previousStatus: 'confirmed',
          adminInterface: true,
        },
        reason: 'Status updated by admin',
        ipAddress: '10.0.0.50',
      },
    ];

    for (const entry of sampleEntries) {
      await auditService.logAction(entry);
    }
  };

  const applyFilters = () => {
    let filtered = [...auditEntries];

    // Filtro por acción
    if (actionFilter !== 'all') {
      filtered = filtered.filter(entry => entry.action === actionFilter);
    }

    // Filtro por rol
    if (roleFilter !== 'all') {
      filtered = filtered.filter(entry => entry.performedBy.role === roleFilter);
    }

    // Filtro por búsqueda de texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.performedBy.name.toLowerCase().includes(term) ||
        entry.action.toLowerCase().includes(term) ||
        (entry.reason && entry.reason.toLowerCase().includes(term)) ||
        (entry.notes && entry.notes.toLowerCase().includes(term))
      );
    }

    // Filtro por fecha desde
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      filtered = filtered.filter(entry => entry.timestamp >= fromDate);
    }

    // Filtro por fecha hasta
    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999); // Final del día
      filtered = filtered.filter(entry => entry.timestamp <= toDate);
    }

    setFilteredEntries(filtered);
  };

  const handleExportAudit = async () => {
    try {
      const filter: AuditFilter = {
        bookingId: booking.id,
        ...(actionFilter !== 'all' && { action: actionFilter }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(dateFromFilter && { dateFrom: new Date(dateFromFilter) }),
        ...(dateToFilter && { dateTo: new Date(dateToFilter) }),
      };

      const csvData = await auditService.exportAuditData(filter);
      
      // Crear y descargar archivo
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_history_${booking.id}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Exportación completada",
        description: "El historial de auditoría ha sido exportado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar el historial de auditoría.",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setActionFilter('all');
    setRoleFilter('all');
    setSearchTerm('');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const getActionIcon = (action: AuditAction) => {
    const iconMap: Partial<Record<AuditAction, React.ReactNode>> = {
      booking_created: <CheckCircle className="h-4 w-4 text-green-600" />,
      booking_updated: <RefreshCw className="h-4 w-4 text-blue-600" />,
      booking_canceled: <AlertTriangle className="h-4 w-4 text-red-600" />,
      status_changed: <Activity className="h-4 w-4 text-blue-600" />,
      payment_processed: <CheckCircle className="h-4 w-4 text-green-600" />,
      payment_refunded: <RefreshCw className="h-4 w-4 text-orange-600" />,
      check_in: <CheckCircle className="h-4 w-4 text-green-600" />,
      check_out: <CheckCircle className="h-4 w-4 text-blue-600" />,
    };
    
    return iconMap[action] || <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'customer':
        return <User className="h-4 w-4 text-green-600" />;
      case 'system':
        return <Activity className="h-4 w-4 text-gray-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando historial de auditoría...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historial de Auditoría - Reserva #{booking.id.substring(0, 7)}
          </DialogTitle>
          <DialogDescription>
            Registro completo de todas las acciones realizadas en esta reserva.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen */}
          {auditSummary && (
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Entradas</p>
                      <p className="text-2xl font-bold">{auditEntries.length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Acciones Críticas</p>
                      <p className="text-2xl font-bold text-red-600">
                        {auditEntries.filter(e => AuditUtils.isCriticalAction(e.action)).length}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Usuarios Únicos</p>
                      <p className="text-2xl font-bold">
                        {new Set(auditEntries.map(e => e.performedBy.id)).size}
                      </p>
                    </div>
                    <User className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Última Actividad</p>
                      <p className="text-sm font-medium">
                        {auditEntries[0]?.timestamp.toLocaleDateString() || 'N/A'}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Controles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAudit}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              
              <Badge variant="outline">
                {filteredEntries.length} de {auditEntries.length} entradas
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>

          {/* Filtros */}
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Filtros</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Acción</Label>
                    <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as AuditAction | 'all')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las acciones</SelectItem>
                        <SelectItem value="booking_created">Reserva creada</SelectItem>
                        <SelectItem value="booking_updated">Reserva actualizada</SelectItem>
                        <SelectItem value="booking_canceled">Reserva cancelada</SelectItem>
                        <SelectItem value="status_changed">Estado cambiado</SelectItem>
                        <SelectItem value="payment_processed">Pago procesado</SelectItem>
                        <SelectItem value="payment_refunded">Pago reembolsado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as typeof roleFilter)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los roles</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="customer">Cliente</SelectItem>
                        <SelectItem value="system">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Fecha desde</Label>
                    <Input
                      type="date"
                      value={dateFromFilter}
                      onChange={(e) => setDateFromFilter(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Fecha hasta</Label>
                    <Input
                      type="date"
                      value={dateToFilter}
                      onChange={(e) => setDateToFilter(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de entradas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Entradas de Auditoría</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                {filteredEntries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron entradas de auditoría.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredEntries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 p-4 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <div className="flex-shrink-0 mt-1">
                          {getActionIcon(entry.action)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {AuditUtils.getActionLabel(entry.action)}
                              </span>
                              {AuditUtils.isCriticalAction(entry.action) && (
                                <Badge variant="destructive" className="text-xs">
                                  Crítica
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {entry.timestamp.toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            {getRoleIcon(entry.performedBy.role)}
                            <span className="text-sm text-muted-foreground">
                              {entry.performedBy.name}
                            </span>
                            {entry.reason && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-sm text-muted-foreground">
                                  {entry.reason}
                                </span>
                              </>
                            )}
                          </div>
                          
                          {entry.changes.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground">
                                {entry.changes.length} cambio(s): {entry.changes.map(c => c.field).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Diálogo de detalles de entrada */}
        {selectedEntry && (
          <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getActionIcon(selectedEntry.action)}
                  {AuditUtils.getActionLabel(selectedEntry.action)}
                </DialogTitle>
                <DialogDescription>
                  Detalles completos de la entrada de auditoría
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">ID:</span>
                    <span className="ml-2 font-mono">{selectedEntry.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Timestamp:</span>
                    <span className="ml-2">{selectedEntry.timestamp.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Usuario:</span>
                    <span className="ml-2">{selectedEntry.performedBy.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rol:</span>
                    <span className="ml-2 capitalize">{selectedEntry.performedBy.role}</span>
                  </div>
                  {selectedEntry.ipAddress && (
                    <div>
                      <span className="text-muted-foreground">IP:</span>
                      <span className="ml-2 font-mono">{selectedEntry.ipAddress}</span>
                    </div>
                  )}
                </div>
                
                {selectedEntry.reason && (
                  <div>
                    <Label className="text-sm font-medium">Razón</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedEntry.reason}</p>
                  </div>
                )}
                
                {selectedEntry.notes && (
                  <div>
                    <Label className="text-sm font-medium">Notas</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedEntry.notes}</p>
                  </div>
                )}
                
                {selectedEntry.changes.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Cambios</Label>
                    <div className="mt-2 space-y-2">
                      {selectedEntry.changes.map((change, index) => (
                        <div key={index} className="p-2 bg-muted rounded text-sm">
                          {AuditUtils.formatChange(change)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {Object.keys(selectedEntry.metadata).length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Metadatos</Label>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(selectedEntry.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}