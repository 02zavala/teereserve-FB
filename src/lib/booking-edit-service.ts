import { Booking, GolfCourse, BookingStatus, PaymentStatus, BookingAddOn } from '@/types'
import { auditService } from './audit-system'
import { paymentManager } from './payment-management'
import { cancellationPolicyService } from './cancellation-policies'

// Interfaces para edición de reservas
export interface EditableBookingData {
  teeDateTime?: Date
  numberOfPlayers?: number
  addOns?: BookingAddOn[]
  customerInfo?: {
    name?: string
    phone?: string
    email?: string
    rfc?: string
    companyName?: string
    notes?: string
  }
}



export interface EditValidationResult {
  canEdit: boolean
  reasons: string[]
  warnings: string[]
}

export interface PriceCalculation {
  originalTotal: number
  newTotal: number
  difference: number
  fees: {
    rescheduleFee: number
    transferFee: number
  }
  refunds: {
    playerReduction: number
    addOnRemoval: number
  }
  finalAmount: number // Positivo = cobrar, Negativo = reembolsar
}

export interface EditPreview {
  validation: EditValidationResult
  priceCalculation: PriceCalculation
  changes: BookingChange[]
  policies: {
    cancellationPolicy: string
    reschedulePolicy: string
    refundPolicy: string
  }
}

export interface BookingChange {
  field: string
  oldValue: any
  newValue: any
  description: string
}

// Configuración de reglas por campo
export interface CourseEditRules {
  canCancelUntilHours: number // 24-48h
  canRescheduleUntilHours: number // 6-24h
  freeReschedules: number // 1 gratis
  rescheduleFee: number // $149 MXN
  transferFee: number // Fee por transferir reserva
  maxReschedulesPerBooking: number
  minPlayersReductionHours: number // 24h para quitar jugadores
  playerReductionRefundPercent: {
    early: number // >=24h: 100%
    late: number // <24h: 50%
  }
  addOnModificationHours: number // Ventana para modificar add-ons
}

// Configuración por defecto
const DEFAULT_EDIT_RULES: CourseEditRules = {
  canCancelUntilHours: 24,
  canRescheduleUntilHours: 6,
  freeReschedules: 1,
  rescheduleFee: 149,
  transferFee: 99,
  maxReschedulesPerBooking: 3,
  minPlayersReductionHours: 24,
  playerReductionRefundPercent: {
    early: 100,
    late: 50
  },
  addOnModificationHours: 6
}

class BookingEditService {
  private editRules: Map<string, CourseEditRules> = new Map()
  private rateLimits: Map<string, { count: number; resetTime: Date }> = new Map()

  constructor() {
    // Cargar reglas por campo desde configuración
    this.loadCourseRules()
  }

  private loadCourseRules() {
    // En producción, esto vendría de la base de datos
    // Por ahora usamos reglas por defecto
  }

  private getCourseRules(courseId: string): CourseEditRules {
    return this.editRules.get(courseId) || DEFAULT_EDIT_RULES
  }

