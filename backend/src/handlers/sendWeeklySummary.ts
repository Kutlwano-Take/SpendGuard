import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/dynamo.js";
import { error, json } from "../lib/response.js";
import { sendEmail, weeklySummaryTemplate } from "../lib/email.js";

interface Expense {
  amount: number;
  category: string;
  createdAt: string;
  date?: string;
}

interface Budget {
  category: string;
  limit: number;
  spent?: number;
}

const getUserId = (event: APIGatewayProxyEvent): string | null => {
  return (
    (event.requestContext.authorizer?.claims?.sub as string | undefined) ??
    (event.requestContext.authorizer?.jwt?.claims?.sub as string | undefined) ??
    null
  );
};

const getUserEmailFromClaims = (event: APIGatewayProxyEvent): string | null => {
  const email =
    (event.requestContext.authorizer?.claims?.email as string | undefined) ??
    (event.requestContext.authorizer?.jwt?.claims?.email as string | undefined);
  return typeof email === "string" && email.trim() ? email.trim() : null;
};

const toDateOnly = (value: string): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event) ?? "demo";

  try {
    // Get user settings
    const settingsResult = await docClient.send(
      new GetCommand({
        TableName: getTableName(),
        Key: { PK: `USER#${userId}`, SK: "SETTINGS" },
      })
    );

    const settings = settingsResult.Item as any;
    const recipientEmail = getUserEmailFromClaims(event) ?? (settings?.email as string | undefined);
    if (!recipientEmail || typeof recipientEmail !== "string" || !recipientEmail.trim()) {
      return error(400, "User email not configured");
    }
    const manualSend = true;
    if (!manualSend && (!settings?.weeklySummary || !recipientEmail)) {
      return json(200, { message: "Weekly summary disabled or email not configured" });
    }

    // Last 7 days inclusive (UTC date-only)
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const startDate = new Date(now);
    startDate.setUTCDate(startDate.getUTCDate() - 6);
    const start = startDate.toISOString().slice(0, 10);

    const expensesResult = await docClient.send(
      new QueryCommand({
        TableName: getTableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":sk": "EXPENSE#",
        },
      })
    );

    const expenses = (expensesResult.Items || []) as Expense[];
    const weeklyExpenses = expenses.filter((e) => {
      const dateCandidate = e.date ?? e.createdAt;
      const dateOnly = toDateOnly(dateCandidate);
      if (!dateOnly) return false;
      return dateOnly >= start && dateOnly <= end;
    });

    // Get all budgets
    const budgetsResult = await docClient.send(
      new QueryCommand({
        TableName: getTableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":sk": "BUDGET#",
        },
      })
    );

    const budgets = (budgetsResult.Items || []) as Budget[];

    // Calculate spending by category
    const spentByCategory = new Map<string, number>();
    weeklyExpenses.forEach((expense) => {
      spentByCategory.set(expense.category, (spentByCategory.get(expense.category) ?? 0) + expense.amount);
    });

    // Calculate totals
    const totalSpent = weeklyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);

    // Calculate budgeted vs unbudgeted
    const budgetedCategories = new Set(budgets.map((b) => b.category));
    const budgetedSpent = weeklyExpenses
      .filter((e) => budgetedCategories.has(e.category))
      .reduce((sum, e) => sum + e.amount, 0);
    const unbudgetedSpent = totalSpent - budgetedSpent;

    // Prepare budget alerts
    const budgetAlerts = budgets
      .filter((budget) => {
        const spent = spentByCategory.get(budget.category) ?? 0;
        return spent > 0; // Only include budgets with spending
      })
      .map((budget) => {
        const spent = spentByCategory.get(budget.category) ?? 0;
        const percentage = (spent / budget.limit) * 100;
        let status = "safe";
        if (percentage > 100) status = "overspent";
        else if (percentage > 80) status = "alert";
        else if (percentage > 50) status = "warn";

        return {
          category: budget.category,
          spent,
          limit: budget.limit,
          status,
        };
      });

    // Generate and send email
    const emailTemplate = weeklySummaryTemplate(
      recipientEmail,
      totalSpent,
      totalBudget,
      budgetedSpent,
      unbudgetedSpent,
      budgetAlerts
    );

    await sendEmail({
      to: recipientEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return json(200, { message: "Weekly summary sent successfully" });
  } catch (error) {
    console.error("Error sending weekly summary:", error);
    return json(500, { message: `Error: ${error instanceof Error ? error.message : "Unknown error"}` });
  }
};
