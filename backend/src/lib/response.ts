import type { APIGatewayProxyResult } from "aws-lambda";

export const json = (statusCode: number, body: object): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

export const error = (statusCode: number, message: string): APIGatewayProxyResult =>
  json(statusCode, { message });
