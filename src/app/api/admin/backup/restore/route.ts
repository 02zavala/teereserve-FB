import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';
import { backupService } from '@/lib/backup-service';
import { z } from 'zod';

const restoreOptionsSchema = z.object({
  collections: z.array(z.string()),
  overwriteExisting: z.boolean().default(false),
  validateData: z.boolean().default(true),
  createBackupBeforeRestore: z.boolean().default(true),
  dryRun: z.boolean().default(true)
});

interface RestoreProgress {
  stage: string;
  progress: number;
  currentCollection?: string;
  recordsProcessed?: number;
  totalRecords?: number;
  errors?: string[];
}

interface RestoreResult {
  success: boolean;
  summary: {
    recordsProcessed: number;
    collectionsProcessed: number;
    warnings: number;
    errors: number;
  };
  details: any;
  backupCreated?: {
    filename: string;
    timestamp: string;
  };
}

// Verify admin authentication
async function verifyAdmin(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if user is admin
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    if (!userData?.isAdmin) {
      return null;
    }

    return decodedToken;
  } catch (error) {
    console.error('Admin verification error:', error);
    return null;
  }
}

// Stream progress updates to client
function createProgressStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
    },
    cancel() {
      // Cleanup if needed
    }
  });

  const sendProgress = (data: RestoreProgress | RestoreResult | { type: 'error'; message: string }) => {
    try {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(message));
    } catch (error) {
      console.error('Error sending progress:', error);
    }
  };

  const close = () => {
    try {
      controller.close();
    } catch (error) {
      console.error('Error closing stream:', error);
    }
  };

  return { stream, sendProgress, close };
}

// Validate backup file format
function validateBackupFile(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (!data.metadata || !data.collections) return false;
  if (!data.metadata.timestamp || !data.metadata.version) return false;
  return true;
}

// Validate individual record
function validateRecord(collection: string, record: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic validation
  if (!record || typeof record !== 'object') {
    errors.push('Record is not a valid object');
    return { valid: false, errors };
  }

  // Collection-specific validation
  switch (collection) {
    case 'bookings':
      if (!record.courseId) errors.push('Missing courseId');
      if (!record.userId) errors.push('Missing userId');
      if (!record.date) errors.push('Missing date');
      if (!record.timeSlot) errors.push('Missing timeSlot');
      break;
      
    case 'courses':
      if (!record.name) errors.push('Missing name');
      if (!record.location) errors.push('Missing location');
      break;
      
    case 'users':
      if (!record.email) errors.push('Missing email');
      if (!record.name) errors.push('Missing name');
      break;
      
    case 'priceRules':
      if (!record.name) errors.push('Missing name');
      if (typeof record.price !== 'number') errors.push('Invalid price');
      break;
  }

  return { valid: errors.length === 0, errors };
}

// Perform the actual restore operation
async function performRestore(
  backupData: any,
  options: z.infer<typeof restoreOptionsSchema>,
  sendProgress: (data: RestoreProgress) => void
): Promise<RestoreResult> {
  const result: RestoreResult = {
    success: false,
    summary: {
      recordsProcessed: 0,
      collectionsProcessed: 0,
      warnings: 0,
      errors: 0
    },
    details: {}
  };

  let backupCreated: { filename: string; timestamp: string } | undefined;

  try {
    // Create backup before restore if requested
    if (options.createBackupBeforeRestore && !options.dryRun) {
      sendProgress({ stage: 'Creating backup before restore', progress: 5 });
      
      const preRestoreBackup = await backupService.createBackup({
        includeCollections: options.collections
      });
      
      backupCreated = {
        filename: `backup-${preRestoreBackup.timestamp.replace(/[:.]/g, '-')}.json`,
        timestamp: preRestoreBackup.timestamp
      };
      result.backupCreated = backupCreated;
    }

    // Process each collection
    const totalCollections = options.collections.length;
    let processedCollections = 0;

    for (const collectionName of options.collections) {
      const collectionData = backupData.collections[collectionName];
      if (!collectionData) {
        result.summary.warnings++;
        continue;
      }

      sendProgress({
        stage: `Processing ${collectionName}`,
        progress: 10 + (processedCollections / totalCollections) * 80,
        currentCollection: collectionName,
        totalRecords: collectionData.length
      });

      const collectionRef = db.collection(collectionName);
      let processedRecords = 0;
      const collectionErrors: string[] = [];

      // Process records in batches
      const batchSize = 500;
      for (let i = 0; i < collectionData.length; i += batchSize) {
        const batch = collectionData.slice(i, i + batchSize);
        
        for (const record of batch) {
          try {
            // Validate record if requested
            if (options.validateData) {
              const validation = validateRecord(collectionName, record);
              if (!validation.valid) {
                collectionErrors.push(`Record ${record.id || 'unknown'}: ${validation.errors.join(', ')}`);
                result.summary.errors++;
                continue;
              }
            }

            if (!options.dryRun) {
              // Check if record exists
              const existingDoc = await collectionRef.doc(record.id).get();
              
              if (existingDoc.exists && !options.overwriteExisting) {
                result.summary.warnings++;
                continue;
              }

              // Write the record
              await collectionRef.doc(record.id).set(record);
            }

            processedRecords++;
            result.summary.recordsProcessed++;

            // Update progress
            if (processedRecords % 100 === 0) {
              sendProgress({
                stage: `Processing ${collectionName}`,
                progress: 10 + (processedCollections / totalCollections) * 80,
                currentCollection: collectionName,
                recordsProcessed: processedRecords,
                totalRecords: collectionData.length
              });
            }
          } catch (error) {
            collectionErrors.push(`Record ${record.id || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.summary.errors++;
          }
        }
      }

      result.details[collectionName] = {
        recordsProcessed: processedRecords,
        errors: collectionErrors
      };

      processedCollections++;
      result.summary.collectionsProcessed++;
    }

    sendProgress({ stage: 'Finalizing restore', progress: 95 });

    result.success = result.summary.errors === 0;
    
    return result;
  } catch (error) {
    console.error('Restore error:', error);
    result.summary.errors++;
    result.details.globalError = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await verifyAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const backupFile = formData.get('backupFile') as File;
    const optionsStr = formData.get('options') as string;

    if (!backupFile || !optionsStr) {
      return NextResponse.json({ error: 'Missing backup file or options' }, { status: 400 });
    }

    // Parse and validate options
    const options = restoreOptionsSchema.parse(JSON.parse(optionsStr));

    // Read and parse backup file
    const fileContent = await backupFile.text();
    let backupData;
    
    try {
      backupData = JSON.parse(fileContent);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    // Validate backup file structure
    if (!validateBackupFile(backupData)) {
      return NextResponse.json({ error: 'Invalid backup file structure' }, { status: 400 });
    }

    // Create progress stream
    const { stream, sendProgress, close } = createProgressStream();

    // Start restore process in background
    (async () => {
      try {
        sendProgress({ stage: 'Starting restore', progress: 0 });
        
        const result = await performRestore(backupData, options, (progress) => {
          sendProgress(progress);
        });
        
        sendProgress(result);
      } catch (error) {
        console.error('Restore process error:', error);
        sendProgress({ 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Restore failed' 
        });
      } finally {
        close();
      }
    })();

    // Return streaming response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Restore API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}