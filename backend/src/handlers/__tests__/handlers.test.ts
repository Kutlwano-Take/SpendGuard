import type { APIGatewayProxyEvent } from "aws-lambda";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSend = jest.fn();

jest.mock("../../lib/dynamo.js", () => ({
  docClient: { send: mockSend },
  getTableName: () => "test-table",
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

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { handler as createExpenseHandler } from "../../handlers/createExpense.js";
import { handler as listExpensesHandler } from "../../handlers/listExpenses.js";
import { handler as deleteExpenseHandler } from "../../handlers/deleteExpense.js";
import { handler as createBudgetHandler } from "../../handlers/createBudget.js";
import { handler as getBudgetSummaryHandler } from "../../handlers/getBudgetSummary.js";
import { handler as getSettingsHandler } from "../../handlers/getSettings.js";
import { handler as updateSettingsHandler } from "../../handlers/updateSettings.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

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

const makeAuthEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  makeEvent({
    requestContext: {
      ...makeEvent().requestContext,
      authorizer: { claims: { sub: "user-123", email: "user@example.com" } },
    },
    ...overrides,
  });

// ── Setup ────────────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env.AWS_SAM_LOCAL = "";
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── createExpense ─────────────────────────────────────────────────────────────

describe("createExpense handler", () => {
  it("returns 201 with expenseId on valid input", async () => {
    mockSend.mockResolvedValue({});

    const event = makeAuthEvent({
      httpMethod: "POST",
      body: JSON.stringify({ amount: 42.5, category: "Food", date: "2026-03-01" }),
    });

    const result = await createExpenseHandler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty("expenseId");
    expect(body).toHaveProperty("createdAt");
  });

  it("returns 400 when body is missing", async () => {
    const event = makeAuthEvent({ httpMethod: "POST", body: null });

    const result = await createExpenseHandler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty("message");
  });

  it("returns 400 when amount is negative", async () => {
    const event = makeAuthEvent({
      httpMethod: "POST",
      body: JSON.stringify({ amount: -10, category: "Food", date: "2026-03-01" }),
    });

    const result = await createExpenseHandler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty("message");
  });
});

// ── listExpenses ──────────────────────────────────────────────────────────────

describe("listExpenses handler", () => {
  it("returns 200 with items array when no query params", async () => {
    mockSend.mockResolvedValue({ Items: [] });

    const event = makeAuthEvent({ httpMethod: "GET" });

    const result = await listExpensesHandler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty("items");
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("returns 200 with items array when valid from/to query params are provided", async () => {
    mockSend.mockResolvedValue({ Items: [] });

    const event = makeAuthEvent({
      httpMethod: "GET",
      queryStringParameters: { from: "2026-02-01", to: "2026-02-28" },
    });

    const result = await listExpensesHandler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty("items");
    expect(Array.isArray(body.items)).toBe(true);
  });
});

// ── deleteExpense ─────────────────────────────────────────────────────────────

describe("deleteExpense handler", () => {
  it("returns 200 on valid expenseId path param", async () => {
    // First call: QueryCommand to find the item; Second call: DeleteCommand
    mockSend
      .mockResolvedValueOnce({ Items: [{ PK: "USER#user-123", SK: "EXPENSE#2026-03-01", expenseId: "expense-abc123" }] })
      .mockResolvedValueOnce({});

    const event = makeAuthEvent({
      httpMethod: "DELETE",
      pathParameters: { expenseId: "expense-abc123" },
    });

    const result = await deleteExpenseHandler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty("message");
  });

  it("returns 400 when expenseId path param is missing", async () => {
    const event = makeAuthEvent({
      httpMethod: "DELETE",
      pathParameters: null,
    });

    const result = await deleteExpenseHandler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty("message");
  });
});

// ── createBudget ──────────────────────────────────────────────────────────────

describe("createBudget handler", () => {
  it("returns 201 with budgetId on valid input", async () => {
    mockSend.mockResolvedValue({});

    const event = makeAuthEvent({
      httpMethod: "POST",
      body: JSON.stringify({ category: "Food", limit: 500, period: "monthly" }),
    });

    const result = await createBudgetHandler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty("budgetId");
    expect(body).toHaveProperty("createdAt");
  });

  it("returns 400 when category is missing", async () => {
    const event = makeAuthEvent({
      httpMethod: "POST",
      body: JSON.stringify({ limit: 500, period: "monthly" }),
    });

    const result = await createBudgetHandler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty("message");
  });
});

// ── getBudgetSummary ──────────────────────────────────────────────────────────

describe("getBudgetSummary handler", () => {
  it("returns 200 with items array on success", async () => {
    mockSend.mockResolvedValue({ Items: [] });

    const event = makeAuthEvent({ httpMethod: "GET" });

    const result = await getBudgetSummaryHandler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty("items");
    expect(Array.isArray(body.items)).toBe(true);
  });
});

// ── getSettings ───────────────────────────────────────────────────────────────

describe("getSettings handler", () => {
  it("returns 200 on success", async () => {
    mockSend.mockResolvedValue({
      Item: { PK: "USER#user-123", SK: "SETTINGS", alertsEnabled: true },
    });

    const event = makeAuthEvent({ httpMethod: "GET" });

    const result = await getSettingsHandler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty("item");
  });
});

// ── updateSettings ────────────────────────────────────────────────────────────

describe("updateSettings handler", () => {
  it("returns 200 with updatedAt on valid body", async () => {
    mockSend.mockResolvedValue({});

    const event = makeAuthEvent({
      httpMethod: "PUT",
      body: JSON.stringify({ alertsEnabled: true, currency: "USD", email: "user@example.com" }),
    });

    const result = await updateSettingsHandler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty("updatedAt");
  });

  it("returns 400 when email format is invalid", async () => {
    const event = makeAuthEvent({
      httpMethod: "PUT",
      body: JSON.stringify({ email: "not-a-valid-email" }),
    });

    const result = await updateSettingsHandler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty("message");
  });
});
