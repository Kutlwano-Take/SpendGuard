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
  const userId = getUserId(event);
  if (!userId) {
    return error(401, "Unauthorized");
  }

  const budgetId = event.pathParameters?.budgetId;
  if (!budgetId) {
    return error(400, "Budget ID is required");
  }

  await docClient.send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: {
        PK: `USER#${userId}`,
        SK: `BUDGET#${budgetId}`,
      },
    })
  );

  return json(200, { message: "Budget deleted successfully", id: budgetId });
};
