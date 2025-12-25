import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Booking } from '@/types';

export interface CheckinEvidence {
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    heading?: number;
    speed?: number;
  };
  deviceInfo: {
    userAgent: string;
    platform: string;
    language: string;
    timezone: string;
    screenResolution: string;
  };
  distanceToVenue: number;
  photo?: string;
  photos?: string[]; // Base64 encoded photos
  ipAddress?: string;
  verificationStatus: 'verified' | 'approximate' | 'failed';
}

export interface DisputeEvidence {
  id: string;
  bookingId: string;
  type: 'checkin' | 'payment' | 'communication' | 'cancellation' | 'no_show';
  timestamp: string;
  data: any;
  metadata: {
    createdBy: string;
    source: 'automatic' | 'manual';
    reliability: 'high' | 'medium' | 'low';
  };
}

export interface BookingAuditLog {
  id: string;
  bookingId: string;
  action: string;
  timestamp: string;
  userId: string;
  userType: 'customer' | 'admin' | 'system';
  details: any;
  ipAddress?: string;
  userAgent?: string;
}

class EvidenceSystem {
  private static instance: EvidenceSystem;

  public static getInstance(): EvidenceSystem {
    if (!EvidenceSystem.instance) {
      EvidenceSystem.instance = new EvidenceSystem();
    }
    return EvidenceSystem.instance;
  }

  /**
   * Registra evidencia de check-in por geolocalización
   */
  async recordCheckinEvidence(
    bookingId: string, 
    userId: string, 
    evidence: CheckinEvidence
  ): Promise<string> {
    try {
      const evidenceId = `checkin_${bookingId}_${Date.now()}`;
      
      const disputeEvidence: DisputeEvidence = {
        id: evidenceId,
        bookingId,
        type: 'checkin',
        timestamp: evidence.timestamp,
        data: {
          location: evidence.location,
          deviceInfo: evidence.deviceInfo,
          distanceToVenue: evidence.distanceToVenue,
          verificationStatus: evidence.verificationStatus,
          ipAddress: evidence.ipAddress,
          photosCount: evidence.photos?.length || 0
        },
        metadata: {
          createdBy: userId,
          source: 'automatic',
          reliability: evidence.verificationStatus === 'verified' ? 'high' : 
                      evidence.verificationStatus === 'approximate' ? 'medium' : 'low'
        }
      };

      // Guardar evidencia principal
      if (!db) throw new Error('Firebase not initialized');
      await setDoc(doc(db!, 'dispute_evidence', evidenceId), disputeEvidence);

      // Guardar fotos por separado si existen (para optimizar consultas)
      if (evidence.photos && evidence.photos.length > 0) {
        const photosDoc = {
          evidenceId,
          bookingId,
          photos: evidence.photos,
          timestamp: evidence.timestamp
        };
        if (!db) return evidenceId;
        await setDoc(doc(db!, 'evidence_photos', evidenceId), photosDoc);
      }

      // Registrar en audit log
      await this.logBookingAction(
        bookingId,
        'checkin_completed',
        userId,
        'customer',
        {
          location: `${evidence.location.latitude.toFixed(6)}, ${evidence.location.longitude.toFixed(6)}`,
          accuracy: evidence.location.accuracy,
          distanceToVenue: evidence.distanceToVenue,
          verificationStatus: evidence.verificationStatus
        }
      );

      console.log('✅ Check-in evidence recorded:', evidenceId);
      return evidenceId;

    } catch (error) {
      console.error('❌ Error recording check-in evidence:', error);
      throw new Error('Failed to record check-in evidence');
    }
  }

  /**
   * Registra evidencia de pago
   */
  async recordPaymentEvidence(
    bookingId: string,
    paymentIntentId: string,
    paymentData: any,
    userId: string
  ): Promise<string> {
    try {
      const evidenceId = `payment_${bookingId}_${Date.now()}`;
      
      const disputeEvidence: DisputeEvidence = {
        id: evidenceId,
        bookingId,
        type: 'payment',
        timestamp: new Date().toISOString(),
        data: {
          paymentIntentId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          paymentMethod: paymentData.payment_method,
          status: paymentData.status,
          receiptUrl: paymentData.charges?.data[0]?.receipt_url
        },
        metadata: {
          createdBy: userId,
          source: 'automatic',
          reliability: 'high'
        }
      };

      if (!db) throw new Error('Firebase not initialized');
      await setDoc(doc(db!, 'dispute_evidence', evidenceId), disputeEvidence);

      await this.logBookingAction(
        bookingId,
        'payment_completed',
        userId,
        'customer',
        {
          paymentIntentId,
          amount: paymentData.amount,
          currency: paymentData.currency
        }
      );

      return evidenceId;

    } catch (error) {
      console.error('❌ Error recording payment evidence:', error);
      throw new Error('Failed to record payment evidence');
    }
  }

