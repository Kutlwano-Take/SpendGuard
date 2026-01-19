import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { docClient, getTableName } from "../lib/dynamo.js";
import { error, json } from "../lib/response.js";
import type { BudgetInput } from "../models.js";

const parseBody = (event: APIGatewayProxyEvent): BudgetInput | null => {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body) as BudgetInput;
  } catch {
    return null;
  }
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const body = parseBody(event);
  if (!body) {
    return error(400, "Invalid JSON payload");
  }

  if (!body.category || typeof body.limit !== "number" || !body.period) {
    return error(400, "category, limit (number), and period are required");
  }

  const userId =
    (event.requestContext.authorizer?.claims?.sub as string | undefined) ??
    (event.requestContext.authorizer?.jwt?.claims?.sub as string | undefined);
  if (!userId) {
    return error(401, "Unauthorized");
  }

  const budgetId = randomUUID();
  const createdAt = new Date().toISOString();
  const pk = `USER#${userId}`;
  const sk = `BUDGET#${budgetId}`;

  await docClient.send(
    new PutCommand({
      TableName: getTableName(),
      Item: {
        PK: pk,
        SK: sk,
        userId,
        budgetId,
        createdAt,
        ...body,
      },
    })
  );

  return json(201, { budgetId, createdAt });
};
