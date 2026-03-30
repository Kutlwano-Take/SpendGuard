# Incident Response Runbook

## SES Bounce / Complaint Spike

**Symptoms:** `AWS/SES Bounce` or `Complaint` metric on the CloudWatch Dashboard spikes.

**Response:**

1. Immediately identify the affected `to:` addresses from SES bounce notifications (SNS topic configured in `email-setup.md`)
2. Remove affected addresses from the user `email` field in DynamoDB — use the AWS console or:
   ```bash
   aws dynamodb update-item \
     --table-name <TableName> \
     --key '{"PK":{"S":"USER#<userId>"},"SK":{"S":"SETTINGS"}}' \
     --update-expression "REMOVE email"
   ```
3. If complaint rate exceeds 0.1%, AWS may pause sending. Check SES console → Account dashboard → Sending statistics
4. File an AWS support case if sending is paused

## Lambda Error Rate Alarm Firing

**Symptoms:** `SpendGuard-Lambda-Errors` or function-specific alarm triggers SNS notification.

**Response:**

1. Open CloudWatch → Log groups → `/aws/lambda/<FunctionName>` → filter for `ERROR`
2. Identify the error type: auth failure (401 → expected), DynamoDB timeout, SES failure, Bedrock failure
3. For transient errors: monitor for self-recovery — Lambda retries are not configured for API-triggered handlers
4. For DynamoDB throttling: check `DynamoDBThrottleAlarm` and consider enabling auto-scaling or increasing capacity
5. For Bedrock failures in `GetInsights`: the handler has a graceful fallback — non-critical, log and monitor

## DynamoDB Data Recovery

**Scenarios and actions:**

- **Accidental item deletion:** Use AWS console → DynamoDB → Tables → `<TableName>` → Backups → Restore to point in time. Select a time before the deletion.
- **Table corruption:** Same PITR restore process. A new table is created — update the `TABLE_NAME` environment variable on all Lambda functions to point to the restored table.

## Cognito User Recovery

- **User locked out:** AWS console → Cognito → User pools → `<UserPoolId>` → Users → find user → Reset password (sends email)
- **User account deletion request:** Delete user from Cognito AND delete all DynamoDB items with `PK = USER#<userId>` using a scan + batch delete script
- **Bulk user import:** Use the Cognito user import feature with a CSV — see AWS docs

## API Gateway Under Attack / Abuse

**Symptoms:** `ApiGateway4xxAlarm` firing at high volume, possible cost spike.

**Response:**

1. Check CloudWatch Logs for the API stage — identify source IPs or request patterns
2. Add a WAF IP block rule (production only — WAF is already attached):
   ```bash
   # Add IP to WAF IP set then associate rule — use AWS console for fastest response
   ```
3. If rate limiting is insufficient, lower `ThrottlingRateLimit` in `template.yaml` → `MethodSettings` and redeploy
4. For sustained DDoS, escalate to AWS Shield

## Weekly Summary Not Sending

**Diagnosis:**

1. Check EventBridge rule is enabled: `aws events list-rules --name-prefix SpendGuardWeeklySummary`
2. Check Lambda execution: CloudWatch Logs → `/aws/lambda/SendWeeklySummaryFunction` → look for Monday 08:00 UTC invocations
3. Check SES sending quota is not exhausted: SES console → Account dashboard

**Common causes:**

- `SESFromEmail` is not verified in SES → verify the address and redeploy with the correct parameter
- `weeklySummary=false` for all users → expected behavior, no emails sent
- EventBridge rule disabled (`Enabled: false`) — only enabled when deployed with `Environment=production`
