import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/dynamo.js";
import { withApiResponse } from "../lib/handler.js";
import { json } from "../lib/response.js";
import { getUserId } from "../lib/auth.js";

const run = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event);

  const from = event.queryStringParameters?.from;
  const to = event.queryStringParameters?.to;
  const pk = `USER#${userId}`;

  const useRange = Boolean(from && to);
  const command = new QueryCommand({
    TableName: getTableName(),
    IndexName: useRange ? "GSI1" : undefined,
    KeyConditionExpression: useRange
      ? "GSI1PK = :pk AND GSI1SK BETWEEN :from AND :to"
      : "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: useRange
      ? {
          ":pk": pk,
          ":from": `EXPENSE#${from}`,
          ":to": `EXPENSE#${to}\uffff`,
        }
      : {
          ":pk": pk,
          ":prefix": "EXPENSE#",
        },
    ScanIndexForward: false,
  });

  const result = await docClient.send(command);
  return json(200, { items: result.Items ?? [] });
};

export const handler = withApiResponse(run);
