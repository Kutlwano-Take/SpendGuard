import type { APIGatewayProxyResult } from "aws-lambda";

export const json = (statusCode: number, body: object): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    Vary: "Origin",
  },
  body: JSON.stringify(body),
});

export const error = (statusCode: number, message: string): APIGatewayProxyResult =>
  json(statusCode, { message });
