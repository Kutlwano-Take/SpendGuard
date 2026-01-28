import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/dynamo.js";
import { error, json } from "../lib/response.js";

const getUserId = (event: APIGatewayProxyEvent): string | null => {
  return (
    (event.requestContext.authorizer?.claims?.sub as string | undefined) ??
    (event.requestContext.authorizer?.jwt?.claims?.sub as string | undefined) ??
    null
  );
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event) ?? "demo";

  const expenseId = event.pathParameters?.expenseId;
  if (!expenseId) {
    return error(400, "Expense ID is required");
  }

  // We need the date to construct the SK; fetch the item first to get its SK
  const tableName = getTableName();
  const pk = `USER#${userId}`;
  const skPrefix = `EXPENSE#`;

  // Query for the expense with this expenseId under the user
  const { QueryCommand } = await import("@aws-sdk/lib-dynamodb");
  const queryResult = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      FilterExpression: "expenseId = :expenseId",
      ExpressionAttributeValues: {
        ":pk": pk,
        ":skPrefix": skPrefix,
        ":expenseId": expenseId,
      },
      Limit: 1,
    })
  );

  const itemToDelete = queryResult.Items?.[0];
  if (!itemToDelete || typeof itemToDelete.SK !== "string") {
    return error(404, "Expense not found");
  }

  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: pk,
        SK: itemToDelete.SK,
      },
    })
  );

  return json(200, { message: "Expense deleted successfully", id: expenseId });
};
