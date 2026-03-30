import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/dynamo.js";
import { json, ValidationError } from "../lib/response.js";
import { sendEmail, overspendingAlertTemplate } from "../lib/email.js";
import { getUserEmail, getUserId } from "../lib/auth.js";
import { withApiResponse } from "../lib/handler.js";
import { validateCategory, validateNumber } from "../lib/validation.js";

type OverspendingAlertPayload = {
  category?: unknown;
  spent?: unknown;
  limit?: unknown;
};

const parseBody = (event: APIGatewayProxyEvent): OverspendingAlertPayload => {
  if (!event.body) {
    throw new ValidationError("Invalid JSON payload");
  }

  try {
    return JSON.parse(event.body) as OverspendingAlertPayload;
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }
};

const run = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event);
  const body = parseBody(event);
  const category = validateCategory(body.category);
  const spent = validateNumber(body.spent, 0, 10000000);
  const limit = validateNumber(body.limit, 0.01, 10000000);

  const settingsResult = await docClient.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { PK: `USER#${userId}`, SK: "SETTINGS" },
    })
  );

  const settings = settingsResult.Item as any;
  if (!settings?.alertsEnabled) {
    return json(200, { message: "Alerts disabled, no email sent" });
  }

  const recipientEmail = getUserEmail(event) ?? (settings?.email as string | undefined);
  if (!recipientEmail || typeof recipientEmail !== "string" || !recipientEmail.trim()) {
    throw new ValidationError("User email not configured");
  }

  const percentage = (spent / limit) * 100;
  if (percentage <= 100) {
    return json(200, { message: "Not overspent, no alert needed" });
  }

  const emailTemplate = overspendingAlertTemplate(category, spent, limit, recipientEmail);
  await sendEmail({
    to: recipientEmail,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    text: emailTemplate.text,
  });

  return json(200, { message: "Overspending alert sent successfully" });
};

export const handler = withApiResponse(run);
