import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/dynamo.js";
import { json } from "../lib/response.js";

const toDateOnly = (value: string): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const isInBudgetWindow = (budgetPeriod: unknown, expenseDate: string, now: Date): boolean => {
  const dateOnly = toDateOnly(expenseDate);
  if (!dateOnly) return false;

  if (budgetPeriod === "monthly") {
    const monthPrefix = now.toISOString().slice(0, 7); // YYYY-MM
    return dateOnly.startsWith(monthPrefix);
  }

  // weekly: last 7 days inclusive
  const end = now.toISOString().slice(0, 10);
  const startDate = new Date(now);
  startDate.setUTCDate(startDate.getUTCDate() - 6);
  const start = startDate.toISOString().slice(0, 10);
  return dateOnly >= start && dateOnly <= end;
};

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

  const expenses = expensesResult.Items ?? [];
  const now = new Date();

  const summary = (budgetsResult.Items ?? []).map((budget: Record<string, unknown>) => {
    const category = budget.category as string | undefined;
    const period = budget.period as "weekly" | "monthly" | undefined;
    if (!category || !period) {
      return { ...budget, spent: 0 };
    }

    let spent = 0;
    for (const expense of expenses) {
      if ((expense.category as string | undefined) !== category) continue;
      const amount = expense.amount as number | undefined;
      if (typeof amount !== "number") continue;

      const expenseDate =
        (expense.date as string | undefined) ??
        (typeof expense.SK === "string" && expense.SK.startsWith("EXPENSE#")
          ? expense.SK.slice("EXPENSE#".length)
          : "");

      if (!isInBudgetWindow(period, expenseDate, now)) continue;
      spent += amount;
    }

    return {
      ...budget,
      spent,
    };
  });

  return json(200, { items: summary });
};
