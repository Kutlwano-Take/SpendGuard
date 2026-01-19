import type { S3Event } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { docClient, getTableName } from "../lib/dynamo.js";

const parseUserId = (key: string): string => {
  const parts = decodeURIComponent(key).split("/");
  if (parts.length >= 3 && parts[0] === "receipts") {
    return parts[1];
  }
  return "unknown-user";
};

export const handler = async (event: S3Event): Promise<void> => {
  const tableName = getTableName();

  for (const record of event.Records) {
    const key = record.s3.object.key;
    const userId = parseUserId(key);
    const createdAt = new Date().toISOString();
    const expenseId = randomUUID();

    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: `USER#${userId}`,
          SK: `EXPENSE#${createdAt}`,
          GSI1PK: `USER#${userId}`,
          GSI1SK: `EXPENSE#${createdAt}`,
          userId,
          expenseId,
          createdAt,
          amount: 145.5,
          category: "Groceries",
          date: createdAt,
          notes: "Mock OCR: receipt processed",
          receiptKey: key,
        },
      })
    );
  }
};
