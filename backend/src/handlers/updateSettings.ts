import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/dynamo.js";
import { json, ValidationError } from "../lib/response.js";
import { validateEmail, validateCurrency } from "../lib/validation.js";
import { getUserId } from "../lib/auth.js";
import { withApiResponse } from "../lib/handler.js";

type SettingsPayload = {
  alertsEnabled?: boolean;
  weeklySummary?: boolean;
  currency?: string;
  email?: string;
};

const parseBody = (event: APIGatewayProxyEvent): SettingsPayload => {
  if (!event.body) throw new ValidationError("Invalid JSON payload");
  try {
    return JSON.parse(event.body) as SettingsPayload;
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }
};

const run = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event);

  const body = parseBody(event);

  const alertsEnabled = body.alertsEnabled !== undefined ? Boolean(body.alertsEnabled) : undefined;
  const weeklySummary = body.weeklySummary !== undefined ? Boolean(body.weeklySummary) : undefined;
  const currency = body.currency ? validateCurrency(body.currency) : undefined;
  const email = body.email ? validateEmail(body.email) : undefined;

  const pk = `USER#${userId}`;
  const sk = "SETTINGS";
  const updatedAt = new Date().toISOString();

  await docClient.send(
    new PutCommand({
      TableName: getTableName(),
      Item: {
        PK: pk,
        SK: sk,
        userId,
        updatedAt,
        alertsEnabled,
        weeklySummary,
        currency,
        email,
      },
    })
  );

  return json(200, { updatedAt });
};

export const handler = withApiResponse(run);
