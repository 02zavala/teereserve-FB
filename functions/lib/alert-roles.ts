import * as admin from 'firebase-admin';

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface AlertType {
  id: string;
  name: string;
  description: string;
}

export interface AlertRoleConfig {
  id?: string;
  alertType: string;
  allowedRoles: string[];
  isActive: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface UserAlertSettings {
  userId: string;
  telegramChatId: string;
  role: string;
  isActive: boolean;
  alertTypes: string[];
}

export class AlertRoleManager {
  private db: admin.firestore.Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Get alert role configuration for a specific alert type
   */
  async getAlertRoleConfig(alertType: string): Promise<AlertRoleConfig | null> {
    try {
      const configDoc = await this.db
        .collection('alertRoleConfigs')
        .doc(alertType)
        .get();

      if (!configDoc.exists) {
        // Return default configuration if none exists
        return this.getDefaultAlertConfig(alertType);
      }

      return { id: configDoc.id, ...configDoc.data() } as AlertRoleConfig;
    } catch (error) {
      console.error('Error getting alert role config:', error);
      return null;
    }
  }

  /**
   * Update alert role configuration
   */
  async updateAlertRoleConfig(alertType: string, config: Partial<AlertRoleConfig>): Promise<boolean> {
    try {
      const updateData = {
        ...config,
        updatedAt: admin.firestore.Timestamp.now()
      };

      await this.db
        .collection('alertRoleConfigs')
        .doc(alertType)
        .set(updateData, { merge: true });

      return true;
    } catch (error) {
      console.error('Error updating alert role config:', error);
      return false;
    }
  }

  /**
   * Get users who should receive alerts for a specific alert type
   */
  async getUsersForAlert(alertType: string): Promise<UserAlertSettings[]> {
    try {
      // Get the alert configuration
      const alertConfig = await this.getAlertRoleConfig(alertType);
      
      if (!alertConfig || !alertConfig.isActive) {
        return [];
      }

      // Get users with the allowed roles
      const usersQuery = await this.db
        .collection('userAlertSettings')
        .where('isActive', '==', true)
        .where('role', 'in', alertConfig.allowedRoles)
        .where('alertTypes', 'array-contains', alertType)
        .get();

      return usersQuery.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      })) as UserAlertSettings[];
    } catch (error) {
      console.error('Error getting users for alert:', error);
      return [];
    }
  }

  /**
   * Add or update user alert settings
   */
  async updateUserAlertSettings(userId: string, settings: Partial<UserAlertSettings>): Promise<boolean> {
    try {
      await this.db
        .collection('userAlertSettings')
        .doc(userId)
        .set(settings, { merge: true });

      return true;
    } catch (error) {
      console.error('Error updating user alert settings:', error);
      return false;
    }
  }

  /**
   * Get user alert settings
   */
  async getUserAlertSettings(userId: string): Promise<UserAlertSettings | null> {
    try {
      const userDoc = await this.db
        .collection('userAlertSettings')
        .doc(userId)
        .get();

      if (!userDoc.exists) {
        return null;
      }

      return { userId: userDoc.id, ...userDoc.data() } as UserAlertSettings;
    } catch (error) {
      console.error('Error getting user alert settings:', error);
      return null;
    }
  }

  /**
   * Initialize default alert configurations
   */
  async initializeDefaultConfigs(): Promise<void> {
    try {
      const defaultConfigs = [
        {
          alertType: 'booking_confirmed',
          allowedRoles: ['SuperAdmin', 'CourseOwner', 'Manager'],
          isActive: true
        },
        {
          alertType: 'payment_failed',
          allowedRoles: ['SuperAdmin', 'CourseOwner'],
          isActive: true
        },
        {
          alertType: 'event_ticket_purchased',
          allowedRoles: ['SuperAdmin', 'CourseOwner', 'EventManager'],
          isActive: true
        }
      ];

      const batch = this.db.batch();

      for (const config of defaultConfigs) {
        const docRef = this.db.collection('alertRoleConfigs').doc(config.alertType);
        batch.set(docRef, {
          ...config,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }, { merge: true });
      }

      await batch.commit();
      console.log('Default alert configurations initialized');
    } catch (error) {
      console.error('Error initializing default configs:', error);
    }
  }

  /**
   * Get default alert configuration for a specific alert type
   */
  private getDefaultAlertConfig(alertType: string): AlertRoleConfig {
    const defaultConfigs: { [key: string]: AlertRoleConfig } = {
      'booking_confirmed': {
        alertType: 'booking_confirmed',
        allowedRoles: ['SuperAdmin', 'CourseOwner', 'Manager'],
        isActive: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      },
      'payment_failed': {
        alertType: 'payment_failed',
        allowedRoles: ['SuperAdmin', 'CourseOwner'],
        isActive: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      },
      'event_ticket_purchased': {
        alertType: 'event_ticket_purchased',
        allowedRoles: ['SuperAdmin', 'CourseOwner', 'EventManager'],
        isActive: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      }
    };

    return defaultConfigs[alertType] || {
      alertType,
      allowedRoles: ['SuperAdmin'],
      isActive: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
  }

  /**
   * Get all available roles
   */
  async getAvailableRoles(): Promise<UserRole[]> {
    try {
      const rolesQuery = await this.db
        .collection('userRoles')
        .orderBy('name')
        .get();

      return rolesQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRole[];
    } catch (error) {
      console.error('Error getting available roles:', error);
      return this.getDefaultRoles();
    }
  }

  /**
   * Get default roles if none exist in database
   */
  private getDefaultRoles(): UserRole[] {
    return [
      {
        id: 'SuperAdmin',
        name: 'Super Administrador',
        permissions: ['all']
      },
      {
        id: 'CourseOwner',
        name: 'Propietario del Campo',
        permissions: ['manage_course', 'view_bookings', 'manage_events']
      },
      {
        id: 'Manager',
        name: 'Gerente',
        permissions: ['view_bookings', 'manage_bookings']
      },
      {
        id: 'EventManager',
        name: 'Gestor de Eventos',
        permissions: ['manage_events', 'view_event_tickets']
      }
    ];
  }

  /**
   * Get all available alert types
   */
  getAvailableAlertTypes(): AlertType[] {
    return [
      {
        id: 'booking_confirmed',
        name: 'Reserva Confirmada',
        description: 'Notificación cuando se confirma una nueva reserva de campo'
      },
      {
        id: 'payment_failed',
        name: 'Pago Fallido',
        description: 'Notificación cuando falla un pago'
      },
      {
        id: 'event_ticket_purchased',
        name: 'Ticket de Evento Comprado',
        description: 'Notificación cuando se compra un ticket para un evento'
      }
    ];
  }
}