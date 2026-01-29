/**
 * Centralized logging system
 * Production-ready with levels and structured output
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

interface LogContext {
  [key: string]: any
}

class Logger {
  private minLevel: LogLevel
  private isProduction: boolean

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.minLevel = this.isProduction ? LogLevel.INFO : LogLevel.DEBUG
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level}] ${message}${contextStr}`
  }

  private log(level: LogLevel, levelName: string, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return

    const formatted = this.formatMessage(levelName, message, context)

    // In production, you could send to external service (Sentry, LogRocket, etc.)
    if (this.isProduction && level >= LogLevel.ERROR) {
      // TODO: Send to error tracking service
      // Example: Sentry.captureMessage(formatted, level)
    }

    // Console output with appropriate method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted)
        break
      case LogLevel.INFO:
        console.info(formatted)
        break
      case LogLevel.WARN:
        console.warn(formatted)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted)
        break
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context)
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, 'INFO', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, 'WARN', message, context)
  }

  error(message: string, error?: Error | any, context?: LogContext) {
    const errorContext = {
      ...context,
      ...(error && {
        error: error.message || String(error),
        stack: error.stack
      })
    }
    this.log(LogLevel.ERROR, 'ERROR', message, errorContext)
  }

  fatal(message: string, error?: Error | any, context?: LogContext) {
    const errorContext = {
      ...context,
      ...(error && {
        error: error.message || String(error),
        stack: error.stack
      })
    }
    this.log(LogLevel.FATAL, 'FATAL', message, errorContext)
  }

  /**
   * Create a child logger with prefixed context
   */
  child(prefix: string): Logger {
    const childLogger = new Logger()
    const originalLog = childLogger.log.bind(childLogger)
    
    childLogger.log = (level: LogLevel, levelName: string, message: string, context?: LogContext) => {
      originalLog(level, levelName, `[${prefix}] ${message}`, context)
    }
    
    return childLogger
  }
}

// Singleton instance
export const logger = new Logger()

// Convenience exports
export default logger
