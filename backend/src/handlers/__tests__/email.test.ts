import type { APIGatewayProxyEvent } from "aws-lambda";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSend = jest.fn();

jest.mock("../../lib/dynamo.js", () => ({
  docClient: { send: mockSend },
  getTableName: () => "test-table",
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
  weeklySummaryTemplate: jest.fn().mockReturnValue({
    subject: "Summary",
    html: "<p>Summary</p>",
    text: "Summary",
  }),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { handler as sendOverspendingAlertHandler } from "../../handlers/sendOverspendingAlert.js";
import { handler as sendWeeklySummaryHandler } from "../../handlers/sendWeeklySummary.js";
import { sendEmail } from "../../lib/email.js";

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
      authorizer: { claims: { sub: "user-123", email: "user@test.com" } },
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

// ── sendOverspendingAlert ─────────────────────────────────────────────────────

describe("sendOverspendingAlert handler", () => {
  it("sends email and returns 200 when alertsEnabled=true and spent > limit", async () => {
    mockSend.mockResolvedValue({
      Item: { alertsEnabled: true, email: "user@test.com" },
    });

    const event = makeAuthEvent({
      httpMethod: "POST",
      body: JSON.stringify({ category: "Food", spent: 600, limit: 500 }),
    });

    const result = await sendOverspendingAlertHandler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe("Overspending alert sent successfully");
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("does not call sendEmail and returns 200 when alertsEnabled=false", async () => {
    mockSend.mockResolvedValue({
      Item: { alertsEnabled: false, email: "user@test.com" },
    });

    const event = makeAuthEvent({
      httpMethod: "POST",
      body: JSON.stringify({ category: "Food", spent: 600, limit: 500 }),
    });

    const result = await sendOverspendingAlertHandler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe("Alerts disabled, no email sent");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("does not call sendEmail and returns 200 when spent <= limit", async () => {
    mockSend.mockResolvedValue({
      Item: { alertsEnabled: true, email: "user@test.com" },
    });

    const event = makeAuthEvent({
      httpMethod: "POST",
      body: JSON.stringify({ category: "Food", spent: 400, limit: 500 }),
    });

    const result = await sendOverspendingAlertHandler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe("Not overspent, no alert needed");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns 400 when category field is missing", async () => {
    const event = makeAuthEvent({
      httpMethod: "POST",
      body: JSON.stringify({ spent: 600, limit: 500 }),
    });

    const result = await sendOverspendingAlertHandler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty("message");
  });
});

// ── sendWeeklySummary ─────────────────────────────────────────────────────────

describe("sendWeeklySummary handler (API-triggered)", () => {
  it("sends email and returns 200 when weeklySummary=true and userId is valid", async () => {
    // Call 1: GetCommand for settings
    // Call 2: QueryCommand for expenses (inside sendSummaryForUser)
    // Call 3: QueryCommand for budgets (inside sendSummaryForUser)
    mockSend
      .mockResolvedValueOnce({ Item: { weeklySummary: true, email: "user@test.com" } })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [] });

    const event = makeAuthEvent({ httpMethod: "POST", body: null });

    const result = await sendWeeklySummaryHandler(event);

    expect(result!.statusCode).toBe(200);
    expect(JSON.parse(result!.body).message).toBe("Weekly summary sent successfully");
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("does not call sendEmail and returns 200 when weeklySummary=false", async () => {
    mockSend.mockResolvedValueOnce({ Item: { weeklySummary: false, email: "user@test.com" } });

    const event = makeAuthEvent({ httpMethod: "POST", body: null });

    const result = await sendWeeklySummaryHandler(event);

    expect(result!.statusCode).toBe(200);
    expect(JSON.parse(result!.body).message).toBe("Weekly summary disabled");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
