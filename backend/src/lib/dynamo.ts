import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const isSamLocal = process.env.AWS_SAM_LOCAL === "true";
const endpoint = process.env.DYNAMODB_ENDPOINT ?? (isSamLocal ? "http://host.docker.internal:8000" : undefined);

const client = new DynamoDBClient({
  region: endpoint ? "local" : undefined,
  endpoint,
  credentials: endpoint
    ? { accessKeyId: "local", secretAccessKey: "local" }
    : undefined,
});

if (process.env.AWS_SAM_LOCAL === "true" || endpoint) {
  console.log("dynamo-client", { endpoint, region: endpoint ? "local" : undefined });
}

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const getTableName = () => {
  const tableName = process.env.TABLE_NAME;
  if (!tableName) {
    throw new Error("TABLE_NAME env var is required");
  }
  return tableName;
};
