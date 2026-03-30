import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { docClient, getTableName } from "../lib/dynamo.js";
import { withApiResponse } from "../lib/handler.js";
import { ValidationError, json } from "../lib/response.js";
import type { ExpenseInput } from "../models.js";
import { validateNumber, validateCategory, validateDate, sanitizeString } from "../lib/validation.js";
import { getUserId } from "../lib/auth.js";

const parseBody = (event: APIGatewayProxyEvent): ExpenseInput => {
  if (!event.body) {
    throw new ValidationError("Invalid JSON payload");
  }
  try {
    return JSON.parse(event.body) as ExpenseInput;
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }
};

const run = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const body = parseBody(event);
  const expenseId = randomUUID();
  const amount = validateNumber(body.amount, 0, 10000000);
  const category = validateCategory(body.category);
  const date = body.date ? validateDate(body.date) : new Date().toISOString().slice(0, 10);
  const notes = body.notes ? sanitizeString(body.notes, 500) : undefined;

  const userId = getUserId(event);
  const createdAt = new Date().toISOString();
  const pk = `USER#${userId}`;
  const sk = `EXPENSE#${date}#${expenseId}`;

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
        amount,
        category,
        date,
        notes,
      },
    })
  );

  return json(201, { expenseId, createdAt });
};

export const handler = withApiResponse(run);
