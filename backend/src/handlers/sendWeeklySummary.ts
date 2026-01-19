import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "../lib/dynamo.js";
import { json } from "../lib/response.js";
import { sendEmail, weeklySummaryTemplate } from "../lib/email.js";

interface Expense {
  amount: number;
  category: string;
  createdAt: string;
}

interface Budget {
  category: string;
  limit: number;
  spent?: number;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId =
    (event.requestContext.authorizer?.claims?.sub as string | undefined) ??
    (event.requestContext.authorizer?.jwt?.claims?.sub as string | undefined);

  if (!userId) {
    return json(401, { message: "Unauthorized" });
  }

  try {
    // Get user settings
    const settingsResult = await docClient.send(
      new GetCommand({
        TableName: getTableName(),
        Key: { PK: `USER#${userId}`, SK: "SETTINGS" },
      })
    );

    const settings = settingsResult.Item as any;
    if (!settings?.weeklySummary || !settings?.email) {
      return json(200, { message: "Weekly summary disabled or email not configured" });
    }

    // Get all expenses from the past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const expensesResult = await docClient.send(
      new QueryCommand({
        TableName: getTableName(),
        KeyConditionExpression: "PK = :pk AND SK BEGINS_WITH :sk",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":sk": "EXPENSE#",
        },
      })
    );

    const expenses = (expensesResult.Items || []) as Expense[];
    const weeklyExpenses = expenses.filter((e) => new Date(e.createdAt) >= sevenDaysAgo);

    // Get all budgets
    const budgetsResult = await docClient.send(
      new QueryCommand({
        TableName: getTableName(),
        KeyConditionExpression: "PK = :pk AND SK BEGINS_WITH :sk",
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
      settings.email,
      totalSpent,
      totalBudget,
      budgetedSpent,
      unbudgetedSpent,
      budgetAlerts
    );

    await sendEmail({
      to: settings.email,
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
