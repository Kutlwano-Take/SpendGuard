import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/dynamo.js";
import { withApiResponse } from "../lib/handler.js";
import { json } from "../lib/response.js";
import { getUserId } from "../lib/auth.js";

const run = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event);
  const result = await docClient.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { PK: `USER#${userId}`, SK: "SETTINGS" },
    })
  );

  return json(200, { item: result.Item ?? null });
};

export const handler = withApiResponse(run);
