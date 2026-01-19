# Deployment, Cleanup, and Security Guide

This guide prepares SpendGuard for production, locks down access, and deploys to AWS.

## Step 1: Cleanup (Remove Mocks)
### Frontend
- Ensure `frontend/src/features/sampleData.ts` is empty arrays.
- Ensure `VITE_API_BASE_URL` and `VITE_AUTH_TOKEN` are required for API calls.
- Replace any hardcoded UI data with empty states.

### Backend
- Require `userId` from Cognito (`event.requestContext.authorizer.claims.sub`).
- Return `401` when a token is missing/invalid.
- Validate inputs (`amount` number, `category` string, `date` optional).

## Step 2: Security Hardening
- **Cognito authorizer** enabled on API Gateway routes in `template.yaml`.
- **Least privilege**: Lambdas only access needed DynamoDB/S3 resources.
- **S3** remains private; receipts use presigned URLs only.
- **No sensitive logs**: avoid logging user tokens or PII.

## Step 3: Deploy Backend (SAM)
1. Configure AWS CLI: `aws configure`
2. Build and deploy:
   ```bash
   sam build
   sam deploy --guided
   ```
3. Capture outputs: `ApiUrl`, `ReceiptsBucketName`.

## Step 4: Deploy Frontend (Amplify)
1. Install: `npm i -g @aws-amplify/cli`
2. Init: `amplify init`
3. Add auth: `amplify add auth` (attach to the Cognito pool).
4. Publish: `amplify push` then `amplify publish`
5. Configure frontend env:
   - `VITE_API_BASE_URL` = `ApiUrl`
   - `VITE_AWS_REGION` = stack region
   - `VITE_COGNITO_USER_POOL_ID` = `UserPoolId`
   - `VITE_COGNITO_USER_POOL_CLIENT_ID` = `UserPoolClientId`

## Step 5: Verify
- Sign up / sign in.
- Create an expense.
- Confirm it appears in Recent Activity.
- Upload a receipt and confirm the mock OCR expense appears.

## Note on Receipt Processing
For the first deploy we disable the S3 event trigger on `ProcessReceiptFunction` to avoid a CloudFormation circular dependency. Once the stack is live, we can re-enable the S3 trigger in a follow-up update.
