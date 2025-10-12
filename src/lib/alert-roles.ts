import { logger } from './logger';

export type UserRole = 'SuperAdmin' | 'CourseOwner' | 'Staff' | 'Customer';
export type AlertType = 'booking' | 'event_ticket' | 'payment_failed' | 'system_error';

export interface AlertRoleConfig {
  id?: string;
  role: UserRole;
  alertTypes: AlertType[];
  telegramChatId?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAlertSettings {
  userId: string;
  userEmail: string;
  role: UserRole;
  telegramChatId?: string;
  alertPreferences: {
    [key in AlertType]: boolean;
  };
  enabled: boolean;
}

export class AlertRoleManager {
  private defaultRoleConfigs: Record<UserRole, AlertType[]> = {
    SuperAdmin: ['booking', 'event_ticket', 'payment_failed', 'system_error'],
    CourseOwner: ['booking', 'event_ticket', 'payment_failed'],
    Staff: ['booking', 'event_ticket'],
    Customer: []
  };

  /**
   * Obtiene la configuración de roles desde Firestore
   */
  async getRoleConfigs(): Promise<AlertRoleConfig[]> {
    try {
      const { getFirestore, collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      const snapshot = await getDocs(collection(db, 'alert_role_configs'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AlertRoleConfig));
    } catch (error) {
      logger.error('Error fetching role configs:', error);
      return [];
    }
  }

  /**
   * Crea o actualiza la configuración de un rol
   */
  async updateRoleConfig(roleConfig: Omit<AlertRoleConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      // Buscar configuración existente
      const q = query(collection(db, 'alert_role_configs'), where('role', '==', roleConfig.role));
      const snapshot = await getDocs(q);

      const now = new Date();

      if (snapshot.empty) {
        // Crear nueva configuración
        const docRef = await addDoc(collection(db, 'alert_role_configs'), {
          ...roleConfig,
          createdAt: now,
          updatedAt: now
        });
        logger.info(`Created alert config for role: ${roleConfig.role}`);
        return docRef.id;
      } else {
        // Actualizar configuración existente
        const existingDoc = snapshot.docs[0];
        await updateDoc(doc(db, 'alert_role_configs', existingDoc.id), {
          ...roleConfig,
          updatedAt: now
        });
        logger.info(`Updated alert config for role: ${roleConfig.role}`);
        return existingDoc.id;
      }
    } catch (error) {
      logger.error('Error updating role config:', error);
      throw error;
    }
  }

  /**
   * Obtiene los usuarios que deben recibir alertas para un tipo específico
   */
  async getUsersForAlert(alertType: AlertType): Promise<UserAlertSettings[]> {
    try {
      const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      // Obtener configuraciones de roles activas
      const roleConfigs = await this.getRoleConfigs();
      const eligibleRoles = roleConfigs
        .filter(config => config.enabled && config.alertTypes.includes(alertType))
        .map(config => config.role);

      if (eligibleRoles.length === 0) {
        return [];
      }

      // Obtener usuarios con esos roles
      const usersQuery = query(
        collection(db, 'users'),
        where('role', 'in', eligibleRoles),
        where('alertsEnabled', '==', true)
      );

      const usersSnapshot = await getDocs(usersQuery);
      return usersSnapshot.docs.map(doc => {
        const userData = doc.data();
        return {
          userId: doc.id,
          userEmail: userData.email,
          role: userData.role,
          telegramChatId: userData.telegramChatId,
          alertPreferences: userData.alertPreferences || this.getDefaultAlertPreferences(userData.role),
          enabled: userData.alertsEnabled || false
        };
      }).filter(user => user.alertPreferences[alertType]);
    } catch (error) {
      logger.error('Error getting users for alert:', error);
      return [];
    }
  }

  /**
   * Obtiene las preferencias de alerta por defecto para un rol
   */
  private getDefaultAlertPreferences(role: UserRole): Record<AlertType, boolean> {
    const allowedTypes = this.defaultRoleConfigs[role];
    return {
      booking: allowedTypes.includes('booking'),
      event_ticket: allowedTypes.includes('event_ticket'),
      payment_failed: allowedTypes.includes('payment_failed'),
      system_error: allowedTypes.includes('system_error')
    };
  }

  /**
   * Actualiza las preferencias de alerta de un usuario
   */
  async updateUserAlertPreferences(
    userId: string,
    preferences: Partial<Record<AlertType, boolean>>,
    telegramChatId?: string
  ): Promise<void> {
    try {
      const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      const updateData: any = {
        alertPreferences: preferences,
        updatedAt: new Date()
      };

      if (telegramChatId !== undefined) {
        updateData.telegramChatId = telegramChatId;
      }

      await updateDoc(doc(db, 'users', userId), updateData);
      logger.info(`Updated alert preferences for user: ${userId}`);
    } catch (error) {
      logger.error('Error updating user alert preferences:', error);
      throw error;
    }
  }

  /**
   * Inicializa las configuraciones de roles por defecto
   */
  async initializeDefaultConfigs(): Promise<void> {
    try {
      for (const [role, alertTypes] of Object.entries(this.defaultRoleConfigs)) {
        await this.updateRoleConfig({
          role: role as UserRole,
          alertTypes,
          enabled: true
        });
      }
      logger.info('Default alert role configurations initialized');
    } catch (error) {
      logger.error('Error initializing default configs:', error);
      throw error;
    }
  }

  /**
   * Verifica si un usuario puede recibir un tipo de alerta específico
   */
  async canUserReceiveAlert(userId: string, alertType: AlertType): Promise<boolean> {
    try {
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      const userRole = userData.role as UserRole;
      const alertsEnabled = userData.alertsEnabled || false;
      const alertPreferences = userData.alertPreferences || this.getDefaultAlertPreferences(userRole);

      return alertsEnabled && alertPreferences[alertType];
    } catch (error) {
      logger.error('Error checking user alert permissions:', error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas de configuración de alertas
   */
  async getAlertStats(): Promise<{
    totalConfigs: number;
    activeConfigs: number;
    usersByRole: Record<UserRole, number>;
    alertTypeUsage: Record<AlertType, number>;
  }> {
    try {
      const roleConfigs = await this.getRoleConfigs();
      const { getFirestore, collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('./firebase');

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => doc.data());

      const usersByRole = users.reduce((acc, user) => {
        const role = user.role as UserRole;
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<UserRole, number>);

      const alertTypeUsage = roleConfigs.reduce((acc, config) => {
        config.alertTypes.forEach(type => {
          acc[type] = (acc[type] || 0) + 1;
        });
        return acc;
      }, {} as Record<AlertType, number>);

      return {
        totalConfigs: roleConfigs.length,
        activeConfigs: roleConfigs.filter(c => c.enabled).length,
        usersByRole,
        alertTypeUsage
      };
    } catch (error) {
      logger.error('Error getting alert stats:', error);
      return {
        totalConfigs: 0,
        activeConfigs: 0,
        usersByRole: {} as Record<UserRole, number>,
        alertTypeUsage: {} as Record<AlertType, number>
      };
    }
  }
}

// Instancia singleton
export const alertRoleManager = new AlertRoleManager();

// Función helper para verificar permisos de alerta
export async function shouldSendAlert(alertType: AlertType): Promise<UserAlertSettings[]> {
  return await alertRoleManager.getUsersForAlert(alertType);
}