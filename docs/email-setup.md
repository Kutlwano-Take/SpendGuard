# Email Functionality Setup Guide

## Overview

SpendGuard includes two email features:

1. **Overspending Alerts** — Immediate notifications when you exceed a budget
2. **Weekly Summary** — A comprehensive spending summary delivered every Monday

## Frontend Setup

The frontend is already configured with:

- Email input field in Settings
- Toggle switches for email alerts and weekly summary
- "Send Weekly Summary Now" button for testing
- Automatic overspending alert trigger when expenses are created

## Backend Setup Required

### 1. Install AWS SES SDK

```bash
cd backend
npm install @aws-sdk/client-sesv2
```

### 2. `SESFromEmail` Parameter

The `SESFromEmail` parameter in `template.yaml` controls which address emails are sent from. It must be set to a verified SES sender address before deployment.

**Steps to verify the address:**

1. Open the AWS Console and go to **SES → Verified identities**
2. Click **Create identity**
3. Choose **Email address**
4. Enter the address you want to use (e.g. `noreply@yourdomain.com`)
5. Click **Create identity** — AWS sends a confirmation email
6. Click the verification link in that email

The address is now verified and can be used as `SESFromEmail`.

Set the value in `samconfig.toml` under `[prod.deploy.parameters]`:

```toml
"SESFromEmail=noreply@yourdomain.com"
```

### 3. SES Sandbox vs Production Access

By default, new AWS accounts are in **SES sandbox mode**:

- Sandbox mode only allows sending email **to verified addresses**
- You cannot send to arbitrary user email addresses while in sandbox
- Daily sending quota is limited

To send to any recipient address (required for real users):

1. Open the AWS Console → **SES → Account dashboard**
2. Under **Production access**, click **Request production access**
3. Fill out the use-case form — describe that you are sending transactional spend alerts and weekly summaries to opted-in users
4. AWS typically approves requests within 24 hours

Until production access is granted, add each test recipient's address as a verified identity in SES.

### 4. SES Bounce and Complaint Feedback Loop

Monitoring bounces and complaints is required to maintain a healthy sender reputation. A high complaint rate (above 0.1%) will cause AWS to pause your sending.

**Configure an SNS feedback topic:**

1. Open **SES → Configuration sets → Create configuration set**
2. Name it (e.g. `spendguard-ses`)
3. Under **Event destinations**, add a destination:
   - Event types: **Bounces** and **Complaints**
   - Destination type: **SNS**
   - Create or select an SNS topic
4. Subscribe an email address or Lambda to that SNS topic to receive notifications

**Handling bounced addresses:**

- When a bounce notification arrives, remove the `email` attribute from that user's `SETTINGS` item in DynamoDB so no further emails are attempted:
  ```bash
  aws dynamodb update-item \
    --table-name <TableName> \
    --key '{"PK":{"S":"USER#<userId>"},"SK":{"S":"SETTINGS"}}' \
    --update-expression "REMOVE email"
  ```
- Do not retry sending to bounced addresses.

### 5. Environment-Specific Sender Configuration

| Environment | Recommended sender                               | Verification method  |
|-------------|--------------------------------------------------|----------------------|
| Dev         | A personal email address you control             | Email address verify |
| Prod        | A domain-based address (e.g. `noreply@yourdomain.com`) | Domain verification  |

**Domain verification** (recommended for production):

1. **SES → Verified identities → Create identity → Domain**
2. Enter your domain and add the provided CNAME/TXT records to your DNS
3. Once verified, any address at that domain can be used as sender without individual address verification

### 6. Environment Variables

Lambda functions receive `SES_FROM_EMAIL` from the SAM parameter at deploy time — you do not need to set it manually in the Lambda console. The `template.yaml` passes `!Ref SESFromEmail` to all email-sending functions.

## How It Works

### Overspending Alert Flow

1. User adds an expense
2. Frontend calculates if category spending exceeds the budget limit
3. If yes and alerts are enabled, sends `POST /email/overspending-alert`
4. Backend queries DynamoDB for user settings
5. Generates HTML email with alert details
6. Sends via AWS SES

### Weekly Summary Flow

1. EventBridge rule fires every Monday at 08:00 UTC (production only)
2. Backend queries all expenses from the past 7 days
3. Calculates totals, budgets, and alerts
4. Generates formatted HTML email
5. Sends via AWS SES

## Email Templates

### Overspending Alert

- Subject: Budget Alert: {Category} Budget Exceeded
- Shows: Category, Spent, Limit, Overage amount, Percentage over budget
- Color-coded red for visibility

### Weekly Summary

- Subject: Your Weekly Spending Summary
- Shows: Total spent, budgeted vs unbudgeted, budget utilization percentage
- Table with budget status for each category
- Color-coded by status (safe / warn / alert / overspent)

## User Settings

Users can configure in the Settings page:

1. **Email Address** — Where to receive notifications
2. **Email Alerts Toggle** — Enable/disable overspending alerts
3. **Weekly Summary Toggle** — Enable/disable weekly emails
4. **Currency** — Display currency used in emails

## Testing

### Test Overspending Alert

```bash
curl -X POST https://your-api.execute-api.region.amazonaws.com/prod/email/overspending-alert \
  -H "Authorization: Bearer YOUR_COGNITO_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category": "Dining", "spent": 150, "limit": 100}'
```

### Test Weekly Summary

```bash
curl -X POST https://your-api.execute-api.region.amazonaws.com/prod/email/weekly-summary \
  -H "Authorization: Bearer YOUR_COGNITO_ID_TOKEN"
```

## Troubleshooting

### Emails not sending

1. Check SES verification status — sender address must be verified
2. Confirm the `SESFromEmail` parameter was passed correctly at deploy time
3. Check Lambda CloudWatch logs for SES errors
4. Ensure the Lambda IAM role has `ses:SendEmail` permission

### User not receiving emails

1. Check the user's email address in Settings
2. Verify email alerts / summary toggles are enabled
3. Check spam folder
4. In sandbox mode, verify the recipient address is also verified in SES

### EventBridge schedule not firing

1. Confirm the stack was deployed with `Environment=production` — the schedule rule is only enabled in production
2. Check `aws events list-rules --name-prefix SpendGuardWeeklySummary` — expect `State: ENABLED`
3. Check CloudWatch Logs for the `SendWeeklySummaryFunction`