  // Validar si una reserva puede ser editada
  async validateEdit(
    booking: Booking,
    course: GolfCourse,
    newData: EditableBookingData,
    userId: string
  ): Promise<EditValidationResult> {
    const reasons: string[] = []
    const warnings: string[] = []
    const rules = this.getCourseRules(course.id)
    const now = new Date()
    
    if (!booking.teeDateTime) {
      reasons.push('Fecha y hora de tee time no válida')
      return { canEdit: false, reasons, warnings }
    }
    
    const teeTime = new Date(booking.teeDateTime)
    const hoursUntilTee = (teeTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    // 1. Validar estado de la reserva
    if (!['confirmed', 'rescheduled'].includes(booking.status)) {
      reasons.push(`No se puede editar una reserva con estado: ${booking.status}`)
    }

    // 2. Validar que no haya pasado el tee time
    if (hoursUntilTee <= 0) {
      reasons.push('No se puede editar una reserva que ya pasó')
    }

    // 3. Validar ventana de edición general
    if (hoursUntilTee < rules.canRescheduleUntilHours) {
      reasons.push(`No se puede editar dentro de las ${rules.canRescheduleUntilHours} horas previas al tee time`)
    }

    // 4. Validar rate limiting
    const rateLimitResult = this.checkRateLimit(userId)
    if (!rateLimitResult.allowed) {
      reasons.push(`Límite de ediciones excedido. Intenta en ${rateLimitResult.resetMinutes} minutos`)
    }

    // 5. Validar límite de reprogramaciones
    if (newData.teeDateTime) {
      const reschedulesUsed = booking.reschedulesUsed || 0
      if (reschedulesUsed >= rules.maxReschedulesPerBooking) {
        reasons.push(`Máximo de ${rules.maxReschedulesPerBooking} reprogramaciones alcanzado`)
      }
    }

    // 6. Validar cambios específicos
    if (newData.numberOfPlayers) {
      const playerValidation = this.validatePlayerChange(
        booking,
        course,
        newData.numberOfPlayers,
        hoursUntilTee,
        rules
      )
      reasons.push(...playerValidation.reasons)
      warnings.push(...playerValidation.warnings)
    }

    // 7. Validar nueva fecha/hora si se especifica
    if (newData.teeDateTime) {
      const dateValidation = await this.validateDateTimeChange(
        booking,
        course,
        newData.teeDateTime,
        newData.numberOfPlayers || booking.numberOfPlayers || booking.players || 1
      )
      reasons.push(...dateValidation.reasons)
      warnings.push(...dateValidation.warnings)
    }

    // 8. Validar disputas activas
    if (booking.paymentStatus === 'disputed') {
      reasons.push('No se puede editar una reserva con disputa activa')
    }

    return {
      canEdit: reasons.length === 0,
      reasons,
      warnings
    }
  }

  private validatePlayerChange(
    booking: Booking,
    course: GolfCourse,
    newPlayerCount: number,
    hoursUntilTee: number,
    rules: CourseEditRules
  ): { reasons: string[]; warnings: string[] } {
    const reasons: string[] = []
    const warnings: string[] = []
    const currentPlayers = booking.numberOfPlayers || booking.players || 1

    // Validar límites del curso (usar valores por defecto si no están definidos)
    const minPlayers = 1; // Default minimum players
    const maxPlayers = 4; // Default maximum players
    if (newPlayerCount < minPlayers || newPlayerCount > maxPlayers) {
      reasons.push(`El número de jugadores debe estar entre ${minPlayers} y ${maxPlayers}`)
    }

    // Validar reducción de jugadores
    if (newPlayerCount < currentPlayers) {
      if (hoursUntilTee < rules.minPlayersReductionHours) {
        warnings.push(`Reducir jugadores con menos de ${rules.minPlayersReductionHours}h de anticipación solo otorga ${rules.playerReductionRefundPercent.late}% de reembolso`)
      }
    }

    return { reasons, warnings }
  }

  private async validateDateTimeChange(
    booking: Booking,
    course: GolfCourse,
    newDateTime: Date,
    playerCount: number
  ): Promise<{ reasons: string[]; warnings: string[] }> {
    const reasons: string[] = []
    const warnings: string[] = []
    const now = new Date()

    // Validar que la nueva fecha sea futura
    if (newDateTime <= now) {
      reasons.push('La nueva fecha debe ser futura')
    }

    // Validar lead time del curso
    const hoursUntilNewTee = (newDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    const minLeadTime = 3 // Default minimum lead time in hours
    if (hoursUntilNewTee < minLeadTime) {
      reasons.push(`Se requiere mínimo ${minLeadTime} horas de anticipación`)
    }

    // Validar disponibilidad (simulado)
    const hasCapacity = await this.checkSlotCapacity(course.id, newDateTime, playerCount)
    if (!hasCapacity) {
      reasons.push('No hay disponibilidad para la fecha y hora seleccionada')
    }

    return { reasons, warnings }
  }

  private async checkSlotCapacity(courseId: string, dateTime: Date, players: number): Promise<boolean> {
    // En producción, esto consultaría la base de datos de disponibilidad
    // Por ahora simulamos disponibilidad
    return Math.random() > 0.3 // 70% de probabilidad de disponibilidad
  }

  private checkRateLimit(userId: string): { allowed: boolean; resetMinutes: number } {
    const limit = this.rateLimits.get(userId)
    const now = new Date()
    const maxEditsPerHour = 5

    if (!limit || now > limit.resetTime) {
      // Resetear límite
      this.rateLimits.set(userId, {
        count: 1,
        resetTime: new Date(now.getTime() + 60 * 60 * 1000) // +1 hora
      })
      return { allowed: true, resetMinutes: 0 }
    }

    if (limit.count >= maxEditsPerHour) {
      const resetMinutes = Math.ceil((limit.resetTime.getTime() - now.getTime()) / (1000 * 60))
      return { allowed: false, resetMinutes }
    }

    limit.count++
    return { allowed: true, resetMinutes: 0 }
  }

  // Calcular preview de cambios y costos
  async calculateEditPreview(
    booking: Booking,
    course: GolfCourse,
    newData: EditableBookingData,
    userId: string
  ): Promise<EditPreview> {
    const validation = await this.validateEdit(booking, course, newData, userId)
    const priceCalculation = this.calculatePriceChanges(booking, course, newData)
    const changes = this.detectChanges(booking, newData)
    const policies = this.getPoliciesInfo(course)

    return {
      validation,
      priceCalculation,
      changes,
      policies
    }
  }

  private calculatePriceChanges(
    booking: Booking,
    course: GolfCourse,
    newData: EditableBookingData
  ): PriceCalculation {
    const rules = this.getCourseRules(course.id)
    const originalTotal = booking.pricing_snapshot?.total_cents ? booking.pricing_snapshot.total_cents / 100 : 0
    let newTotal = originalTotal
    let rescheduleFee = 0
    let transferFee = 0
    let playerReduction = 0
    let addOnRemoval = 0

    // Calcular fee de reprogramación
    if (newData.teeDateTime) {
      const reschedulesUsed = booking.reschedulesUsed || 0
      if (reschedulesUsed >= rules.freeReschedules) {
        rescheduleFee = rules.rescheduleFee
      }
    }

    // Calcular diferencia por cambio de jugadores
    if (newData.numberOfPlayers && newData.numberOfPlayers !== booking.numberOfPlayers) {
      const currentPlayers = booking.numberOfPlayers || booking.players || 1
      const playerDiff = newData.numberOfPlayers - currentPlayers
      const pricePerPlayer = originalTotal / currentPlayers
      
      if (playerDiff > 0) {
        // Agregar jugadores
        newTotal += playerDiff * pricePerPlayer
      } else {
        // Quitar jugadores
        if (!booking.teeDateTime) {
          throw new Error('Booking tee date time is required for player reduction calculation')
        }
        const hoursUntilTee = (new Date(booking.teeDateTime).getTime() - new Date().getTime()) / (1000 * 60 * 60)
        const refundPercent = hoursUntilTee >= rules.minPlayersReductionHours 
          ? rules.playerReductionRefundPercent.early 
          : rules.playerReductionRefundPercent.late
        
        playerReduction = Math.abs(playerDiff) * pricePerPlayer * (refundPercent / 100)
        newTotal -= Math.abs(playerDiff) * pricePerPlayer
      }
    }

    // Calcular diferencia por add-ons
    if (newData.addOns) {
      const currentAddOnTotal = booking.addOns?.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0) || 0
      const newAddOnTotal = newData.addOns.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0)
      
      const addOnDiff = newAddOnTotal - currentAddOnTotal
      newTotal += addOnDiff
      
      if (addOnDiff < 0) {
        addOnRemoval = Math.abs(addOnDiff)
      }
    }

    const difference = newTotal - originalTotal
    const finalAmount = difference + rescheduleFee + transferFee - playerReduction - addOnRemoval

    return {
      originalTotal,
      newTotal,
      difference,
      fees: {
        rescheduleFee,
        transferFee
      },
      refunds: {
        playerReduction,
        addOnRemoval
      },
      finalAmount
    }
  }

