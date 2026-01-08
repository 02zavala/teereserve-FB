import { Metadata } from 'next';
import { LazyBackupManager } from '@/components/admin/LazyAdminPage';
import { AdminAuthGuard } from '@/components/auth/AdminAuthGuard';

export const metadata: Metadata = {
  title: 'Backup Management | TeeReserve Admin',
  description: 'Manage automated backups and data recovery for TeeReserve',
};

export default function BackupPage() {
  return (
    <AdminAuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage automated backups for critical system data
          </p>
        </div>
        
        <LazyBackupManager />
      </div>
    </AdminAuthGuard>
  );
}
