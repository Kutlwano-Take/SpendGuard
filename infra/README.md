# Infrastructure Notes

SpendGuard is designed for a serverless AWS deployment. You can use SAM, CDK, or Serverless Framework.

## Minimum Resources
- API Gateway (REST)
- Lambda functions:
  - `createExpense`
  - `listExpenses`
  - `createBudget`
  - `getBudgetSummary`
- DynamoDB table with PK/SK and `GSI1`
- Cognito User Pool for authentication
- S3 bucket for receipts
- SNS topic for alerts
- EventBridge rules for scheduled jobs

## Environment Variables
- `TABLE_NAME` for all Lambdas
- `RECEIPTS_BUCKET` for OCR flows
- `ALERTS_TOPIC_ARN` for budget alerts

## Deployment Approach
1. Provision Cognito, DynamoDB, S3, SNS, and EventBridge.
2. Deploy Lambda handlers and API routes.
3. Configure Amplify to deploy the React app.
