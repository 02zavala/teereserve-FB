import { Metadata } from 'next';
import { LazyBackupManager } from '@/components/admin/LazyAdminPage';
import { AdminAuthGuard } from '@/components/auth/AdminAuthGuard';
import { Suspense } from 'react';

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
        
        <Suspense fallback={
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
            <div className="h-96 bg-muted animate-pulse rounded-lg" />
          </div>
        }>
          <LazyBackupManager />
        </Suspense>
      </div>
    </AdminAuthGuard>
  );
}
