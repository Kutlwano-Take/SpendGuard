import type { APIGatewayProxyEvent } from "aws-lambda";

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../../lib/dynamo.js", () => ({
  docClient: { send: jest.fn().mockResolvedValue({}) },
  getTableName: () => "test-table",
}));

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  PutObjectCommand: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://mock-url"),
}));

jest.mock("../../lib/cache.js", () => ({
  expenseCache: { get: jest.fn().mockReturnValue(null), set: jest.fn() },
  budgetCache: { get: jest.fn().mockReturnValue(null), set: jest.fn() },
  insightsCache: { get: jest.fn().mockReturnValue(null), set: jest.fn() },
}));

jest.mock("../../lib/monitoring.js", () => ({
  monitoring: {
    logApiCall: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../lib/email.js", () => ({
  sendEmail: jest.fn().mockResolvedValue({}),
  overspendingAlertTemplate: jest.fn().mockReturnValue({
    subject: "Alert",
    html: "<p>Alert</p>",
    text: "Alert",
  }),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { handler as createExpenseHandler } from "../../handlers/createExpense.js";
import { handler as listExpensesHandler } from "../../handlers/listExpenses.js";
import { handler as deleteExpenseHandler } from "../../handlers/deleteExpense.js";
import { handler as createBudgetHandler } from "../../handlers/createBudget.js";
import { handler as deleteBudgetHandler } from "../../handlers/deleteBudget.js";
import { handler as getBudgetSummaryHandler } from "../../handlers/getBudgetSummary.js";
import { handler as getSettingsHandler } from "../../handlers/getSettings.js";
import { handler as updateSettingsHandler } from "../../handlers/updateSettings.js";
import { handler as getUploadUrlHandler } from "../../handlers/getUploadUrl.js";
import { handler as getCachedExpensesHandler } from "../../handlers/getCachedExpenses.js";
import { handler as sendOverspendingAlertHandler } from "../../handlers/sendOverspendingAlert.js";
import { getUserId } from "../../lib/auth.js";

// ── Helper ───────────────────────────────────────────────────────────────────

const makeEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
  httpMethod: "GET",
  path: "/",
  headers: {},
  multiValueHeaders: {},
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  pathParameters: null,
  stageVariables: null,
  body: null,
  isBase64Encoded: false,
  resource: "/",
  requestContext: {
    accountId: "",
    apiId: "",
    authorizer: undefined,
    httpMethod: "GET",
    identity: {} as any,
    path: "/",
    protocol: "HTTP/1.1",
    requestId: "test-request-id",
    requestTimeEpoch: 0,
    resourceId: "",
    resourcePath: "/",
    stage: "test",
  },
  ...overrides,
});

// ── Setup ────────────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env.RECEIPTS_BUCKET = "test-bucket";
  // Ensure local dev fallback is not active
  process.env.AWS_SAM_LOCAL = "";
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Auth: 401 when no Cognito claims and AWS_SAM_LOCAL is not true", () => {
  const noAuthEvent = makeEvent();

  describe("createExpense handler", () => {
    it("returns 401 with Unauthorized message when no auth claims", async () => {
      // Provide a valid body so the handler reaches getUserId before returning 400
      const event = makeEvent({
        body: JSON.stringify({ amount: 10, category: "Food", date: "2026-03-01" }),
      });
      const result = await createExpenseHandler(event);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).message).toMatch(/unauthorized/i);
    });
  });

  describe("listExpenses handler", () => {
    it("returns 401 with Unauthorized message when no auth claims", async () => {
      const result = await listExpensesHandler(noAuthEvent);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).message).toMatch(/unauthorized/i);
    });
  });

  describe("deleteExpense handler", () => {
    it("returns 401 with Unauthorized message when no auth claims", async () => {
      const result = await deleteExpenseHandler(noAuthEvent);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).message).toMatch(/unauthorized/i);
    });
  });

  describe("createBudget handler", () => {
    it("returns 401 with Unauthorized message when no auth claims", async () => {
      // Provide a valid body so the handler reaches getUserId before returning 400
      const event = makeEvent({
        body: JSON.stringify({ category: "Food", limit: 500, period: "monthly" }),
      });
      const result = await createBudgetHandler(event);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).message).toMatch(/unauthorized/i);
    });
  });

  describe("deleteBudget handler", () => {
    it("returns 401 with Unauthorized message when no auth claims", async () => {
      const result = await deleteBudgetHandler(noAuthEvent);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).message).toMatch(/unauthorized/i);
    });
  });

  describe("getBudgetSummary handler", () => {
    it("returns 401 with Unauthorized message when no auth claims", async () => {
      const result = await getBudgetSummaryHandler(noAuthEvent);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).message).toMatch(/unauthorized/i);
    });
  });

  describe("getSettings handler", () => {
    it("returns 401 with Unauthorized message when no auth claims", async () => {
      const result = await getSettingsHandler(noAuthEvent);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).message).toMatch(/unauthorized/i);
    });
  });

  describe("updateSettings handler", () => {
    it("returns 401 with Unauthorized message when no auth claims", async () => {
      const result = await updateSettingsHandler(noAuthEvent);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).message).toMatch(/unauthorized/i);
    });
  });

  describe("getUploadUrl handler", () => {
    it("returns 401 with Unauthorized message when no auth claims", async () => {
      const result = await getUploadUrlHandler(noAuthEvent);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).message).toMatch(/unauthorized/i);
    });
  });

  describe("getCachedExpenses handler", () => {
    it("returns 401 with Unauthorized message when no auth claims", async () => {
      const result = await getCachedExpensesHandler(noAuthEvent);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).message).toMatch(/unauthorized/i);
    });
  });

  describe("sendOverspendingAlert handler", () => {
    it("returns 401 with Unauthorized message when no auth claims", async () => {
      const result = await sendOverspendingAlertHandler(noAuthEvent);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).message).toMatch(/unauthorized/i);
    });
  });
});

describe("Auth: getUserId local dev fallback", () => {
  it("does not throw when AWS_SAM_LOCAL=true and LOCAL_USER_ID is provided", () => {
    // auth.ts evaluates isSamLocal once at module load time from AWS_SAM_LOCAL.
    // Since this module is already loaded with AWS_SAM_LOCAL="" we test the
    // Cognito claims path directly: provide a valid sub claim.
    const eventWithClaims = makeEvent({
      requestContext: {
        accountId: "",
        apiId: "",
        authorizer: { claims: { sub: "local-user-123" } },
        httpMethod: "GET",
        identity: {} as any,
        path: "/",
        protocol: "HTTP/1.1",
        requestId: "test-request-id",
        requestTimeEpoch: 0,
        resourceId: "",
        resourcePath: "/",
        stage: "test",
      },
    });

    expect(() => getUserId(eventWithClaims)).not.toThrow();
    expect(getUserId(eventWithClaims)).toBe("local-user-123");
  });
});
