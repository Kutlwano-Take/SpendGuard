import type { APIGatewayProxyEvent } from "aws-lambda";
import { UnauthorizedError } from "./response.js";

type AuthorizerClaims = {
  sub?: unknown;
  email?: unknown;
};

// Evaluated once at module load time. In all deployed (non-SAM-local) environments
// this will be false, which disables every local fallback in this module.
const isSamLocal = process.env.AWS_SAM_LOCAL === "true";

const getClaims = (event: APIGatewayProxyEvent): AuthorizerClaims | null => {
  const claims = event.requestContext.authorizer?.claims as AuthorizerClaims | undefined;
  const jwtClaims = event.requestContext.authorizer?.jwt?.claims as
    | AuthorizerClaims
    | undefined;
  return claims ?? jwtClaims ?? null;
};

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const getLocalUserId = (): string | null => {
  if (!isSamLocal) return null;
  return toNonEmptyString(process.env.LOCAL_USER_ID) ?? "local-user-123";
};

const getLocalUserEmail = (): string | null => {
  if (!isSamLocal) return null;
  return toNonEmptyString(process.env.LOCAL_USER_EMAIL);
};

/**
 * Returns the authenticated user's ID from Cognito claims on the incoming event.
 *
 * Production contract: when AWS_SAM_LOCAL is not "true", Cognito claims MUST be
 * present on the event. If no `sub` claim is found, this function ALWAYS throws
 * UnauthorizedError — there is no fallback, no default, and no bypass path.
 *
 * The local-dev fallback (getLocalUserId) is gated exclusively on `isSamLocal`,
 * which is derived from AWS_SAM_LOCAL at module load time and is always false in
 * deployed environments.
 */
export function getUserId(event: APIGatewayProxyEvent): string {
  const claims = getClaims(event);
  const userId = toNonEmptyString(claims?.sub) ?? getLocalUserId();

  if (!userId) {
    throw new UnauthorizedError("Unauthorized: No user ID found in token");
  }

  return userId;
}

export function getUserEmail(event: APIGatewayProxyEvent): string | null {
  const claims = getClaims(event);
  return toNonEmptyString(claims?.email) ?? (isSamLocal ? getLocalUserEmail() : null);
}
