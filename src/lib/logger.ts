// Sistema de logging centralizado
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  stack?: string;
  fingerprint?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  apiKey?: string;
  bufferSize: number;
  flushInterval: number;
  enableLocalStorage: boolean;
  maxLocalEntries: number;
}

class Logger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private sessionId: string;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableRemote: false,
      bufferSize: 50,
      flushInterval: 30000, // 30 seconds
      enableLocalStorage: true,
      maxLocalEntries: 1000,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.setupFlushTimer();
    
    // Only load from localStorage on client side
    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupFlushTimer(): void {
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      userId: this.getUserId(),
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    if (error) {
      entry.stack = error.stack;
      entry.fingerprint = this.generateFingerprint(error);
    }

    return entry;
  }

  private getUserId(): string | undefined {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('userId') || undefined;
    }
    return undefined;
  }

  private generateFingerprint(error: Error): string {
    // Create a unique fingerprint for similar errors
    const key = `${error.name}_${error.message}_${error.stack?.split('\n')[1] || ''}`;
    return btoa(key).substr(0, 16);
  }

  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);

    // Flush if buffer is full
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush();
    }

    // Save to localStorage if enabled
    if (this.config.enableLocalStorage) {
      this.saveToLocalStorage(entry);
    }
  }

  private saveToLocalStorage(entry: LogEntry): void {
    if (!this.config.enableLocalStorage || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('app_logs');
      const logs: LogEntry[] = stored ? JSON.parse(stored) : [];
      
      logs.push(entry);
      
      // Keep only the most recent entries
      if (logs.length > this.config.maxLocalEntries) {
        logs.splice(0, logs.length - this.config.maxLocalEntries);
      }
      
      localStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to save log to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('app_logs');
      if (stored) {
        const logs: LogEntry[] = JSON.parse(stored);
        // You might want to send these to remote service on app start
        console.log(`Loaded ${logs.length} logs from localStorage`);
      }
    } catch (error) {
      console.warn('Failed to load logs from localStorage:', error);
    }
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${LogLevel[entry.level]}]`;
    const message = entry.context ? `${prefix} [${entry.context}] ${entry.message}` : `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, entry.data, entry.stack);
        break;
    }
  }

  private async sendToRemote(entries: LogEntry[]): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) {
      return;
    }

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({ logs: entries })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send logs to remote service:', error);
      // Re-add failed entries to buffer for retry
      this.buffer.unshift(...entries);
    }
  }

  public debug(message: string, context?: string, data?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, data);
    this.logToConsole(entry);
    this.addToBuffer(entry);
  }

  public info(message: string, context?: string, data?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, message, context, data);
    this.logToConsole(entry);
    this.addToBuffer(entry);
  }

  public warn(message: string, context?: string, data?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, message, context, data);
    this.logToConsole(entry);
    this.addToBuffer(entry);
  }

  public error(message: string, error?: Error, context?: string, data?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, data, error);
    this.logToConsole(entry);
    this.addToBuffer(entry);
  }

  public fatal(message: string, error?: Error, context?: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.FATAL, message, context, data, error);
    this.logToConsole(entry);
    this.addToBuffer(entry);
    
    // Immediately flush fatal errors
    this.flush();
  }

  public async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entriesToSend = [...this.buffer];
    this.buffer = [];

    await this.sendToRemote(entriesToSend);
  }

  public setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart flush timer if interval changed
    if (config.flushInterval !== undefined) {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }
      this.setupFlushTimer();
    }
  }

  public getStoredLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem('app_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public clearStoredLogs(): void {
    try {
      localStorage.removeItem('app_logs');
    } catch (error) {
      console.warn('Failed to clear stored logs:', error);
    }
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Create default logger instance
const defaultConfig: Partial<LoggerConfig> = {
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.REACT_APP_LOGGING_ENDPOINT,
  apiKey: process.env.REACT_APP_LOGGING_API_KEY
};

export const logger = new Logger(defaultConfig);

// Performance logging utilities
export class PerformanceLogger {
  private static marks: Map<string, number> = new Map();

  static mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  static measure(name: string, startMark?: string): number {
    const endTime = performance.now();
    const startTime = startMark ? this.marks.get(startMark) : this.marks.get(name);
    
    if (startTime === undefined) {
      logger.warn(`Performance mark '${startMark || name}' not found`);
      return 0;
    }

    const duration = endTime - startTime;
    logger.info(`Performance: ${name}`, 'performance', { duration: `${duration.toFixed(2)}ms` });
    
    return duration;
  }

  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.mark(name);
    try {
      const result = await fn();
      this.measure(name);
      return result;
    } catch (error) {
      this.measure(name);
      logger.error(`Performance measurement failed for ${name}`, error as Error, 'performance');
      throw error;
    }
  }
}

// Error boundary integration
export const logError = (error: Error, errorInfo?: any, context?: string) => {
  logger.error(
    `Unhandled error: ${error.message}`,
    error,
    context || 'ErrorBoundary',
    errorInfo
  );
};

export default logger;