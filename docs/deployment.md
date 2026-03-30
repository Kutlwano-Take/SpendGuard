# Deployment, Cleanup, and Security Guide

This guide prepares SpendGuard for production, locks down access, and deploys to AWS.

## Step 1: Cleanup (Remove Mocks)

### Frontend
- Ensure `frontend/src/features/sampleData.ts` is empty arrays.
- Ensure `VITE_API_BASE_URL` is set for production API calls (see "Local Development" below).
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

1. Configure AWS CLI: `aws configure` (or set `AWS_PROFILE`)
2. Verify the `SESFromEmail` address in AWS SES before deploying (see `email-setup.md`)
3. Build and deploy:
   ```bash
   sam build
   sam deploy --config-env prod
   ```
   `--config-env prod` uses the `[prod]` profile in `samconfig.toml`.
4. Capture outputs: `ApiUrl`, `UserPoolId`, `UserPoolClientId`, `ReceiptsBucketName`.

### Required Parameters

Set in `samconfig.toml` under `[prod.deploy.parameters]`:

| Parameter        | Value                                             |
|------------------|---------------------------------------------------|
| `Environment`    | `production`                                      |
| `StageName`      | `prod`                                            |
| `FrontendDomain` | Your CloudFront or Amplify domain (no `https://`) |
| `SESFromEmail`   | A verified SES sender email address               |

## Step 4: Deploy Frontend (Amplify)

1. Set environment variables in the Amplify console (or `.env.production`):
   - `VITE_API_BASE_URL` = `ApiUrl` output from SAM
   - `VITE_AWS_REGION` = stack region
   - `VITE_COGNITO_USER_POOL_ID` = `UserPoolId` output
   - `VITE_COGNITO_USER_POOL_CLIENT_ID` = `UserPoolClientId` output
2. Push to the connected Git branch — Amplify auto-deploys on push.
3. Or manually: `amplify publish`

## Step 5: Verify

- Sign up / sign in.
- Create an expense and confirm it appears in Recent Activity.
- Create a budget and confirm it appears in the Budgets view.
- Upload a receipt and confirm an expense entry is created automatically.
- Check CloudWatch Dashboard for any Lambda errors.

## Note on Receipt Processing

Receipt processing uses real AWS Textract triggered via an EventBridge rule on S3 Object Created events. This avoids the previous CloudFormation circular dependency between the bucket and Lambda permission resources.

## Local Development

`VITE_API_BASE_URL` is optional for local development. When omitted, the frontend defaults to `http://localhost:3001`, which is the address SAM local uses by default.

No mock tokens or auth bypass variables are needed. Running `sam local start-api` sets `AWS_SAM_LOCAL=true`, and the auth middleware falls back to `LOCAL_USER_ID` / `LOCAL_USER_EMAIL` defined in the `Globals` section of `template.yaml`.
