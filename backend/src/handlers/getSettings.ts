import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/dynamo.js";
import { json } from "../lib/response.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId =
    (event.requestContext.authorizer?.claims?.sub as string | undefined) ??
    (event.requestContext.authorizer?.jwt?.claims?.sub as string | undefined);
  if (!userId) {
    return json(401, { message: "Unauthorized" });
  }

  const pk = `USER#${userId}`;
  const sk = "SETTINGS";

  const result = await docClient.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { PK: pk, SK: sk },
    })
  );

  return json(200, { item: result.Item ?? null });
};