  /**
   * Registra evidencia de no-show
   */
  async recordNoShowEvidence(
    bookingId: string,
    adminUserId: string,
    reason: string,
    additionalData?: any
  ): Promise<string> {
    try {
      const evidenceId = `no_show_${bookingId}_${Date.now()}`;
      
      const disputeEvidence: DisputeEvidence = {
        id: evidenceId,
        bookingId,
        type: 'no_show',
        timestamp: new Date().toISOString(),
        data: {
          reason,
          markedBy: adminUserId,
          additionalData
        },
        metadata: {
          createdBy: adminUserId,
          source: 'manual',
          reliability: 'high'
        }
      };

      if (!db) throw new Error('Firebase not initialized');
      await setDoc(doc(db!, 'dispute_evidence', evidenceId), disputeEvidence);

      await this.logBookingAction(
        bookingId,
        'marked_no_show',
        adminUserId,
        'admin',
        { reason, additionalData }
      );

      return evidenceId;

    } catch (error) {
      console.error('❌ Error recording no-show evidence:', error);
      throw new Error('Failed to record no-show evidence');
    }
  }

  /**
   * Registra evidencia de cancelación
   */
  async recordCancellationEvidence(
    bookingId: string,
    userId: string,
    userType: 'customer' | 'admin',
    reason: string,
    refundAmount?: number
  ): Promise<string> {
    try {
      const evidenceId = `cancellation_${bookingId}_${Date.now()}`;
      
      const disputeEvidence: DisputeEvidence = {
        id: evidenceId,
        bookingId,
        type: 'cancellation',
        timestamp: new Date().toISOString(),
        data: {
          reason,
          cancelledBy: userId,
          userType,
          refundAmount,
          cancellationTime: new Date().toISOString()
        },
        metadata: {
          createdBy: userId,
          source: 'manual',
          reliability: 'high'
        }
      };

      if (!db) throw new Error('Firebase not initialized');
      await setDoc(doc(db!, 'dispute_evidence', evidenceId), disputeEvidence);

      await this.logBookingAction(
        bookingId,
        'booking_cancelled',
        userId,
        userType,
        { reason, refundAmount }
      );

      return evidenceId;

    } catch (error) {
      console.error('❌ Error recording cancellation evidence:', error);
      throw new Error('Failed to record cancellation evidence');
    }
  }

  /**
   * Obtiene todas las evidencias para una reserva
   */
  async getBookingEvidence(bookingId: string): Promise<DisputeEvidence[]> {
    try {
      if (!db) return [];
      const q = query(
        collection(db!, 'dispute_evidence'),
        where('bookingId', '==', bookingId)
      );
      
      const querySnapshot = await getDocs(q);
      const evidence: DisputeEvidence[] = [];
      
      querySnapshot.forEach((doc) => {
        evidence.push(doc.data() as DisputeEvidence);
      });

      return evidence.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

    } catch (error) {
      console.error('❌ Error getting booking evidence:', error);
      throw new Error('Failed to retrieve booking evidence');
    }
  }

  /**
   * Obtiene evidencias para una disputa de Stripe
   */
  async getStripeDisputeEvidence(bookingId: string): Promise<{
    serviceDocumentation: string;
    customerCommunication: string;
    proofOfService: string;
    additionalEvidence: any[];
  }> {
    try {
      const evidence = await this.getBookingEvidence(bookingId);
      const auditLog = await this.getBookingAuditLog(bookingId);

      // Construir documentación de servicio
      const serviceDocumentation = this.buildServiceDocumentation(evidence, auditLog);
      
      // Construir comunicación con cliente
      const customerCommunication = this.buildCustomerCommunication(auditLog);
      
      // Construir prueba de servicio
      const proofOfService = this.buildProofOfService(evidence);

      return {
        serviceDocumentation,
        customerCommunication,
        proofOfService,
        additionalEvidence: evidence
      };

    } catch (error) {
      console.error('❌ Error building Stripe dispute evidence:', error);
      throw new Error('Failed to build dispute evidence');
    }
  }

