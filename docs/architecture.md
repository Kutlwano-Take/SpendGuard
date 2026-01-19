# Architecture

SpendGuard uses a serverless AWS stack with a React + TypeScript frontend and Lambda-based backend. The goal is near-zero ops, automatic scaling, and premium user experience.

## High-Level Flow
- React app calls API Gateway endpoints with Cognito-authenticated JWTs.
- Lambda handlers validate input and perform business logic.
- DynamoDB stores budgets and expenses using a single-table design.
- S3 stores receipt images; Textract extracts fields for OCR.
- SNS delivers alerts; EventBridge schedules summaries and resets.

## Core AWS Services
- **Cognito**: Authentication and user identities.
- **API Gateway**: REST API for web and mobile clients.
- **Lambda**: Business logic and alerts.
- **DynamoDB**: Budgets and expenses, with GSIs for date queries.
- **S3 + Textract**: Receipt storage and OCR extraction.
- **SNS**: Budget alerts and notifications.
- **EventBridge**: Daily/weekly scheduled jobs.
- **CloudWatch + X-Ray**: Logs, metrics, and tracing.

## Security Notes
- IAM roles follow least privilege.
- Data is encrypted at rest and in transit.
- WAF can be applied on API Gateway for protection.

## Receipt OCR Stub
Receipt images upload to S3 via presigned URL. An S3 event triggers a Lambda stub that simulates Textract by creating a mock expense record for the user.
