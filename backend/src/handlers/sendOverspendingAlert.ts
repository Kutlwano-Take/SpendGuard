import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/dynamo.js";
import { json } from "../lib/response.js";
import { sendEmail, overspendingAlertTemplate } from "../lib/email.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId =
    (event.requestContext.authorizer?.claims?.sub as string | undefined) ??
    (event.requestContext.authorizer?.jwt?.claims?.sub as string | undefined);

  if (!userId) {
    return json(401, { message: "Unauthorized" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { category, spent, limit } = body;

    if (!category || spent === undefined || limit === undefined) {
      return json(400, { message: "Missing required fields: category, spent, limit" });
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

    // Get user email from Cognito (would come from claims in real scenario)
    // For now, we'll need to store user email in settings
    if (!settings?.email) {
      return json(400, { message: "User email not configured" });
    }

    // Only send alert if overspent (>100%)
    const percentage = (spent / limit) * 100;
    if (percentage <= 100) {
      return json(200, { message: "Not overspent, no alert needed" });
    }

    // Generate and send email
    const emailTemplate = overspendingAlertTemplate(category, spent, limit, settings.email);
    await sendEmail({
      to: settings.email,
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
