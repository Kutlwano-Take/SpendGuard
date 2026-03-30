export interface LogEvent {
  message: string;
  timestamp?: number;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  userId?: string;
  requestId?: string;
  action?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

const emit = (event: LogEvent): void => {
  const entry = {
    level: event.level,
    message: event.message,
    userId: event.userId,
    requestId: event.requestId,
    action: event.action,
    duration: event.duration,
    metadata: event.metadata,
    timestamp: new Date(event.timestamp ?? Date.now()).toISOString(),
  };

  const payload = JSON.stringify(entry);

  if (event.level === "ERROR") {
    console.error(payload);
    return;
  }

  if (event.level === "WARN") {
    console.warn(payload);
    return;
  }

  if (event.level === "DEBUG") {
    console.debug(payload);
    return;
  }

  console.info(payload);
};

export class MonitoringService {
  async logEvent(event: LogEvent): Promise<void> {
    emit(event);
  }

  async info(message: string, metadata?: LogEvent["metadata"]): Promise<void> {
    await this.logEvent({ level: "INFO", message, metadata });
  }

  async warn(message: string, metadata?: LogEvent["metadata"]): Promise<void> {
    await this.logEvent({ level: "WARN", message, metadata });
  }

  async error(message: string, metadata?: LogEvent["metadata"]): Promise<void> {
    await this.logEvent({ level: "ERROR", message, metadata });
  }

  async debug(message: string, metadata?: LogEvent["metadata"]): Promise<void> {
    await this.logEvent({ level: "DEBUG", message, metadata });
  }

  async logApiCall(
    action: string,
    userId: string,
    requestId: string,
    duration: number,
    statusCode: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logEvent({
      level: statusCode >= 400 ? "ERROR" : "INFO",
      message: "API Call",
      userId,
      requestId,
      action,
      duration,
      metadata: {
        ...metadata,
        statusCode,
      },
    });
  }

  async logBusinessEvent(
    event: string,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logEvent({
      level: "INFO",
      message: "Business Event",
      userId,
      action: event,
      metadata,
    });
  }

  async logSecurityEvent(
    event: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logEvent({
      level: "WARN",
      message: "Security Event",
      userId,
      action: event,
      metadata,
    });
  }

  async logPerformanceMetric(
    metric: string,
    value: number,
    unit: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logEvent({
      level: "INFO",
      message: "Performance Metric",
      action: "performance",
      metadata: {
        metric,
        value,
        unit,
        ...metadata,
      },
    });
  }
}

export const monitoring = new MonitoringService();
