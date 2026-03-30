import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/dynamo.js";
import { withApiResponse } from "../lib/handler.js";
import { ValidationError, json } from "../lib/response.js";
import { validateId } from "../lib/validation.js";
import { getUserId } from "../lib/auth.js";

const run = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event);
  const budgetId = event.pathParameters?.budgetId;
  if (!budgetId) {
    throw new ValidationError("Budget ID is required");
  }

  const validatedBudgetId = validateId(budgetId);

  await docClient.send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: {
        PK: `USER#${userId}`,
        SK: `BUDGET#${validatedBudgetId}`,
      },
    })
  );

  return json(200, { message: "Budget deleted successfully", id: validatedBudgetId });
};

export const handler = withApiResponse(run);
