import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { json, ValidationError } from "../lib/response.js";
import { getUserId } from "../lib/auth.js";
import { withApiResponse } from "../lib/handler.js";

type UploadRequest = {
  filename: string;
  contentType?: string;
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

const run = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event);

  const body = parseBody(event);
  if (!body?.filename) {
    throw new ValidationError("filename is required");
  }

  const bucket = process.env.RECEIPTS_BUCKET;
  if (!bucket) {
    throw new Error("RECEIPTS_BUCKET is not configured");
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

export const handler = withApiResponse(run);
