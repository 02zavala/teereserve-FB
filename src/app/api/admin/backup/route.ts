import { NextRequest, NextResponse } from 'next/server';
import { backupService, type BackupOptions } from '@/lib/backup-service';
import { backupScheduler } from '@/lib/backup-scheduler';
import { auth } from '@/lib/firebase-admin';
import { headers } from 'next/headers';

/**
 * Verify admin authentication
 */
async function verifyAdminAuth(request: NextRequest): Promise<{ isValid: boolean; uid?: string; error?: string }> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isValid: false, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if user has admin role
    if (!decodedToken.role || !['Admin', 'SuperAdmin'].includes(decodedToken.role)) {
      return { isValid: false, error: 'Insufficient permissions' };
    }

    return { isValid: true, uid: decodedToken.uid };
  } catch (error) {
    return { isValid: false, error: 'Invalid token' };
  }
}

/**
 * GET /api/admin/backup
 * Get backup status and history
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'status':
        const stats = backupScheduler.getBackupStats();
        const jobs = backupScheduler.getJobs();
        return NextResponse.json({
          stats,
          jobs: jobs.map(job => ({
            id: job.id,
            name: job.name,
            status: job.status,
            lastRun: job.lastRun,
            nextRun: job.nextRun,
            schedule: job.config.schedule,
            enabled: job.config.enabled,
            errorMessage: job.errorMessage
          }))
        });

      case 'history':
        const jobId = url.searchParams.get('jobId');
        if (!jobId) {
          return NextResponse.json(
            { error: 'Job ID is required' },
            { status: 400 }
          );
        }
        
        const history = backupScheduler.getBackupHistory(jobId);
        return NextResponse.json({
          jobId,
          history: history.map(backup => ({
            timestamp: backup.timestamp,
            version: backup.version,
            totalRecords: backup.metadata.totalRecords,
            backupSize: backup.metadata.backupSize,
            collections: backup.metadata.collections
          }))
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in backup GET endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/backup
 * Create manual backup or manage backup jobs
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'create':
        const backupOptions: BackupOptions = {
          includeCollections: params.includeCollections,
          excludeCollections: params.excludeCollections,
          maxRecords: params.maxRecords || 50000
        };

        if (params.dateRange) {
          backupOptions.dateRange = {
            start: new Date(params.dateRange.start),
            end: new Date(params.dateRange.end)
          };
        }

        const backupData = await backupService.createBackup(backupOptions);
        
        // Validate backup
        const validation = backupService.validateBackup(backupData);
        if (!validation.isValid) {
          return NextResponse.json(
            { error: 'Backup validation failed', details: validation.errors },
            { status: 400 }
          );
        }

        // Save to file if requested
        let filePath: string | undefined;
        if (params.saveToFile) {
          filePath = await backupService.saveBackupToFile(backupData, params.fileName);
        }

        return NextResponse.json({
          success: true,
          backup: {
            timestamp: backupData.timestamp,
            version: backupData.version,
            totalRecords: backupData.metadata.totalRecords,
            backupSize: backupData.metadata.backupSize,
            collections: backupData.metadata.collections,
            filePath
          }
        });

      case 'run-job':
        const { jobId } = params;
        if (!jobId) {
          return NextResponse.json(
            { error: 'Job ID is required' },
            { status: 400 }
          );
        }

        await backupScheduler.runJobNow(jobId);
        return NextResponse.json({ success: true, message: 'Backup job started' });

      case 'pause-job':
        const { jobId: pauseJobId } = params;
        if (!pauseJobId) {
          return NextResponse.json(
            { error: 'Job ID is required' },
            { status: 400 }
          );
        }

        backupScheduler.pauseJob(pauseJobId);
        return NextResponse.json({ success: true, message: 'Backup job paused' });

      case 'resume-job':
        const { jobId: resumeJobId } = params;
        if (!resumeJobId) {
          return NextResponse.json(
            { error: 'Job ID is required' },
            { status: 400 }
          );
        }

        backupScheduler.resumeJob(resumeJobId);
        return NextResponse.json({ success: true, message: 'Backup job resumed' });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in backup POST endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/backup
 * Update backup job configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { jobId, config } = body;

    if (!jobId || !config) {
      return NextResponse.json(
        { error: 'Job ID and config are required' },
        { status: 400 }
      );
    }

    // For now, we'll recreate the job with new config
    // In a more sophisticated implementation, you'd update the existing job
    backupScheduler.deleteJob(jobId);
    backupScheduler.createBackupJob(jobId, config.name || jobId, config);

    return NextResponse.json({ success: true, message: 'Backup job updated' });
  } catch (error) {
    console.error('Error in backup PUT endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/backup
 * Delete backup job
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    backupScheduler.deleteJob(jobId);
    return NextResponse.json({ success: true, message: 'Backup job deleted' });
  } catch (error) {
    console.error('Error in backup DELETE endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}