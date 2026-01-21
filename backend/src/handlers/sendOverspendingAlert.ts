import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/dynamo.js";
import { error, json } from "../lib/response.js";
import { sendEmail, overspendingAlertTemplate } from "../lib/email.js";

const getUserId = (event: APIGatewayProxyEvent): string | null => {
  return (
    (event.requestContext.authorizer?.claims?.sub as string | undefined) ??
    (event.requestContext.authorizer?.jwt?.claims?.sub as string | undefined) ??
    null
  );
};

const getUserEmailFromClaims = (event: APIGatewayProxyEvent): string | null => {
  const email =
    (event.requestContext.authorizer?.claims?.email as string | undefined) ??
    (event.requestContext.authorizer?.jwt?.claims?.email as string | undefined);
  return typeof email === "string" && email.trim() ? email.trim() : null;
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event) ?? "demo";

  try {
    const body = JSON.parse(event.body || "{}");
    const { category, spent, limit } = body;

    if (!category || spent === undefined || limit === undefined) {
      return error(400, "Missing required fields: category, spent, limit");
    }

    // Check if user has alerts enabled
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

    const recipientEmail = getUserEmailFromClaims(event) ?? (settings?.email as string | undefined);
    if (!recipientEmail || typeof recipientEmail !== "string" || !recipientEmail.trim()) {
      return error(400, "User email not configured");
    }

    // Only send alert if overspent (>100%)
    const percentage = (spent / limit) * 100;
    if (percentage <= 100) {
      return json(200, { message: "Not overspent, no alert needed" });
    }

    // Generate and send email
    const emailTemplate = overspendingAlertTemplate(category, spent, limit, recipientEmail);
    await sendEmail({
      to: recipientEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return json(200, { message: "Overspending alert sent successfully" });
  } catch (error) {
    console.error("Error sending overspending alert:", error);
    return json(500, { message: `Error: ${error instanceof Error ? error.message : "Unknown error"}` });
  }
};
