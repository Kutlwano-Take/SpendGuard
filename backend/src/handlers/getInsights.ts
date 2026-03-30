import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { docClient, getTableName } from "../lib/dynamo.js";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getUserId } from "../lib/auth.js";
import { json } from "../lib/response.js";
import { withApiResponse } from "../lib/handler.js";

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const modelId = process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-3-sonnet-20240229-v1:0";

const run = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event);

  // Fetch user's expenses for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromDate = thirtyDaysAgo.toISOString().split("T")[0];

  const expensesResponse = await docClient.send(
    new QueryCommand({
      TableName: getTableName(),
      KeyConditionExpression: "PK = :pk AND SK BETWEEN :start AND :end",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":start": `EXPENSE#${fromDate}`,
        ":end": "EXPENSE#9999-12-31",
      },
    })
  );

  const expenses = expensesResponse.Items || [];

  // Fetch user's budgets
  const budgetsResponse = await docClient.send(
    new QueryCommand({
      TableName: getTableName(),
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "BUDGET#",
      },
    })
  );

  const budgets = budgetsResponse.Items || [];

  // Prepare data for AI analysis
  const totalSpending = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const spendingByCategory = expenses.reduce(
    (acc, expense) => {
      const category = expense.category || "Other";
      acc[category] = (acc[category] || 0) + (expense.amount || 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const budgetStatus = budgets.map((budget) => ({
    category: budget.category,
    limit: budget.limit,
    spent: spendingByCategory[budget.category] || 0,
    percentage:
      typeof budget.limit === "number" && budget.limit > 0
        ? Math.round(((spendingByCategory[budget.category] || 0) / budget.limit) * 100)
        : 0,
  }));

  // Generate AI insights
  const prompt = `Based on the following spending data from the last 30 days, provide personalized financial insights and recommendations:

Total Spending: $${totalSpending.toFixed(2)}
Spending by Category: ${JSON.stringify(spendingByCategory, null, 2)}
Budget Status: ${JSON.stringify(budgetStatus, null, 2)}

Please provide:
1. A summary of spending patterns
2. Top 3 areas where the user can save money
3. Budget recommendations for the next month
4. Any concerning spending trends

Format the response as JSON with the following structure:
{
  "summary": "Brief summary of spending habits",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "budgetAdvice": "Advice for next month's budget",
  "trends": "Analysis of spending trends",
  "riskLevel": "LOW|MEDIUM|HIGH"
}`;

  const insights = await generateAIInsights(prompt);

  return json(200, {
    insights,
    data: {
      totalSpending,
      spendingByCategory,
      budgetStatus,
      period: {
        from: fromDate,
        to: new Date().toISOString().split("T")[0],
      },
    },
  });
};

export const handler = withApiResponse(run);

async function generateAIInsights(prompt: string): Promise<any> {
  try {
    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const response = await bedrockClient.send(command);
    const responseBody = new TextDecoder().decode(response.body);
    const parsedResponse = JSON.parse(responseBody);

    // Extract the content from Claude's response
    const content = parsedResponse.content?.[0]?.text || "{}";

    try {
      return JSON.parse(content);
    } catch (parseError) {
      // If AI response is not valid JSON, return a structured fallback
      return {
        summary: content.substring(0, 200) + "...",
        recommendations: ["Review your spending patterns", "Set realistic budget goals", "Track expenses regularly"],
        budgetAdvice: "Consider adjusting budgets based on actual spending patterns",
        trends: "Spending patterns show areas for optimization",
        riskLevel: "MEDIUM",
      };
    }
  } catch (error) {
    console.error("Error calling Bedrock:", error);

    // Fallback insights if AI service fails
    return {
      summary: "Unable to generate AI insights at this time",
      recommendations: ["Review your spending patterns", "Set realistic budget goals", "Track expenses regularly"],
      budgetAdvice: "Consider adjusting budgets based on actual spending patterns",
      trends: "Spending patterns show areas for optimization",
      riskLevel: "MEDIUM",
    };
  }
}
