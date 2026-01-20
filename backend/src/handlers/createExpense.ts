import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { docClient, getTableName } from "../lib/dynamo.js";
import { error, json } from "../lib/response.js";
import type { ExpenseInput } from "../models.js";

type ExpensePayload = ExpenseInput & { notes?: string; note?: string };

const toDateOnly = (value: string): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const parseBody = (event: APIGatewayProxyEvent): ExpensePayload | null => {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body) as ExpensePayload;
  } catch {
    return null;
  }
};

const getUserId = (event: APIGatewayProxyEvent): string | null => {
  return (
    (event.requestContext.authorizer?.claims?.sub as string | undefined) ??
    (event.requestContext.authorizer?.jwt?.claims?.sub as string | undefined) ??
    null
  );
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (process.env.AWS_SAM_LOCAL === "true" || process.env.DYNAMODB_ENDPOINT) {
    console.log("local-config", {
      tableName: process.env.TABLE_NAME,
      samLocal: process.env.AWS_SAM_LOCAL,
      dynamoEndpoint: process.env.DYNAMODB_ENDPOINT,
    });
  }
  const body = parseBody(event);
  if (!body) {
    return error(400, "Invalid JSON payload");
  }

  if (typeof body.amount !== "number" || !body.category) {
    return error(400, "amount (number) and category are required");
  }

  const userId = getUserId(event);
  if (!userId) {
    return error(401, "Unauthorized");
  }

  const expenseId = randomUUID();
  const createdAt = new Date().toISOString();
  const date = toDateOnly(body.date ?? createdAt) ?? createdAt.slice(0, 10);
  const notes = body.notes ?? body.note;
  const pk = `USER#${userId}`;
  const sk = `EXPENSE#${date}`;

  await docClient.send(
    new PutCommand({
      TableName: getTableName(),
      Item: {
        PK: pk,
        SK: sk,
        GSI1PK: pk,
        GSI1SK: sk,
        userId,
        expenseId,
        createdAt,
        amount: body.amount,
        category: body.category,
        date,
        notes,
      },
    })
  );

  return json(201, { expenseId, createdAt });
};
