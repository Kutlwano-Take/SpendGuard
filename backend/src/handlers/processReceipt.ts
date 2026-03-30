import type { EventBridgeEvent, S3Event } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { docClient, getTableName } from "../lib/dynamo.js";
import { TextractClient, AnalyzeExpenseCommand } from "@aws-sdk/client-textract";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const textractClient = new TextractClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });

type ReceiptRecord = {
  bucket: string;
  key: string;
};

type S3ObjectCreatedDetail = {
  bucket?: { name?: string };
  object?: { key?: string };
};

const decodeS3Key = (rawKey: string): string =>
  decodeURIComponent(rawKey.replace(/\+/g, "%20"));

const getReceiptRecords = (
  event: S3Event | EventBridgeEvent<"Object Created", S3ObjectCreatedDetail>
): ReceiptRecord[] => {
  const s3Event = event as S3Event;
  if (Array.isArray(s3Event.Records)) {
    return s3Event.Records
      .map((record) => ({
        bucket: record.s3.bucket.name,
        key: decodeS3Key(record.s3.object.key),
      }))
      .filter((record) => Boolean(record.bucket && record.key));
  }

  const ebDetail = (event as EventBridgeEvent<"Object Created", S3ObjectCreatedDetail>).detail;
  const bucket = ebDetail?.bucket?.name;
  const key = ebDetail?.object?.key;
  if (!bucket || !key) return [];

  return [{ bucket, key: decodeS3Key(key) }];
};

const parseUserId = (key: string): string => {
  const parts = key.split("/");
  if (parts.length >= 3 && parts[0] === "receipts") {
    return parts[1];
  }
  return "unknown-user";
};

const extractTextFromReceipt = async (bucket: string, key: string): Promise<{
  amount?: number;
  category?: string;
  date?: string;
  merchant?: string;
  items?: string[];
}> => {
  try {
    // Get the image from S3
    const getObjectResponse = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    const imageBytes = await getObjectResponse.Body?.transformToByteArray();
    if (!imageBytes) {
      throw new Error('Failed to read image from S3');
    }

    // Analyze the expense with Textract
    const analyzeExpenseCommand = new AnalyzeExpenseCommand({
      Document: {
        Bytes: imageBytes,
      },
    });

    const response = await textractClient.send(analyzeExpenseCommand);
    
    // Extract information from Textract response
    const result: {
      amount?: number;
      category?: string;
      date?: string;
      merchant?: string;
      items?: string[];
    } = {};

    // Process LINE items for basic text extraction
    if (response.ExpenseDocuments) {
      for (const doc of response.ExpenseDocuments) {
        if (doc.LineItemGroups) {
          for (const lineGroup of doc.LineItemGroups) {
            if (lineGroup.LineItems) {
              for (const lineItem of lineGroup.LineItems) {
                if (lineItem.LineItemExpenseFields) {
                  for (const field of lineItem.LineItemExpenseFields) {
                    if (field.Type?.Text && field.ValueDetection?.Text) {
                      const fieldType = field.Type.Text.toLowerCase();
                      const fieldValue = field.ValueDetection.Text;
                      
                      if (fieldType.includes('total') || fieldType.includes('amount')) {
                        const amount = parseFloat(fieldValue.replace(/[^0-9.]/g, ''));
                        if (!isNaN(amount)) {
                          result.amount = amount;
                        }
                      }
                      
                      if (fieldType.includes('date')) {
                        result.date = fieldValue;
                      }
                      
                      if (fieldType.includes('merchant') || fieldType.includes('vendor')) {
                        result.merchant = fieldValue;
                      }
                    }
                  }
                }
              }
            }
          }
        }

        // Extract summary fields
        if (doc.SummaryFields) {
          for (const field of doc.SummaryFields) {
            if (field.Type?.Text && field.ValueDetection?.Text) {
              const fieldType = field.Type.Text.toLowerCase();
              const fieldValue = field.ValueDetection.Text;
              
              if (fieldType.includes('total') || fieldType.includes('amount')) {
                const amount = parseFloat(fieldValue.replace(/[^0-9.]/g, ''));
                if (!isNaN(amount)) {
                  result.amount = amount;
                }
              }
              
              if (fieldType.includes('date')) {
                result.date = fieldValue;
              }
              
              if (fieldType.includes('merchant') || fieldType.includes('vendor')) {
                result.merchant = fieldValue;
              }
            }
          }
        }
      }
    }

    // Determine category based on merchant and items
    if (result.merchant) {
      const merchantLower = result.merchant.toLowerCase();
      if (merchantLower.includes('restaurant') || merchantLower.includes('cafe') || merchantLower.includes('food')) {
        result.category = 'Food';
      } else if (merchantLower.includes('grocery') || merchantLower.includes('supermarket')) {
        result.category = 'Groceries';
      } else if (merchantLower.includes('gas') || merchantLower.includes('fuel') || merchantLower.includes('petrol')) {
        result.category = 'Transport';
      } else if (merchantLower.includes('pharmacy') || merchantLower.includes('medical')) {
        result.category = 'Healthcare';
      } else {
        result.category = 'Other';
      }
    }

    return result;
  } catch (error) {
    console.error('Error processing receipt with Textract:', error);
    // Return empty result on error to allow manual entry
    return {};
  }
};

export const handler = async (
  event: S3Event | EventBridgeEvent<"Object Created", S3ObjectCreatedDetail>
): Promise<void> => {
  const tableName = getTableName();
  const records = getReceiptRecords(event);

  for (const record of records) {
    const key = record.key;
    const bucket = record.bucket;
    const userId = parseUserId(key);
    const createdAt = new Date().toISOString();
    const expenseId = randomUUID();
    const expenseDate = createdAt.split("T")[0];
    const expenseSk = `EXPENSE#${expenseDate}#${expenseId}`;

    try {
      // Extract information from receipt using Textract
      const extractedData = await extractTextFromReceipt(bucket, key);

      // Create expense with extracted data
      await docClient.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            PK: `USER#${userId}`,
            SK: expenseSk,
            GSI1PK: `USER#${userId}`,
            GSI1SK: expenseSk,
            userId,
            expenseId,
            createdAt,
            amount: extractedData.amount || 0,
            category: extractedData.category || 'Other',
            date: extractedData.date || expenseDate,
            notes: extractedData.merchant 
              ? `Receipt from ${extractedData.merchant}${extractedData.items ? ` - Items: ${extractedData.items.join(', ')}` : ''}`
              : 'Receipt processed via OCR',
            receiptKey: key,
            extractedData, // Store raw extracted data for reference
          },
        })
      );
    } catch (error) {
      console.error(`Error processing receipt ${key}:`, error);
      
      // Create a placeholder expense that user can edit manually
      await docClient.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            PK: `USER#${userId}`,
            SK: expenseSk,
            GSI1PK: `USER#${userId}`,
            GSI1SK: expenseSk,
            userId,
            expenseId,
            createdAt,
            amount: 0,
            category: 'Other',
            date: expenseDate,
            notes: 'Receipt processing failed - please edit manually',
            receiptKey: key,
            processingError: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      );
    }
  }
};
