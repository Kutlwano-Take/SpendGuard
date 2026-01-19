import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
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

  const [budgetsResult, expensesResult] = await Promise.all([
    docClient.send(
      new QueryCommand({
        TableName: getTableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": pk,
          ":prefix": "BUDGET#",
        },
      })
    ),
    docClient.send(
      new QueryCommand({
        TableName: getTableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": pk,
          ":prefix": "EXPENSE#",
        },
      })
    ),
  ]);

  const spentByCategory = new Map<string, number>();
  for (const expense of expensesResult.Items ?? []) {
    const category = expense.category as string | undefined;
    const amount = expense.amount as number | undefined;
    if (!category || !amount) continue;
    spentByCategory.set(category, (spentByCategory.get(category) ?? 0) + amount);
  }

  const summary = (budgetsResult.Items ?? []).map((budget: Record<string, unknown>) => ({
    ...budget,
    spent: spentByCategory.get(budget.category as string) ?? 0,
  }));

  return json(200, { items: summary });
};
