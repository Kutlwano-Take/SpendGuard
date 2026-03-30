import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { docClient, getTableName } from "../lib/dynamo.js";
import { withApiResponse } from "../lib/handler.js";
import { ValidationError, json } from "../lib/response.js";
import type { BudgetInput } from "../models.js";
import { validateNumber, validateCategory, validatePeriod } from "../lib/validation.js";
import { getUserId } from "../lib/auth.js";

const parseBody = (event: APIGatewayProxyEvent): BudgetInput => {
  if (!event.body) {
    throw new ValidationError("Invalid JSON payload");
  }
  try {
    return JSON.parse(event.body) as BudgetInput;
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }
};

const run = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const body = parseBody(event);
  const category = validateCategory(body.category);
  const limit = validateNumber(body.limit, 0, 10000000);
  const period = validatePeriod(body.period);
  const userId = getUserId(event);

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
        category,
        limit,
        period,
      },
    })
  );

  return json(201, { budgetId, createdAt });
};

export const handler = withApiResponse(run);