  private detectChanges(booking: Booking, newData: EditableBookingData): BookingChange[] {
    const changes: BookingChange[] = []

    if (newData.teeDateTime && booking.teeDateTime && newData.teeDateTime.getTime() !== new Date(booking.teeDateTime).getTime()) {
      changes.push({
        field: 'teeDateTime',
        oldValue: booking.teeDateTime,
        newValue: newData.teeDateTime,
        description: `Fecha y hora cambiada de ${new Date(booking.teeDateTime).toLocaleString()} a ${newData.teeDateTime.toLocaleString()}`
      })
    }

    if (newData.numberOfPlayers && newData.numberOfPlayers !== booking.numberOfPlayers) {
      changes.push({
        field: 'numberOfPlayers',
        oldValue: booking.numberOfPlayers,
        newValue: newData.numberOfPlayers,
        description: `Número de jugadores cambiado de ${booking.numberOfPlayers} a ${newData.numberOfPlayers}`
      })
    }

    if (newData.customerInfo && booking.customerInfo) {
      Object.entries(newData.customerInfo).forEach(([key, value]) => {
        if (value && value !== booking.customerInfo![key as keyof typeof booking.customerInfo]) {
          changes.push({
            field: `customerInfo.${key}`,
            oldValue: booking.customerInfo![key as keyof typeof booking.customerInfo],
            newValue: value,
            description: `${key} cambiado`
          })
        }
      })
    }

    return changes
  }

