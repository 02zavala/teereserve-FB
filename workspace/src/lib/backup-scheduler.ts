import { backupService, type BackupData, type BackupOptions } from './backup-service';
import { format, subDays, isAfter } from 'date-fns';
import cron, { type ScheduledTask } from 'node-cron';

export interface BackupScheduleConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  retentionDays: number;
  maxBackups: number;
  backupPath: string;
  incrementalBackups: boolean;
  notificationEmail?: string;
}

export interface BackupJob {
  id: string;
  name: string;
  config: BackupScheduleConfig;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'paused' | 'error';
  errorMessage?: string;
}

class BackupScheduler {
  private jobs: Map<string, BackupJob> = new Map();
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private backupHistory: Map<string, BackupData[]> = new Map();

  /**
   * Default backup configurations
   */
  private readonly DEFAULT_CONFIGS: Record<string, BackupScheduleConfig> = {
    daily: {
      enabled: true,
      schedule: '0 2 * * *', // Daily at 2 AM
      retentionDays: 30,
      maxBackups: 30,
      backupPath: './backups/daily',
      incrementalBackups: false
    },
    weekly: {
      enabled: true,
      schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
      retentionDays: 90,
      maxBackups: 12,
      backupPath: './backups/weekly',
      incrementalBackups: false
    },
    monthly: {
      enabled: true,
      schedule: '0 4 1 * *', // Monthly on 1st at 4 AM
      retentionDays: 365,
      maxBackups: 12,
      backupPath: './backups/monthly',
      incrementalBackups: false
    },
    incremental: {
      enabled: true,
      schedule: '0 */6 * * *', // Every 6 hours
      retentionDays: 7,
      maxBackups: 28,
      backupPath: './backups/incremental',
      incrementalBackups: true
    }
  };

  /**
   * Initialize the backup scheduler with default jobs
   */
  initialize(): void {
    console.log('Initializing backup scheduler...');
    
    // Create default backup jobs
    Object.entries(this.DEFAULT_CONFIGS).forEach(([name, config]) => {
      this.createBackupJob(name, name, config);
    });

    console.log(`Backup scheduler initialized with ${this.jobs.size} jobs`);
  }

  /**
   * Create a new backup job
   */
  createBackupJob(id: string, name: string, config: BackupScheduleConfig): void {
    const job: BackupJob = {
      id,
      name,
      config,
      status: config.enabled ? 'active' : 'paused'
    };

    this.jobs.set(id, job);
    this.backupHistory.set(id, []);

    if (config.enabled) {
      this.scheduleJob(job);
    }

    console.log(`Created backup job: ${name} (${config.schedule})`);
  }

  /**
   * Schedule a backup job using cron
   */
  private scheduleJob(job: BackupJob): void {
    try {
      const task = cron.schedule(job.config.schedule, async () => {
        await this.executeBackup(job.id);
      }, {
        timezone: 'America/Mexico_City' // Adjust timezone as needed
      });

      this.scheduledTasks.set(job.id, task);
      task.start();

      // Update next run time
      job.nextRun = this.getNextRunTime(job.config.schedule);
      
      console.log(`Scheduled backup job: ${job.name}`);
    } catch (error) {
      console.error(`Error scheduling job ${job.name}:`, error);
      job.status = 'error';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  /**
   * Execute a backup job
   */
  async executeBackup(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error(`Backup job not found: ${jobId}`);
      return;
    }

    console.log(`Starting backup job: ${job.name}`);
    const startTime = new Date();

    try {
      // Prepare backup options
      const backupOptions: BackupOptions = {
        maxRecords: 50000 // Reasonable limit for automated backups
      };

      let backupData: BackupData;

      if (job.config.incrementalBackups) {
        // Get last backup timestamp for incremental backup
        const history = this.backupHistory.get(jobId) || [];
        const lastBackup = history[history.length - 1];
        
        if (lastBackup) {
          backupData = await backupService.createIncrementalBackup(
            lastBackup.timestamp,
            backupOptions
          );
        } else {
          // First incremental backup - do full backup
          backupData = await backupService.createBackup(backupOptions);
        }
      } else {
        // Full backup
        backupData = await backupService.createBackup(backupOptions);
      }

      // Validate backup
      const validation = backupService.validateBackup(backupData);
      if (!validation.isValid) {
        throw new Error(`Backup validation failed: ${validation.errors.join(', ')}`);
      }

      // Save backup to file
      const fileName = this.generateBackupFileName(job);
      const filePath = `${job.config.backupPath}/${fileName}`;
      await this.ensureDirectoryExists(job.config.backupPath);
      await backupService.saveBackupToFile(backupData, filePath);

      // Update job status and history
      job.lastRun = startTime.toISOString();
      job.nextRun = this.getNextRunTime(job.config.schedule);
      job.status = 'active';
      job.errorMessage = undefined;

      // Add to history
      const history = this.backupHistory.get(jobId) || [];
      history.push(backupData);
      this.backupHistory.set(jobId, history);

      // Clean up old backups
      await this.cleanupOldBackups(job);

      const duration = Date.now() - startTime.getTime();
      console.log(`Backup job completed: ${job.name} (${duration}ms)`);
      console.log(`Backup saved to: ${filePath}`);
      console.log(`Records backed up: ${backupData.metadata.totalRecords}`);

      // Send notification if configured
      if (job.config.notificationEmail) {
        await this.sendBackupNotification(job, backupData, 'success');
      }

    } catch (error) {
      console.error(`Backup job failed: ${job.name}`, error);
      
      job.status = 'error';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      job.lastRun = startTime.toISOString();

      // Send error notification if configured
      if (job.config.notificationEmail) {
        await this.sendBackupNotification(job, null, 'error', error);
      }
    }
  }

  /**
   * Generate backup file name
   */
  private generateBackupFileName(job: BackupJob): string {
    const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss');
    const type = job.config.incrementalBackups ? 'incremental' : 'full';
    return `${job.id}-${type}-${timestamp}.json`;
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  private async cleanupOldBackups(job: BackupJob): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Get all backup files in the directory
      const files = await fs.readdir(job.config.backupPath);
      const backupFiles = files
        .filter(file => file.startsWith(job.id) && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(job.config.backupPath, file),
          stats: null as any
        }));

