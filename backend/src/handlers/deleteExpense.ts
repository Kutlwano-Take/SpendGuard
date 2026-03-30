import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/dynamo.js";
import { withApiResponse } from "../lib/handler.js";
import { NotFoundError, ValidationError, json } from "../lib/response.js";
import { validateId } from "../lib/validation.js";
import { getUserId } from "../lib/auth.js";

const run = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event);

  const expenseId = event.pathParameters?.expenseId;
  if (!expenseId) {
    throw new ValidationError("Expense ID is required");
  }

  const validatedExpenseId = validateId(expenseId);
  const pk = `USER#${userId}`;
  const skPrefix = "EXPENSE#";

  const queryResult = await docClient.send(
    new QueryCommand({
      TableName: getTableName(),
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      FilterExpression: "expenseId = :expenseId",
      ExpressionAttributeValues: {
        ":pk": pk,
        ":skPrefix": skPrefix,
        ":expenseId": validatedExpenseId,
      },
      Limit: 1,
    })
  );

  const itemToDelete = queryResult.Items?.[0];
  if (!itemToDelete || typeof itemToDelete.SK !== "string") {
    throw new NotFoundError("Expense not found");
  }

  await docClient.send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: {
        PK: pk,
        SK: itemToDelete.SK,
      },
    })
  );

  return json(200, { message: "Expense deleted successfully", id: validatedExpenseId });
};

export const handler = withApiResponse(run);
