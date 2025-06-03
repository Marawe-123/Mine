interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private logLevel: keyof LogLevel = 'INFO';

  private levels: LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };

  constructor() {
    // Set log level from environment or default to INFO
    const envLogLevel = process.env.LOG_LEVEL as keyof LogLevel;
    if (envLogLevel && this.levels.hasOwnProperty(envLogLevel)) {
      this.logLevel = envLogLevel;
    }
  }

  private shouldLog(level: keyof LogLevel): boolean {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  private createLogEntry(level: keyof LogLevel, message: string, metadata?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata
    };
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console
    this.logToConsole(entry);
  }

  private logToConsole(entry: LogEntry): void {
    const logMessage = `[${entry.timestamp}] ${entry.level}: ${entry.message}`;
    
    switch (entry.level) {
      case 'DEBUG':
        console.debug(logMessage, entry.metadata || '');
        break;
      case 'INFO':
        console.info(logMessage, entry.metadata || '');
        break;
      case 'WARN':
        console.warn(logMessage, entry.metadata || '');
        break;
      case 'ERROR':
        console.error(logMessage, entry.metadata || '');
        break;
    }
  }

  debug(message: string, metadata?: any): void {
    if (this.shouldLog('DEBUG')) {
      this.addLog(this.createLogEntry('DEBUG', message, metadata));
    }
  }

  info(message: string, metadata?: any): void {
    if (this.shouldLog('INFO')) {
      this.addLog(this.createLogEntry('INFO', message, metadata));
    }
  }

  warn(message: string, metadata?: any): void {
    if (this.shouldLog('WARN')) {
      this.addLog(this.createLogEntry('WARN', message, metadata));
    }
  }

  error(message: string, metadata?: any): void {
    if (this.shouldLog('ERROR')) {
      this.addLog(this.createLogEntry('ERROR', message, metadata));
    }
  }

  // Get recent logs for API endpoints
  getRecentLogs(limit = 100, level?: keyof LogLevel): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level && this.levels.hasOwnProperty(level)) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    return filteredLogs
      .slice(-limit)
      .reverse(); // Most recent first
  }

  // Get logs for specific time range
  getLogsByTimeRange(startTime: Date, endTime: Date): LogEntry[] {
    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= startTime && logTime <= endTime;
    });
  }

  // Get error logs only
  getErrorLogs(limit = 50): LogEntry[] {
    return this.logs
      .filter(log => log.level === 'ERROR')
      .slice(-limit)
      .reverse();
  }

  // Clear old logs
  clearLogs(): void {
    this.logs = [];
    this.info("Logs cleared");
  }

  // Get log statistics
  getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    oldestLog?: string;
    newestLog?: string;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {
        DEBUG: 0,
        INFO: 0,
        WARN: 0,
        ERROR: 0
      },
      oldestLog: this.logs.length > 0 ? this.logs[0].timestamp : undefined,
      newestLog: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : undefined
    };

    this.logs.forEach(log => {
      if (stats.byLevel.hasOwnProperty(log.level)) {
        stats.byLevel[log.level]++;
      }
    });

    return stats;
  }

  // Set log level dynamically
  setLogLevel(level: keyof LogLevel): void {
    if (this.levels.hasOwnProperty(level)) {
      this.logLevel = level;
      this.info(`Log level changed to ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }

  // Get current log level
  getLogLevel(): keyof LogLevel {
    return this.logLevel;
  }
}

export const logger = new LoggerService();

// Initialize logger
logger.info("Logger service initialized");
