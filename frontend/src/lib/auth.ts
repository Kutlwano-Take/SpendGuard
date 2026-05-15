export type AuthMode = "cognito" | "demo";

export type AuthSession = {
  mode: AuthMode;
  email: string;
  idToken: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt: number;
};

export type SignUpResult = {
  needsConfirmation: boolean;
  email: string;
};

const sessionKey = "spendguard.auth.session";
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined;
const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID as string | undefined;
const configuredRegion = import.meta.env.VITE_AWS_REGION as string | undefined;
const region = configuredRegion || userPoolId?.split("_")[0] || "af-south-1";
const endpoint = `https://cognito-idp.${region}.amazonaws.com/`;

type CognitoAuthResult = {
  AccessToken?: string;
  ExpiresIn?: number;
  IdToken?: string;
  RefreshToken?: string;
};

type CognitoResponse = {
  AuthenticationResult?: CognitoAuthResult;
  UserConfirmed?: boolean;
  CodeDeliveryDetails?: unknown;
};

export function getStoredSession(): AuthSession | null {
  try {
    const stored = window.sessionStorage.getItem(sessionKey);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<AuthSession>;
    if (!parsed.email || !parsed.idToken || !parsed.expiresAt || !parsed.mode) {
      return null;
    }

    return parsed as AuthSession;
  } catch {
    return null;
  }
}

export function storeSession(session: AuthSession) {
  window.sessionStorage.setItem(sessionKey, JSON.stringify(session));
}

export function clearStoredSession() {
  window.sessionStorage.removeItem(sessionKey);
}

export async function signInWithCognito(email: string, password: string): Promise<AuthSession> {
  ensureCognitoConfigured();

  const response = await cognitoRequest("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: email.trim().toLowerCase(),
      PASSWORD: password,
    },
  });

  return sessionFromAuthResult(email, response.AuthenticationResult);
}

export async function signUpWithCognito(email: string, password: string): Promise<SignUpResult> {
  ensureCognitoConfigured();

  const normalizedEmail = email.trim().toLowerCase();
  const response = await cognitoRequest("SignUp", {
    ClientId: clientId,
    Username: normalizedEmail,
    Password: password,
    UserAttributes: [{ Name: "email", Value: normalizedEmail }],
  });

  return {
    needsConfirmation: response.UserConfirmed !== true,
    email: normalizedEmail,
  };
}

export async function confirmCognitoSignUp(email: string, code: string) {
  ensureCognitoConfigured();

  await cognitoRequest("ConfirmSignUp", {
    ClientId: clientId,
    Username: email.trim().toLowerCase(),
    ConfirmationCode: code.trim(),
  });
}

export async function refreshCognitoSession(session: AuthSession): Promise<AuthSession> {
  if (session.mode !== "cognito" || !session.refreshToken) {
    return session;
  }

  const response = await cognitoRequest("InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: clientId,
    AuthParameters: {
      REFRESH_TOKEN: session.refreshToken,
    },
  });

  return {
    ...sessionFromAuthResult(session.email, response.AuthenticationResult),
    refreshToken: session.refreshToken,
  };
}

export function createDemoSession(email = "demo@spendguard.local"): AuthSession {
  return {
    mode: "demo",
    email,
    idToken: "demo-token",
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
}

export function getAuthReadiness() {
  return {
    hasCognitoConfig: Boolean(userPoolId && clientId),
    region,
  };
}

function ensureCognitoConfigured() {
  if (!userPoolId || !clientId) {
    throw new Error("Cognito is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_USER_POOL_CLIENT_ID.");
  }
}

async function cognitoRequest(target: string, payload: Record<string, unknown>): Promise<CognitoResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const message =
      (typeof body.message === "string" && body.message) ||
      (typeof body.__type === "string" && body.__type.replace(/^.*#/, "")) ||
      "Authentication request failed.";
    throw new Error(message);
  }

  return body as CognitoResponse;
}

function sessionFromAuthResult(email: string, result?: CognitoAuthResult): AuthSession {
  if (!result?.IdToken) {
    throw new Error("Authentication did not return an ID token.");
  }

  const claims = decodeJwtPayload(result.IdToken);
  const expiresAt = typeof claims.exp === "number" ? claims.exp * 1000 : Date.now() + (result.ExpiresIn ?? 3600) * 1000;

  return {
    mode: "cognito",
    email: (typeof claims.email === "string" && claims.email) || email.trim().toLowerCase(),
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken,
    expiresAt,
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split(".")[1];
  if (!payload) {
    return {};
  }

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = window.atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}
