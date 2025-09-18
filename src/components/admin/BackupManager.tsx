
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Download, 
  Play, 
  Pause, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database,
  Calendar,
  Settings,
  Trash2,
  Upload
} from 'lucide-react';
import BackupRestore from './BackupRestore';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

interface BackupJob {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'error';
  lastRun?: string;
  nextRun?: string;
  schedule: string;
  enabled: boolean;
  errorMessage?: string;
}

interface BackupStats {
  totalJobs: number;
  activeJobs: number;
  pausedJobs: number;
  errorJobs: number;
  totalBackups: number;
  lastBackupTime?: string;
}

interface BackupHistory {
  timestamp: string;
  version: string;
  totalRecords: number;
  backupSize: string;
  collections: Record<string, number>;
}

const BackupManager: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [history, setHistory] = useState<BackupHistory[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Manual backup form state
  const [manualBackupForm, setManualBackupForm] = useState({
    includeCollections: [] as string[],
    excludeCollections: [] as string[],
    maxRecords: 50000,
    saveToFile: true,
    dateRange: {
      enabled: false,
      start: '',
      end: ''
    }
  });

  const availableCollections = [
    'bookings', 'courses', 'users', 'priceRules', 
    'seasons', 'timeBands', 'specialOverrides', 
    'baseProducts', 'coupons'
  ];

  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await user?.getIdToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/admin/backup?action=status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load backup data');
      }

      const data = await response.json();
      setStats(data.stats);
      setJobs(data.jobs);
      
      if (data.jobs.length > 0 && !selectedJobId) {
        setSelectedJobId(data.jobs[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backup data');
    } finally {
      setLoading(false);
    }
  };

  const loadJobHistory = async (jobId: string) => {
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/admin/backup?action=history&jobId=${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load backup history');
      }

      const data = await response.json();
      setHistory(data.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backup history');
    }
  };

  const executeAction = async (action: string, params: any = {}) => {
    try {
      setActionLoading(action);
      setError(null);
      setSuccess(null);

      const token = await user?.getIdToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, ...params })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Action failed');
      }

      const result = await response.json();
      setSuccess(result.message || 'Action completed successfully');
      
      // Reload data after action
      await loadBackupData();
      if (selectedJobId) {
        await loadJobHistory(selectedJobId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const createManualBackup = async () => {
    const params: any = {
      maxRecords: manualBackupForm.maxRecords,
      saveToFile: manualBackupForm.saveToFile
    };

    if (manualBackupForm.includeCollections.length > 0) {
      params.includeCollections = manualBackupForm.includeCollections;
    }

    if (manualBackupForm.excludeCollections.length > 0) {
      params.excludeCollections = manualBackupForm.excludeCollections;
    }

    if (manualBackupForm.dateRange.enabled && manualBackupForm.dateRange.start && manualBackupForm.dateRange.end) {
      params.dateRange = {
        start: manualBackupForm.dateRange.start,
        end: manualBackupForm.dateRange.end
      };
    }

    await executeAction('create', params);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'paused':
        return <Badge variant="secondary"><Pause className="w-3 h-3 mr-1" />Paused</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatSchedule = (schedule: string) => {
    const scheduleMap: Record<string, string> = {
      '0 2 * * *': 'Daily at 2:00 AM',
      '0 3 * * 0': 'Weekly on Sunday at 3:00 AM',
      '0 4 1 * *': 'Monthly on 1st at 4:00 AM',
      '0 */6 * * *': 'Every 6 hours'
    };
    return scheduleMap[schedule] || schedule;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading backup data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Backup Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobs}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeJobs} active, {stats.pausedJobs} paused
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBackups}</div>
              <p className="text-xs text-muted-foreground">
                Across all backup jobs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {stats.lastBackupTime 
                  ? format(new Date(stats.lastBackupTime), 'MMM dd, HH:mm')
                  : 'Never'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Most recent backup
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              {stats.errorJobs > 0 ? (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {stats.errorJobs > 0 ? `${stats.errorJobs} Errors` : 'Healthy'}
              </div>
              <p className="text-xs text-muted-foreground">
                Backup system status
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">Backup Jobs</TabsTrigger>
          <TabsTrigger value="manual">Manual Backup</TabsTrigger>
          <TabsTrigger value="restore">Restore Data</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Backup Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Backup Jobs</CardTitle>
              <CardDescription>
                Manage automated backup schedules and monitor their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{job.name}</h3>
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatSchedule(job.schedule)}
                      </p>
                      {job.lastRun && (
                        <p className="text-xs text-muted-foreground">
                          Last run: {format(new Date(job.lastRun), 'MMM dd, yyyy HH:mm')}
                        </p>
                      )}
                      {job.nextRun && job.status === 'active' && (
                        <p className="text-xs text-muted-foreground">
                          Next run: {format(new Date(job.nextRun), 'MMM dd, yyyy HH:mm')}
                        </p>
                      )}
                      {job.errorMessage && (
                        <p className="text-xs text-red-500">
                          Error: {job.errorMessage}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => executeAction('run-job', { jobId: job.id })}
                        disabled={actionLoading === 'run-job'}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Run Now
                      </Button>
                      {job.status === 'active' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => executeAction('pause-job', { jobId: job.id })}
                          disabled={actionLoading === 'pause-job'}
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => executeAction('resume-job', { jobId: job.id })}
                          disabled={actionLoading === 'resume-job'}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Resume
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Backup Tab */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Manual Backup</CardTitle>
              <CardDescription>
                Create a one-time backup with custom settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Include Collections</Label>
                  <div className="space-y-2">
                    {availableCollections.map((collection) => (
                      <div key={collection} className="flex items-center space-x-2">
                        <Checkbox
                          id={`include-${collection}`}
                          checked={manualBackupForm.includeCollections.includes(collection)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setManualBackupForm(prev => ({
                                ...prev,
                                includeCollections: [...prev.includeCollections, collection]
                              }));
                            } else {
                              setManualBackupForm(prev => ({
                                ...prev,
                                includeCollections: prev.includeCollections.filter(c => c !== collection)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={`include-${collection}`} className="text-sm">
                          {collection}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxRecords">Max Records</Label>
                    <Input
                      id="maxRecords"
                      type="number"
                      value={manualBackupForm.maxRecords}
                      onChange={(e) => setManualBackupForm(prev => ({
                        ...prev,
                        maxRecords: parseInt(e.target.value) || 50000
                      }))}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="saveToFile"
                      checked={manualBackupForm.saveToFile}
                      onCheckedChange={(checked) => setManualBackupForm(prev => ({
                        ...prev,
                        saveToFile: checked
                      }))}
                    />
                    <Label htmlFor="saveToFile">Save to file</Label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="dateRange"
                        checked={manualBackupForm.dateRange.enabled}
                        onCheckedChange={(checked) => setManualBackupForm(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, enabled: checked }
                        }))}
                      />
                      <Label htmlFor="dateRange">Date range filter</Label>
                    </div>
                    
                    {manualBackupForm.dateRange.enabled && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="startDate" className="text-xs">Start Date</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={manualBackupForm.dateRange.start}
                            onChange={(e) => setManualBackupForm(prev => ({
                              ...prev,
                              dateRange: { ...prev.dateRange, start: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate" className="text-xs">End Date</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={manualBackupForm.dateRange.end}
                            onChange={(e) => setManualBackupForm(prev => ({
                              ...prev,
                              dateRange: { ...prev.dateRange, end: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <Button
                onClick={createManualBackup}
                disabled={actionLoading === 'create'}
                className="w-full"
              >
                {actionLoading === 'create' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Create Backup
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restore Tab */}
        <TabsContent value="restore">
          <BackupRestore />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup History</CardTitle>
              <CardDescription>
                View detailed history of backup operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select
                  value={selectedJobId}
                  onValueChange={(value) => {
                    setSelectedJobId(value);
                    loadJobHistory(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a backup job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {history.length > 0 ? (
                  <div className="space-y-2">
                    {history.map((backup, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">
                            {format(new Date(backup.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {backup.totalRecords} records • {backup.backupSize}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">v{backup.version}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No backup history available for this job
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BackupManager;