  private convertToAuditChanges(bookingChanges: BookingChange[]): any[] {
    return bookingChanges.map(change => ({
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      fieldType: this.getFieldType(change.newValue)
    }))
  }

  private getFieldType(value: any): 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array' {
    if (value === null || value === undefined) return 'string'
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'number') return 'number'
    if (value instanceof Date) return 'date'
    if (Array.isArray(value)) return 'array'
    if (typeof value === 'object') return 'object'
    return 'string'
  }

  private getPoliciesInfo(course: GolfCourse): { cancellationPolicy: string; reschedulePolicy: string; refundPolicy: string } {
    const rules = this.getCourseRules(course.id)
    
    return {
      cancellationPolicy: `Cancelación hasta ${rules.canCancelUntilHours}h antes del tee time`,
      reschedulePolicy: `${rules.freeReschedules} reprogramación gratis, posteriores $${rules.rescheduleFee} USD`,
      refundPolicy: `Reembolsos según ventana de tiempo: >=24h: 100%, <24h: 50% crédito`
    }
  }

  // Ejecutar la edición de la reserva
  async executeEdit(
    booking: Booking,
    course: GolfCourse,
    newData: EditableBookingData,
    userId: string,
    idempotencyKey: string
  ): Promise<{ success: boolean; updatedBooking?: Booking; error?: string }> {
    try {
      // 1. Validar nuevamente
      const validation = await this.validateEdit(booking, course, newData, userId)
      if (!validation.canEdit) {
        return {
          success: false,
          error: validation.reasons.join(', ')
        }
      }

      // 2. Calcular cambios de precio
      const priceCalculation = this.calculatePriceChanges(booking, course, newData)

      // 3. Procesar pagos si es necesario
      if (priceCalculation.finalAmount !== 0) {
        const paymentResult = await this.processPaymentChanges(
          booking,
          priceCalculation.finalAmount,
          idempotencyKey
        )
        
        if (!paymentResult.success) {
          return {
            success: false,
            error: paymentResult.error
          }
        }
      }

      // 4. Actualizar inventario si cambió fecha/hora
      if (newData.teeDateTime) {
        const inventoryResult = await this.updateInventory(
          booking,
          course,
          newData.teeDateTime,
          newData.numberOfPlayers || booking.numberOfPlayers || booking.players || 1
        )
        
        if (!inventoryResult.success) {
          return {
            success: false,
            error: inventoryResult.error
          }
        }
      }

      // 5. Actualizar la reserva
      const updatedBooking = await this.updateBooking(booking, newData, priceCalculation)

      // 6. Registrar en auditoría
      await auditService.logAction({
        bookingId: booking.id,
        action: 'booking_updated',
        performedBy: {
          id: userId,
          name: 'Customer',
          role: 'customer'
        },
        changes: this.convertToAuditChanges(this.detectChanges(booking, newData)),
        metadata: {
          priceCalculation,
          idempotencyKey
        }
      })

      return {
        success: true,
        updatedBooking
      }

    } catch (error) {
      console.error('Error executing booking edit:', error)
      return {
        success: false,
        error: 'Error interno del servidor'
      }
    }
  }

  private async processPaymentChanges(
    booking: Booking,
    amount: number,
    idempotencyKey: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (amount > 0) {
        // Cobrar diferencia
        const result = await paymentManager.createPaymentIntent({
          amount,
          currency: 'USD',
          paymentMethodId: 'pm_default', // TODO: Get from user's default payment method
          bookingId: booking.id,
          customerId: booking.customerInfo?.email || booking.userId,
          description: `Diferencia por edición de reserva ${booking.id}`,
          metadata: {
            bookingId: booking.id,
            type: 'booking_edit_charge'
          }
        })
        
        return { success: result.status === 'succeeded' }
      } else {
        // Reembolsar
        const result = await paymentManager.createRefund({
          paymentIntentId: booking.paymentIntentId!,
          amount: Math.abs(amount),
          reason: 'requested_by_customer',
          metadata: {
            bookingId: booking.id,
            type: 'booking_edit_refund'
          }
        })
        
        return { success: result.status === 'succeeded' }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Error procesando el pago'
      }
    }
  }

  private async updateInventory(
    booking: Booking,
    course: GolfCourse,
    newDateTime: Date,
    playerCount: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Liberar slot anterior
      if (booking.teeDateTime && booking.numberOfPlayers) {
        await this.releaseSlot(course.id, new Date(booking.teeDateTime), booking.numberOfPlayers)
      }
      
      // Reservar nuevo slot
      const reserved = await this.reserveSlot(course.id, newDateTime, playerCount)
      
      if (!reserved) {
        // Rollback: volver a reservar el slot original
        if (booking.teeDateTime && booking.numberOfPlayers) {
          await this.reserveSlot(course.id, new Date(booking.teeDateTime), booking.numberOfPlayers)
        }
        return {
          success: false,
          error: 'No se pudo reservar el nuevo horario'
        }
      }
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: 'Error actualizando inventario'
      }
    }
  }

  private async releaseSlot(courseId: string, dateTime: Date, players: number): Promise<void> {
    // Implementar liberación de slot en inventario
  }

  private async reserveSlot(courseId: string, dateTime: Date, players: number): Promise<boolean> {
    // Implementar reserva de slot en inventario
    return true // Simulado
  }

  private async updateBooking(
    booking: Booking,
    newData: EditableBookingData,
    priceCalculation: PriceCalculation
  ): Promise<Booking> {
    const updatedBooking: Booking = {
      ...booking,
      ...(newData.teeDateTime && { teeDateTime: newData.teeDateTime }),
      ...(newData.numberOfPlayers && { numberOfPlayers: newData.numberOfPlayers }),
      ...(newData.addOns && { addOns: newData.addOns }),
      ...(newData.customerInfo && { 
        customerInfo: { ...booking.customerInfo, ...newData.customerInfo }
      }),
      status: newData.teeDateTime ? 'rescheduled' as BookingStatus : booking.status,
      updatedAt: new Date().toISOString()
    }

    // En producción, esto actualizaría la base de datos
    return updatedBooking
  }

  // Transferir reserva a otro usuario
  async transferBooking(
    booking: Booking,
    course: GolfCourse,
    newOwnerId: string,
    currentUserId: string,
    idempotencyKey: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const rules = this.getCourseRules(course.id)
      const now = new Date()
      if (!booking.teeDateTime) {
        throw new Error('Booking tee date time is required for validation')
      }
      const teeTime = new Date(booking.teeDateTime)
      const hoursUntilTee = (teeTime.getTime() - now.getTime()) / (1000 * 60 * 60)

      // Validaciones
      if (hoursUntilTee < rules.canRescheduleUntilHours) {
        return {
          success: false,
          error: `No se puede transferir dentro de las ${rules.canRescheduleUntilHours} horas previas`
        }
      }

      if (!['confirmed', 'rescheduled'].includes(booking.status)) {
        return {
          success: false,
          error: 'No se puede transferir una reserva con este estado'
        }
      }

      // Cobrar fee de transferencia
      if (rules.transferFee > 0) {
        const paymentResult = await paymentManager.createPaymentIntent({
          amount: rules.transferFee,
          currency: 'USD',
          paymentMethodId: 'pm_default', // TODO: Get from user's default payment method
          bookingId: booking.id,
          customerId: currentUserId,
          description: `Fee de transferencia para reserva ${booking.id}`,
          metadata: {
            bookingId: booking.id,
            type: 'transfer_fee'
          }
        })
        
        if (paymentResult.status !== 'succeeded') {
          return {
            success: false,
            error: 'Error procesando el fee de transferencia'
          }
        }
      }

      // Actualizar la reserva
      const updatedBooking = {
        ...booking,
        customerId: newOwnerId,
        transferredFrom: currentUserId,
        transferredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Registrar en auditoría
      await auditService.logAction({
        bookingId: booking.id,
        action: 'booking_updated',
        performedBy: {
          id: currentUserId,
          name: 'Customer',
          role: 'customer'
        },
        changes: [{
          field: 'customerId',
          oldValue: currentUserId,
          newValue: newOwnerId,
          fieldType: 'string'
        }],
        metadata: {
          transferFee: rules.transferFee,
          newOwnerId
        }
      })

      return { success: true }

    } catch (error) {
      console.error('Error transferring booking:', error)
      return {
        success: false,
        error: 'Error interno del servidor'
      }
    }
  }
}

export const bookingEditService = new BookingEditService()
export default bookingEditService