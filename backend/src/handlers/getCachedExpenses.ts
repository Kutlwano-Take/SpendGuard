import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { docClient, getTableName } from "../lib/dynamo.js";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getUserId } from "../lib/auth.js";
import { expenseCache } from "../lib/cache.js";
import { json } from "../lib/response.js";
import { withApiResponse } from "../lib/handler.js";

const run = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event);
  const { from, to } = event.queryStringParameters || {};
  const cacheKey = `expenses:${userId}:${from ?? "all"}:${to ?? "all"}`;

  const cached = expenseCache.get(cacheKey);
  if (cached) {
    const hit = json(200, cached as object, event.headers);
    return { ...hit, headers: { ...hit.headers, "X-Cache": "HIT" } };
  }

  let queryParams: any = {
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":prefix": "EXPENSE#",
    },
  };

  if (from || to) {
    const startKey = from ? `EXPENSE#${from}` : `EXPENSE#1970-01-01`;
    const endKey = to ? `EXPENSE#${to}\uffff` : "EXPENSE#9999-12-31\uffff";

    queryParams = {
      KeyConditionExpression: "PK = :pk AND SK BETWEEN :start AND :end",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":start": startKey,
        ":end": endKey,
      },
    };
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: getTableName(),
      ...queryParams,
    })
  );

  const expenses =
    result.Items?.map((item) => ({
      id: item.expenseId || item.SK?.replace("EXPENSE#", ""),
      amount: item.amount,
      category: item.category,
      date: item.date,
      notes: item.notes,
      receiptKey: item.receiptKey,
      createdAt: item.createdAt,
    })) || [];

  const response = { items: expenses };

  expenseCache.set(cacheKey, response);

  const miss = json(200, response, event.headers);
  return { ...miss, headers: { ...miss.headers, "X-Cache": "MISS" } };
};

export const handler = withApiResponse(run);