      // Get file stats
      for (const file of backupFiles) {
        file.stats = await fs.stat(file.path);
      }

      // Sort by creation time (newest first)
      backupFiles.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Remove files exceeding max backup count
      if (backupFiles.length > job.config.maxBackups) {
        const filesToDelete = backupFiles.slice(job.config.maxBackups);
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          console.log(`Deleted old backup: ${file.name}`);
        }
      }

      // Remove files older than retention period
      const cutoffDate = subDays(new Date(), job.config.retentionDays);
      for (const file of backupFiles) {
        if (file.stats.mtime < cutoffDate) {
          await fs.unlink(file.path);
          console.log(`Deleted expired backup: ${file.name}`);
        }
      }

    } catch (error) {
      console.error(`Error cleaning up old backups for job ${job.name}:`, error);
    }
  }

  /**
   * Get next run time for a cron schedule
   */
  private getNextRunTime(schedule: string): string {
    try {
      // This is a simplified implementation
      // In production, you might want to use a proper cron parser
      const task = cron.schedule(schedule, () => {});
      // For now, return a placeholder - implement proper next run calculation
      return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } catch {
      return 'Invalid schedule';
    }
  }

  /**
   * Send backup notification (placeholder - implement with your email service)
   */
  private async sendBackupNotification(
    job: BackupJob,
    backupData: BackupData | null,
    status: 'success' | 'error',
    error?: any
  ): Promise<void> {
    // Placeholder for email notification
    // Implement with your preferred email service (SendGrid, AWS SES, etc.)
    console.log(`Backup notification: ${job.name} - ${status}`);
    
    if (status === 'success' && backupData) {
      console.log(`Records backed up: ${backupData.metadata.totalRecords}`);
      console.log(`Backup size: ${backupData.metadata.backupSize}`);
    } else if (status === 'error') {
      console.log(`Error: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Pause a backup job
   */
  pauseJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const task = this.scheduledTasks.get(jobId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(jobId);
    }

    job.status = 'paused';
    console.log(`Paused backup job: ${job.name}`);
  }

  /**
   * Resume a backup job
   */
  resumeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.config.enabled = true;
    this.scheduleJob(job);
    console.log(`Resumed backup job: ${job.name}`);
  }

  /**
   * Delete a backup job
   */
  deleteJob(jobId: string): void {
    this.pauseJob(jobId);
    this.jobs.delete(jobId);
    this.backupHistory.delete(jobId);
    console.log(`Deleted backup job: ${jobId}`);
  }

  /**
   * Get all backup jobs
   */
  getJobs(): BackupJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get backup history for a job
   */
  getBackupHistory(jobId: string): BackupData[] {
    return this.backupHistory.get(jobId) || [];
  }

  /**
   * Run a backup job immediately
   */
  async runJobNow(jobId: string): Promise<void> {
    await this.executeBackup(jobId);
  }

  /**
   * Get backup statistics
   */
  getBackupStats(): {
    totalJobs: number;
    activeJobs: number;
    pausedJobs: number;
    errorJobs: number;
    totalBackups: number;
    lastBackupTime?: string;
  } {
    const jobs = Array.from(this.jobs.values());
    const totalBackups = Array.from(this.backupHistory.values())
      .reduce((sum, history) => sum + history.length, 0);
    
    const lastBackupTimes = jobs
      .filter(job => job.lastRun)
      .map(job => job.lastRun!)
      .sort()
      .reverse();

    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(job => job.status === 'active').length,
      pausedJobs: jobs.filter(job => job.status === 'paused').length,
      errorJobs: jobs.filter(job => job.status === 'error').length,
      totalBackups,
      lastBackupTime: lastBackupTimes[0]
    };
  }

  /**
   * Shutdown the scheduler
   */
  shutdown(): void {
    console.log('Shutting down backup scheduler...');
    
    this.scheduledTasks.forEach((task, jobId) => {
      task.stop();
      console.log(`Stopped backup job: ${jobId}`);
    });
    
    this.scheduledTasks.clear();
    console.log('Backup scheduler shutdown complete');
  }
}

export const backupScheduler = new BackupScheduler();
export default backupScheduler;