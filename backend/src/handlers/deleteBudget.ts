import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const budgetId = event.pathParameters?.budgetId;
    const tableName = process.env.TABLE_NAME || "SpendGuardTable";

    if (!budgetId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Budget ID is required" }),
      };
    }

    // Delete the budget item
    const command = new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `BUDGET#${budgetId}`,
      },
    });

    await docClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Budget deleted successfully",
        id: budgetId,
      }),
    };
  } catch (error) {
    console.error("Delete budget error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to delete budget",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
