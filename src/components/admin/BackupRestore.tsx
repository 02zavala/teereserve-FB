'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RestoreOptions {
  backupFile: File | null;
  collections: string[];
  overwriteExisting: boolean;
  validateData: boolean;
  createBackupBeforeRestore: boolean;
  dryRun: boolean;
}

interface RestoreProgress {
  stage: string;
  progress: number;
  currentCollection?: string;
  recordsProcessed?: number;
  totalRecords?: number;
  errors?: string[];
}

const COLLECTIONS = [
  'bookings',
  'courses', 
  'users',
  'priceRules',
  'seasons',
  'timeBands',
  'specialOverrides',
  'baseProducts',
  'coupons',
  'reviews'
];

export default function BackupRestore() {
  const [options, setOptions] = useState<RestoreOptions>({
    backupFile: null,
    collections: [],
    overwriteExisting: false,
    validateData: true,
    createBackupBeforeRestore: true,
    dryRun: true
  });
  
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState<RestoreProgress | null>(null);
  const [restoreResult, setRestoreResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setOptions(prev => ({ ...prev, backupFile: file }));
    setRestoreResult(null);
  };

  const handleCollectionToggle = (collection: string, checked: boolean) => {
    setOptions(prev => ({
      ...prev,
      collections: checked 
        ? [...prev.collections, collection]
        : prev.collections.filter(c => c !== collection)
    }));
  };

  const handleSelectAllCollections = () => {
    setOptions(prev => ({
      ...prev,
      collections: prev.collections.length === COLLECTIONS.length ? [] : [...COLLECTIONS]
    }));
  };

  const validateRestore = async () => {
    if (!options.backupFile) {
      toast.error('Please select a backup file');
      return false;
    }

    if (options.collections.length === 0) {
      toast.error('Please select at least one collection to restore');
      return false;
    }

    return true;
  };

  const performRestore = async () => {
    if (!await validateRestore()) return;

    setIsRestoring(true);
    setProgress({ stage: 'Initializing', progress: 0 });
    setRestoreResult(null);

    try {
      const formData = new FormData();
      formData.append('backupFile', options.backupFile!);
      formData.append('options', JSON.stringify({
        collections: options.collections,
        overwriteExisting: options.overwriteExisting,
        validateData: options.validateData,
        createBackupBeforeRestore: options.createBackupBeforeRestore,
        dryRun: options.dryRun
      }));

      const response = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Restore failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'progress') {
                setProgress(data.data);
              } else if (data.type === 'complete') {
                setRestoreResult(data.data);
                setProgress(null);
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      toast.success(options.dryRun ? 'Dry run completed successfully' : 'Restore completed successfully');
    } catch (error) {
      console.error('Restore error:', error);
      toast.error(error instanceof Error ? error.message : 'Restore failed');
      setProgress(null);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Restore from Backup
          </CardTitle>
          <CardDescription>
            Restore data from a backup file. Use dry run mode to preview changes before applying them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="backup-file">Backup File</Label>
            <Input
              id="backup-file"
              type="file"
              accept=".json,.gz"
              onChange={handleFileChange}
              disabled={isRestoring}
            />
            {options.backupFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {options.backupFile.name} ({(options.backupFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Collections Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Collections to Restore</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllCollections}
                disabled={isRestoring}
              >
                {options.collections.length === COLLECTIONS.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {COLLECTIONS.map(collection => (
                <div key={collection} className="flex items-center space-x-2">
                  <Checkbox
                    id={collection}
                    checked={options.collections.includes(collection)}
                    onCheckedChange={(checked) => handleCollectionToggle(collection, checked as boolean)}
                    disabled={isRestoring}
                  />
                  <Label htmlFor={collection} className="text-sm font-normal">
                    {collection}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Restore Options */}
          <div className="space-y-4">
            <Label>Restore Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dry-run"
                  checked={options.dryRun}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, dryRun: checked as boolean }))}
                  disabled={isRestoring}
                />
                <Label htmlFor="dry-run" className="text-sm font-normal">
                  Dry run (preview changes without applying them)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overwrite"
                  checked={options.overwriteExisting}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, overwriteExisting: checked as boolean }))}
                  disabled={isRestoring || options.dryRun}
                />
                <Label htmlFor="overwrite" className="text-sm font-normal">
                  Overwrite existing records
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="validate"
                  checked={options.validateData}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, validateData: checked as boolean }))}
                  disabled={isRestoring}
                />
                <Label htmlFor="validate" className="text-sm font-normal">
                  Validate data before restoring
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="backup-before"
                  checked={options.createBackupBeforeRestore}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, createBackupBeforeRestore: checked as boolean }))}
                  disabled={isRestoring || options.dryRun}
                />
                <Label htmlFor="backup-before" className="text-sm font-normal">
                  Create backup before restoring
                </Label>
              </div>
            </div>
          </div>

          {/* Warning for non-dry-run */}
          {!options.dryRun && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This will modify your live data. Make sure you have a recent backup before proceeding.
              </AlertDescription>
            </Alert>
          )}

          {/* Restore Button */}
          <Button
            onClick={performRestore}
            disabled={isRestoring || !options.backupFile || options.collections.length === 0}
            className="w-full"
          >
            {isRestoring ? (
              'Restoring...'
            ) : options.dryRun ? (
              'Run Dry Run'
            ) : (
              'Start Restore'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {progress && (
        <Card>
          <CardHeader>
            <CardTitle>Restore Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.stage}</span>
                <span>{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} />
            </div>
            
            {progress.currentCollection && (
              <p className="text-sm text-muted-foreground">
                Processing: {progress.currentCollection}
                {progress.recordsProcessed && progress.totalRecords && (
                  <span> ({progress.recordsProcessed}/{progress.totalRecords} records)</span>
                )}
              </p>
            )}
            
            {progress.errors && progress.errors.length > 0 && (
              <div className="space-y-2">
                <Label className="text-destructive">Errors:</Label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {progress.errors.map((error, index) => (
                    <p key={index} className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {restoreResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {restoreResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Restore {options.dryRun ? 'Dry Run' : ''} Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {restoreResult.summary?.recordsProcessed || 0}
                </div>
                <div className="text-sm text-muted-foreground">Records Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {restoreResult.summary?.collectionsProcessed || 0}
                </div>
                <div className="text-sm text-muted-foreground">Collections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {restoreResult.summary?.warnings || 0}
                </div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {restoreResult.summary?.errors || 0}
                </div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>
            
            {restoreResult.details && (
              <div className="space-y-2">
                <Label>Detailed Results:</Label>
                <Textarea
                  value={JSON.stringify(restoreResult.details, null, 2)}
                  readOnly
                  className="h-40 font-mono text-xs"
                />
              </div>
            )}
            
            {restoreResult.backupCreated && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Backup created before restore: {restoreResult.backupCreated.filename}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}