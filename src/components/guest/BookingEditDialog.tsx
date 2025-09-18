'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  CalendarIcon, 
  ClockIcon, 
  UsersIcon, 
  CreditCardIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  MinusIcon,
  PlusIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  X
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Booking, GolfCourse, BookingStatus, BookingAddOn } from '@/types'
import { bookingEditService, EditableBookingData, EditPreview } from '@/lib/booking-edit-service'
import { 
  cancellationPolicyService,
  CancellationValidators,
  type RefundCalculation,
} from '@/lib/cancellation-policies'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface BookingEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: Booking
  course: GolfCourse
  onBookingUpdated: (booking: Booking) => void
}

type EditStep = 'datetime' | 'players' | 'summary' | 'confirmation'

const AVAILABLE_ADD_ONS: BookingAddOn[] = [
  { id: 'cart', name: 'Carrito de Golf', price: 450, quantity: 0, type: 'cart' },
  { id: 'caddie', name: 'Caddie', price: 800, quantity: 0, type: 'caddie' },
  { id: 'club_rental', name: 'Renta de Palos', price: 350, quantity: 0, type: 'club_rental' },
  { id: 'lesson', name: 'Lección de Golf', price: 1200, quantity: 0, type: 'lesson' }
]

const TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
]

export function BookingEditDialog({ 
  open, 
  onOpenChange, 
  booking, 
  course, 
  onBookingUpdated 
}: BookingEditDialogProps) {
  const [currentStep, setCurrentStep] = useState<EditStep>('datetime')
  const [editData, setEditData] = useState<EditableBookingData>({})
  const [preview, setPreview] = useState<EditPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [playerCount, setPlayerCount] = useState(booking.numberOfPlayers)
  const [addOns, setAddOns] = useState<BookingAddOn[]>(() => {
    return AVAILABLE_ADD_ONS.map(addon => {
      const existing = booking.addOns?.find(b => b.id === addon.id)
      return existing ? { ...addon, quantity: existing.quantity } : addon
    })
  })
  const [customerInfo, setCustomerInfo] = useState({
    name: booking.customerInfo?.name || '',
    phone: booking.customerInfo?.phone || '',
    email: booking.customerInfo?.email || '',
    rfc: booking.customerInfo?.rfc || '',
    companyName: booking.customerInfo?.companyName || '',
    notes: booking.customerInfo?.notes || ''
  })
  
  // Estados para cancelación
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [refundCalculation, setRefundCalculation] = useState<RefundCalculation | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const steps = [
    { id: 'datetime', title: 'Fecha y Hora', icon: CalendarIcon },
    { id: 'players', title: 'Jugadores y Add-ons', icon: UsersIcon },
    { id: 'summary', title: 'Resumen y Pago', icon: CreditCardIcon },
    { id: 'confirmation', title: 'Confirmación', icon: CheckCircleIcon }
  ]

  const currentStepIndex = steps.findIndex(step => step.id === currentStep)

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setCurrentStep('datetime')
      setEditData({})
      setPreview(null)
      setSelectedDate(new Date(booking.date))
      setSelectedTime(booking.time)
      setPlayerCount(booking.players)
    }
  }, [open, booking])

  useEffect(() => {
    // Update edit data when form changes
    const newEditData: EditableBookingData = {}
    
    if (selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const newDateTime = new Date(selectedDate)
      newDateTime.setHours(hours, minutes, 0, 0)
      
      if (booking.teeDateTime && newDateTime.getTime() !== new Date(booking.teeDateTime).getTime()) {
        newEditData.teeDateTime = newDateTime
      }
    }
    
    if (playerCount !== booking.numberOfPlayers) {
      newEditData.numberOfPlayers = playerCount
    }
    
    const selectedAddOns = addOns.filter(addon => addon.quantity > 0)
    const currentAddOns = booking.addOns || []
    const addOnsChanged = JSON.stringify(selectedAddOns) !== JSON.stringify(currentAddOns)
    
    if (addOnsChanged) {
      newEditData.addOns = selectedAddOns
    }
    
    // Check if customer info changed
    const infoChanged = Object.keys(customerInfo).some(
      key => customerInfo[key as keyof typeof customerInfo] !== 
             booking.customerInfo?.[key as keyof typeof booking.customerInfo]
    )
    
    if (infoChanged) {
      newEditData.customerInfo = customerInfo
    }
    
    setEditData(newEditData)
  }, [selectedDate, selectedTime, playerCount, addOns, customerInfo, booking])

  const generatePreview = async () => {
    if (Object.keys(editData).length === 0) {
      setPreview(null)
      return
    }
    
    setLoading(true)
    try {
      const previewResult = await bookingEditService.calculateEditPreview(
        booking,
        course,
        editData,
        booking.customerInfo?.email || booking.userId
      )
      setPreview(previewResult)
    } catch (error) {
      console.error('Error generating preview:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNext = async () => {
    if (currentStep === 'players') {
      await generatePreview()
    }
    
    const nextIndex = Math.min(currentStepIndex + 1, steps.length - 1)
    setCurrentStep(steps[nextIndex].id as EditStep)
  }

  const handlePrevious = () => {
    const prevIndex = Math.max(currentStepIndex - 1, 0)
    setCurrentStep(steps[prevIndex].id as EditStep)
  }

  const handleConfirm = async () => {
    if (!preview || !preview.validation.canEdit) return
    
    setLoading(true)
    try {
      const idempotencyKey = `edit-${booking.id}-${Date.now()}`
      const result = await bookingEditService.executeEdit(
        booking,
        course,
        editData,
        booking.customerInfo?.email || booking.userId,
        idempotencyKey
      )
      
      if (result.success && result.updatedBooking) {
        onBookingUpdated(result.updatedBooking)
        onOpenChange(false)
      } else {
        console.error('Error updating booking:', result.error)
      }
    } catch (error) {
      console.error('Error confirming edit:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateAddOnQuantity = (addonId: string, change: number) => {
    setAddOns(prev => prev.map(addon => 
      addon.id === addonId 
        ? { ...addon, quantity: Math.max(0, addon.quantity + change) }
        : addon
    ))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'datetime':
        return selectedDate && selectedTime
      case 'players':
        return (playerCount || 1) >= 1 && (playerCount || 1) <= 4
      case 'summary':
        return preview && preview.validation.canEdit
      default:
        return true
    }
  }

  // Funciones para cancelación
  useEffect(() => {
    const bookingDate = new Date(booking.date)
    const calculation = cancellationPolicyService.calculateRefund(
      booking.courseId || 'default-course',
      bookingDate,
      booking.totalPrice,
      'customer_request'
    )
    setRefundCalculation(calculation)
  }, [booking])

  const isPastBooking = () => {
    const bookingDate = new Date(booking.date)
    const now = new Date()
    return bookingDate < now
  }

  const canCancel = () => {
    if (isPastBooking()) return false
    if (!['confirmed', 'pending', 'rescheduled'].includes(booking.status)) return false
    
    const bookingDate = new Date(booking.date)
    return CancellationValidators.canCancel(booking.status as BookingStatus, bookingDate)
  }

  const handleCancel = async () => {
    setCancelLoading(true)
    try {
      if (refundCalculation) {
        toast({
          title: "Solicitud de cancelación enviada",
          description: `Tu solicitud ha sido enviada. ${refundCalculation.description}`,
        })
      }
      
      setShowCancelDialog(false)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar la cancelación. Intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setCancelLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'datetime':
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Seleccionar nueva fecha</Label>
              <div className="mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div>
              <Label className="text-base font-medium">Seleccionar hora</Label>
              <div className="mt-2">
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(time => (
                      <SelectItem key={time} value={time}>
                        <div className="flex items-center">
                          <ClockIcon className="mr-2 h-4 w-4" />
                          {time}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {selectedDate && selectedTime && (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  Nueva fecha y hora: {format(selectedDate, "PPP", { locale: es })} a las {selectedTime}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )
        
      case 'players':
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Número de jugadores</Label>
              <div className="flex items-center space-x-4 mt-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPlayerCount(Math.max(1, (playerCount || 1) - 1))}
                  disabled={(playerCount || 1) <= 1}
                >
                  <MinusIcon className="h-4 w-4" />
                </Button>
                <div className="flex items-center space-x-2">
                  <UsersIcon className="h-5 w-5" />
                  <span className="text-xl font-semibold">{playerCount}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPlayerCount(Math.min(4, (playerCount || 1) + 1))}
                  disabled={(playerCount || 1) >= 4}
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Mínimo: 1, Máximo: 4
              </p>
            </div>
            
            <Separator />
            
            <div>
              <Label className="text-base font-medium">Servicios adicionales</Label>
              <div className="space-y-3 mt-3">
                {addOns.map(addon => (
                  <div key={addon.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{addon.name}</h4>
                      <p className="text-sm text-muted-foreground">${addon.price} USD</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateAddOnQuantity(addon.id, -1)}
                        disabled={addon.quantity === 0}
                      >
                        <MinusIcon className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{addon.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateAddOnQuantity(addon.id, 1)}
                      >
                        <PlusIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <Label className="text-base font-medium">Información personal</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="rfc">RFC</Label>
                  <Input
                    id="rfc"
                    value={customerInfo.rfc}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, rfc: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notas especiales</Label>
                <Textarea
                  id="notes"
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Comentarios adicionales..."
                />
              </div>
            </div>
          </div>
        )
        
      case 'summary':
        return (
          <div className="space-y-6">
            {preview && (
              <>
                {!preview.validation.canEdit && (
                  <Alert variant="destructive">
                    <AlertTriangleIcon className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {preview.validation.reasons.map((reason, index) => (
                          <div key={index}>• {reason}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                {preview.validation.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangleIcon className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {preview.validation.warnings.map((warning, index) => (
                          <div key={index}>• {warning}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                <Card>
                  <CardHeader>
                    <CardTitle>Resumen de cambios</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {preview.changes.map((change, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{change.description}</span>
                        <Badge variant="outline">{change.field}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Resumen financiero</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total original:</span>
                      <span>${preview.priceCalculation.originalTotal} USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nuevo total:</span>
                      <span>${preview.priceCalculation.newTotal} USD</span>
                    </div>
                    
                    {preview.priceCalculation.fees.rescheduleFee > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Fee de reprogramación:</span>
                        <span>+${preview.priceCalculation.fees.rescheduleFee} USD</span>
                      </div>
                    )}
                    
                    {preview.priceCalculation.refunds.playerReduction > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Reembolso por jugadores:</span>
                        <span>-${preview.priceCalculation.refunds.playerReduction} USD</span>
                      </div>
                    )}
                    
                    {preview.priceCalculation.refunds.addOnRemoval > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Reembolso por add-ons:</span>
                        <span>-${preview.priceCalculation.refunds.addOnRemoval} USD</span>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total a {preview.priceCalculation.finalAmount >= 0 ? 'cobrar' : 'reembolsar'}:</span>
                      <span className={preview.priceCalculation.finalAmount >= 0 ? 'text-red-600' : 'text-green-600'}>
                        ${Math.abs(preview.priceCalculation.finalAmount)} USD
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Políticas aplicables</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div>• {preview.policies.cancellationPolicy}</div>
                    <div>• {preview.policies.reschedulePolicy}</div>
                    <div>• {preview.policies.refundPolicy}</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )
        
      case 'confirmation':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">¡Reserva actualizada exitosamente!</h3>
              <p className="text-muted-foreground mt-2">
                Los cambios han sido aplicados a tu reserva. Recibirás un email de confirmación con los nuevos detalles.
              </p>
            </div>
            
            {preview && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Folio:</span>
                      <span className="font-mono">{booking.id}</span>
                    </div>
                    {editData.teeDateTime && (
                      <div className="flex justify-between">
                        <span>Nueva fecha:</span>
                        <span>{format(editData.teeDateTime, "PPP 'a las' HH:mm", { locale: es })}</span>
                      </div>
                    )}
                    {editData.numberOfPlayers && (
                      <div className="flex justify-between">
                        <span>Jugadores:</span>
                        <span>{editData.numberOfPlayers}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold">
                      <span>Total final:</span>
                      <span>${preview.priceCalculation.newTotal} MXN</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )
        
      default:
        return null
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Reserva - {booking.id}</DialogTitle>
        </DialogHeader>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = step.id === currentStep
            const isCompleted = index < currentStepIndex
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  isCompleted && "border-green-500 bg-green-500 text-white",
                  !isActive && !isCompleted && "border-muted-foreground text-muted-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className={cn(
                    "text-sm font-medium",
                    isActive && "text-primary",
                    isCompleted && "text-green-600",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-12 h-0.5 mx-4",
                    isCompleted ? "bg-green-500" : "bg-muted"
                  )} />
                )}
              </div>
            )
          })}
        </div>
        
        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0 || loading}
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            
            {canCancel() && (
              <Button 
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
                className="text-destructive hover:text-destructive border-destructive hover:bg-destructive/10"
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar Reserva
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            
            {currentStep === 'confirmation' ? (
              <Button onClick={() => onOpenChange(false)}>
                Finalizar
              </Button>
            ) : currentStep === 'summary' ? (
              <Button 
                onClick={handleConfirm}
                disabled={!canProceed() || loading}
              >
                {loading ? 'Procesando...' : 'Confirmar cambios'}
              </Button>
            ) : (
              <Button 
                onClick={handleNext}
                disabled={!canProceed() || loading}
              >
                Siguiente
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Diálogo de cancelación */}
    <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar reserva?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>¿Estás seguro de que quieres cancelar esta reserva?</p>
            {refundCalculation && (
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium text-sm">
                  Política de reembolso: {refundCalculation.description}
                </p>
                {refundCalculation.refundAmount > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Recibirás ${refundCalculation.refundAmount.toFixed(2)} de reembolso
                  </p>
                )}
                {refundCalculation.fees.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Cargos aplicables: ${refundCalculation.fees.reduce((sum, fee) => sum + fee.amount, 0).toFixed(2)}
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No, mantener reserva</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleCancel}
            disabled={cancelLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {cancelLoading ? "Procesando..." : "Sí, cancelar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  )
}

export default BookingEditDialog