# Deployment Runbook

## Pre-Deploy Checklist

Before running `sam deploy`:

- [ ] AWS CLI configured (`aws configure` or `AWS_PROFILE` set)
- [ ] SES sender email verified in target region (see `email-setup.md`)
- [ ] `FrontendDomain` parameter value confirmed (CloudFront or Amplify domain)
- [ ] `SESFromEmail` parameter value confirmed (verified SES address)
- [ ] `samconfig.toml` `[prod]` profile has correct region and stack name
- [ ] No pending uncommitted backend changes

## Deploy Backend (SAM)

### Development

```bash
sam build
sam deploy --config-env default
```

### Production

```bash
sam build
sam deploy --config-env prod
```

`--config-env prod` reads the `[prod]` profile from `samconfig.toml`, which supplies the correct stack name (`spendguard-prod`), region, and parameter overrides.

Expected outputs after deploy:

- `ApiUrl`: the API Gateway base URL to set as `VITE_API_BASE_URL`
- `UserPoolId`: Cognito User Pool ID for Amplify config
- `UserPoolClientId`: Cognito App Client ID for Amplify config
- `ReceiptsBucketName`: S3 bucket name
- `DashboardUrl`: CloudWatch Dashboard link

## Deploy Frontend (Amplify)

1. Set environment variables in Amplify console (or `.env.production`):
   - `VITE_API_BASE_URL` = `ApiUrl` output from SAM
   - `VITE_AWS_REGION` = deployment region
   - `VITE_COGNITO_USER_POOL_ID` = `UserPoolId` output
   - `VITE_COGNITO_USER_POOL_CLIENT_ID` = `UserPoolClientId` output
2. Push to the connected Git branch — Amplify auto-deploys
3. Or manually: `amplify publish`

## Post-Deploy Smoke Test

1. Open the app URL
2. Sign up for a new account (or sign in)
3. Create one expense — confirm it appears in Recent Activity
4. Create one budget — confirm it appears in the Budgets view
5. Go to Settings → Save Settings → confirm 200 response
6. Upload a small receipt image — confirm an expense entry is auto-created within ~30s
7. Check CloudWatch Dashboard for any Lambda errors

## Rollback Procedure

### CloudFormation rollback (failed deploy)

If `sam deploy` fails mid-way, CloudFormation rolls back automatically. To force rollback of a deployed stack:

```bash
aws cloudformation cancel-update-stack --stack-name spendguard-prod
```

### Lambda function rollback

If a Lambda function was updated and is causing errors:

```bash
# List versions
aws lambda list-versions-by-function --function-name <FunctionName>
# Point alias to previous version
aws lambda update-alias --function-name <FunctionName> --name live --function-version <PREV_VERSION>
```

### DynamoDB — no rollback needed

Data is preserved across CloudFormation stack updates. PITR (Point-in-Time Recovery) is enabled — use the AWS console to restore to any point within 35 days if data corruption occurs.

## Verifying the Weekly Summary Schedule

After production deploy, confirm the EventBridge rule is active:

```bash
aws events list-rules --name-prefix SpendGuardWeeklySummary
```

Expected: one rule with `State: ENABLED` and schedule `cron(0 8 ? * MON *)`.