  /**
   * Registra acción en audit log
   */
  async logBookingAction(
    bookingId: string,
    action: string,
    userId: string,
    userType: 'customer' | 'admin' | 'system',
    details: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const logId = `${bookingId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const auditLog: BookingAuditLog = {
        id: logId,
        bookingId,
        action,
        timestamp: new Date().toISOString(),
        userId,
        userType,
        details,
        ipAddress,
        userAgent
      };

      if (!db) return;
      await setDoc(doc(db!, 'booking_audit_log', logId), auditLog);

    } catch (error) {
      console.error('❌ Error logging booking action:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  /**
   * Obtiene audit log de una reserva
   */
  async getBookingAuditLog(bookingId: string): Promise<BookingAuditLog[]> {
    try {
      if (!db) return [];
      const q = query(
        collection(db!, 'booking_audit_log'),
        where('bookingId', '==', bookingId)
      );
      
      const querySnapshot = await getDocs(q);
      const logs: BookingAuditLog[] = [];
      
      querySnapshot.forEach((doc) => {
        logs.push(doc.data() as BookingAuditLog);
      });

      return logs.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

    } catch (error) {
      console.error('❌ Error getting audit log:', error);
      return [];
    }
  }

  /**
   * Construye documentación de servicio para Stripe
   */
  private buildServiceDocumentation(evidence: DisputeEvidence[], auditLog: BookingAuditLog[]): string {
    const checkinEvidence = evidence.find(e => e.type === 'checkin');
    const paymentEvidence = evidence.find(e => e.type === 'payment');
    
    let documentation = "GOLF BOOKING SERVICE DOCUMENTATION\n\n";
    
    if (paymentEvidence) {
      documentation += `Payment processed: ${paymentEvidence.timestamp}\n`;
      documentation += `Payment ID: ${paymentEvidence.data.paymentIntentId}\n`;
      documentation += `Amount: ${paymentEvidence.data.amount} ${paymentEvidence.data.currency}\n\n`;
    }
    
    if (checkinEvidence) {
      documentation += `Customer check-in verified: ${checkinEvidence.timestamp}\n`;
      documentation += `Location verified: ${checkinEvidence.data.location.latitude}, ${checkinEvidence.data.location.longitude}\n`;
      documentation += `Distance to venue: ${checkinEvidence.data.distanceToVenue}m\n`;
      documentation += `Verification status: ${checkinEvidence.data.verificationStatus}\n\n`;
    }
    
    documentation += "BOOKING TIMELINE:\n";
    auditLog.forEach(log => {
      documentation += `${log.timestamp}: ${log.action} by ${log.userType}\n`;
    });
    
    return documentation;
  }

  /**
   * Construye comunicación con cliente para Stripe
   */
  private buildCustomerCommunication(auditLog: BookingAuditLog[]): string {
    let communication = "CUSTOMER COMMUNICATION LOG\n\n";
    
    const communicationLogs = auditLog.filter(log => 
      log.action.includes('email') || 
      log.action.includes('notification') ||
      log.action.includes('confirmation')
    );
    
    communicationLogs.forEach(log => {
      communication += `${log.timestamp}: ${log.action}\n`;
      if (log.details) {
        communication += `Details: ${JSON.stringify(log.details)}\n`;
      }
      communication += "\n";
    });
    
    return communication;
  }

  /**
   * Construye prueba de servicio para Stripe
   */
  private buildProofOfService(evidence: DisputeEvidence[]): string {
    let proof = "PROOF OF SERVICE DELIVERY\n\n";
    
    const checkinEvidence = evidence.find(e => e.type === 'checkin');
    if (checkinEvidence) {
      proof += `✓ Customer physically present at golf course\n`;
      proof += `✓ Location verified with GPS coordinates\n`;
      proof += `✓ Check-in completed at: ${checkinEvidence.timestamp}\n`;
      proof += `✓ Verification accuracy: ±${checkinEvidence.data.location.accuracy}m\n`;
      
      if (checkinEvidence.data.photosCount > 0) {
        proof += `✓ Photo evidence captured: ${checkinEvidence.data.photosCount} photos\n`;
      }
    }
    
    const completionEvidence = evidence.find(e => e.type === 'no_show');
    if (!completionEvidence) {
      proof += `✓ No no-show recorded - service likely completed\n`;
    }
    
    return proof;
  }
}

export const evidenceSystem = EvidenceSystem.getInstance();
