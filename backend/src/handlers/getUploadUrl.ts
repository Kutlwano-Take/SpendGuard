import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { error, json } from "../lib/response.js";

type UploadRequest = {
  filename: string;
  contentType?: string;
};

const getUserId = (event: APIGatewayProxyEvent): string | null => {
  return (
    (event.requestContext.authorizer?.claims?.sub as string | undefined) ??
    (event.requestContext.authorizer?.jwt?.claims?.sub as string | undefined) ??
    null
  );
};

const parseBody = (event: APIGatewayProxyEvent): UploadRequest | null => {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body) as UploadRequest;
  } catch {
    return null;
  }
};

const s3 = new S3Client({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const body = parseBody(event);
  if (!body?.filename) {
    return error(400, "filename is required");
  }

  const bucket = process.env.RECEIPTS_BUCKET;
  if (!bucket) {
    return error(500, "RECEIPTS_BUCKET is not configured");
  }

  const userId = getUserId(event);
  if (!userId) {
    return error(401, "Unauthorized");
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = body.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `receipts/${userId}/${timestamp}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: body.contentType ?? "application/octet-stream",
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return json(200, { uploadUrl, key });
};
