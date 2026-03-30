import type { APIGatewayHeaders, APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

type HeaderInput = APIGatewayProxyEvent["headers"] | null | undefined;

const requestOriginAllowed = (): string[] => {
  const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS;
  const frontendDomain = process.env.FRONTEND_DOMAIN;
  const isDevelopment = process.env.ENVIRONMENT !== "production" || process.env.AWS_SAM_LOCAL === "true";

  if (configuredOrigins) {
    const parsed = configuredOrigins
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  if (frontendDomain) {
    return [`https://${frontendDomain}`];
  }

  if (isDevelopment) {
    return ["http://localhost:5173", "http://localhost:3000"];
  }

  return ["https://localhost"];
};

const resolveOrigin = (requestOrigin?: string | null): string => {
  const allowedOrigins = requestOriginAllowed();
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowedOrigins[0] ?? "*";
};

const resolveRequestOrigin = (headers?: HeaderInput): string | null => {
  if (!headers) return null;
  const anyHeaders = headers as Record<string, string | undefined>;
  return anyHeaders.Origin || anyHeaders.origin || null;
};

export const corsHeaders = (headers?: HeaderInput): APIGatewayHeaders => {
  const requestOrigin = resolveRequestOrigin(headers);
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": resolveOrigin(requestOrigin),
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    Vary: "Origin",
  };
};

export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

export class ValidationError extends HttpError {
  constructor(message: string) {
    super(400, message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized: No user ID found in token") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Access denied") {
    super(403, message);
    this.name = "ForbiddenError";
  }
}

const isLikelyValidationError = (message: string): boolean => {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("invalid") ||
    lowered.includes("out of range") ||
    lowered.includes("required") ||
    lowered.includes("expected") ||
    lowered.includes("too long")
  );
};

export const toError = (error: unknown, headers?: HeaderInput): APIGatewayProxyResult => {
  if (error instanceof HttpError) {
    return json(error.statusCode, { message: error.message }, headers);
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  const lowered = message.toLowerCase();

  if (lowered.includes("unauthorized") || lowered.includes("no user id") || lowered.includes("token")) {
    return unauthorized(message, headers);
  }

  if (lowered.includes("forbidden")) {
    return forbidden(message, headers);
  }

  if (lowered.includes("not found")) {
    return notFound(message, headers);
  }

  if (isLikelyValidationError(message)) {
    return badRequest(message, headers);
  }

  return internalServerError(headers);
};

export const json = (
  statusCode: number,
  body: object,
  headers?: HeaderInput
): APIGatewayProxyResult => ({
  statusCode,
  headers: corsHeaders(headers),
  body: JSON.stringify(body),
});

export const errorResponse = (
  statusCode: number,
  message: string,
  headers?: HeaderInput
): APIGatewayProxyResult => json(statusCode, { message }, headers);

export const error = errorResponse;

export const badRequest = (message: string, headers?: HeaderInput): APIGatewayProxyResult =>
  errorResponse(400, message, headers);

export const unauthorized = (message: string, headers?: HeaderInput): APIGatewayProxyResult =>
  errorResponse(401, message, headers);

export const forbidden = (message: string, headers?: HeaderInput): APIGatewayProxyResult =>
  errorResponse(403, message, headers);

export const notFound = (message: string, headers?: HeaderInput): APIGatewayProxyResult =>
  errorResponse(404, message, headers);

export const internalServerError = (headers?: HeaderInput): APIGatewayProxyResult =>
  errorResponse(500, "Internal server error", headers);
