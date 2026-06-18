/**
 * Log Capture Service
 * Captures all console output for real-time display in UI
 */

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  data?: any;
}

class LogCaptureService {
  private logs: LogEntry[] = [];
  private maxLogs = 500; // Keep last 500 logs
  private listeners: ((log: LogEntry) => void)[] = [];

  constructor() {
    this.setupConsoleCapture();
  }

  /**
   * Setup console capture to intercept all console output
   */
  private setupConsoleCapture() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;
    const capturedError = originalError;

    console.log = (...args: any[]) => {
      originalLog(...args);
      this.captureLog('log', args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      this.captureLog('warn', args);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      this.captureLog('error', args);
    };

    console.info = (...args: any[]) => {
      originalInfo(...args);
      this.captureLog('info', args);
    };
  }

  /**
   * Capture a log entry
   */
  private captureLog(level: 'log' | 'warn' | 'error' | 'info', args: any[]) {
    // Format message from arguments
    const message = args
      .map(arg => {
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: args.length > 1 ? args.slice(1) : undefined,
    };

    // Add to logs array
    this.logs.push(logEntry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(logEntry);
      } catch (error) {
        // Prevent listener errors from breaking the system
        console.error('[LogCaptureService] Listener error:', error);
      }
    });
  }

  /**
   * Get all captured logs
   */
  getLogs(limit?: number): LogEntry[] {
    if (limit) {
      return this.logs.slice(-limit);
    }
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: 'log' | 'warn' | 'error' | 'info', limit?: number): LogEntry[] {
    const filtered = this.logs.filter(log => log.level === level);
    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  /**
   * Get logs filtered by keyword
   */
  getLogsByKeyword(keyword: string, limit?: number): LogEntry[] {
    const filtered = this.logs.filter(log =>
      log.message.toLowerCase().includes(keyword.toLowerCase())
    );
    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  /**
   * Subscribe to new log entries
   */
  subscribe(callback: (log: LogEntry) => void): () => void {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Get total log count
   */
  getLogCount(): number {
    return this.logs.length;
  }
}

// Create singleton instance
export const logCaptureService = new LogCaptureService();
