import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/dynamo.js";
import { error, json } from "../lib/response.js";

type SettingsPayload = {
  alertsEnabled?: boolean;
  weeklySummary?: boolean;
  currency?: string;
  email?: string;
};

const parseBody = (event: APIGatewayProxyEvent): SettingsPayload | null => {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body) as SettingsPayload;
  } catch {
    return null;
  }
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const body = parseBody(event);
  if (!body) {
    return error(400, "Invalid JSON payload");
  }

  const userId =
    (event.requestContext.authorizer?.claims?.sub as string | undefined) ??
    (event.requestContext.authorizer?.jwt?.claims?.sub as string | undefined);
  if (!userId) {
    return error(401, "Unauthorized");
  }

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
        ...body,
      },
    })
  );

  return json(200, { updatedAt });
};
