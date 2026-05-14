import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { monitoring } from "./monitoring.js";
import { corsHeaders, toError } from "./response.js";

type ErrorAwareHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

type ErrorAwareResult = Awaited<ReturnType<ErrorAwareHandler>> | APIGatewayProxyResult;
type ApiHeaders = NonNullable<APIGatewayProxyResult["headers"]>;
type RequestHeaders = Record<string, string | undefined>;

const extractRequestDuration = (start: number): number => Date.now() - start;

const getUserIdForLogging = (event: APIGatewayProxyEvent): string => {
  const claims = event.requestContext.authorizer?.claims as { sub?: unknown } | undefined;
  const jwtClaims = event.requestContext.authorizer?.jwt?.claims as { sub?: unknown } | undefined;
  const subject = claims?.sub ?? jwtClaims?.sub;
  return typeof subject === "string" && subject.trim() ? subject.trim() : "unknown";
};

export const withApiErrorHandling = <TEvent extends APIGatewayProxyEvent>(
  handler: (event: TEvent) => Promise<APIGatewayProxyResult>
): ((event: TEvent) => Promise<APIGatewayProxyResult>) => {
  return async (event: TEvent): Promise<APIGatewayProxyResult> => {
    const start = Date.now();
    const requestId = event.requestContext?.requestId ?? "unknown";
    const action = `${event.httpMethod ?? "N/A"} ${event.path ?? event.resource ?? "N/A"}`;
    const headers = event.headers as RequestHeaders | undefined;
    const userId = getUserIdForLogging(event);

    try {
      const result: ErrorAwareResult = await handler(event);
      const duration = extractRequestDuration(start);
      const normalizedHeaders = {
        ...corsHeaders(headers),
        ...(result.headers ?? {}),
      };
      const normalizedResult: APIGatewayProxyResult = {
        ...result,
        headers: normalizedHeaders,
      };

      if (process.env.NODE_ENV !== "test" && typeof result !== "string") {
        await monitoring.logApiCall(action, userId, requestId, duration, normalizedResult.statusCode, {
          path: event.path,
          statusCode: normalizedResult.statusCode,
        });
      }

      return normalizedResult;
    } catch (error) {
      const duration = extractRequestDuration(start);
      const statusCode = toError(error, headers).statusCode;

      if (process.env.NODE_ENV !== "test") {
        await monitoring.error("API handler error", {
          action,
          userId,
          requestId,
          duration,
          statusCode,
        });
      }

      const response = toError(error, headers);
      response.headers = {
        ...response.headers,
        ...corsHeaders(headers),
      } as ApiHeaders;

      return response;
    }
  };
};

export const withApiResponse = <TEvent extends APIGatewayProxyEvent>(
  handler: (event: TEvent) => Promise<APIGatewayProxyResult>
): ((event: TEvent) => Promise<APIGatewayProxyResult>) => {
  return withApiErrorHandling(handler);
};
