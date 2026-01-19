# Email Functionality Setup Guide

## Overview
SpendGuard now includes two email features:
1. **Overspending Alerts** - Immediate notifications when you exceed a budget
2. **Weekly Summary** - A comprehensive spending summary delivered every week

## Frontend Setup ✅

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

### 2. AWS SES Configuration

#### A. Verify Sender Email
1. Go to AWS SES Console
2. Navigate to "Verified Identities"
3. Click "Create Identity"
4. Choose "Email address"
5. Enter your sender email (e.g., noreply@spendguard.app or your personal email)
6. Verify the email through the confirmation link

#### B. Production Access (if using sandbox mode)
- Sandbox mode limits sending to 200 emails/day
- Request production access in SES settings if needed

### 3. Environment Variables
Add to your AWS Amplify environment:

```env
SES_FROM_EMAIL=noreply@spendguard.app
AWS_REGION=us-east-1
```

### 4. API Gateway Routes
Add these routes to your `template.yaml`:

```yaml
  SendOverspendingAlertFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/sendOverspendingAlert.handler
      Runtime: nodejs18.x
      Policies:
        - Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - ses:SendEmail
              Resource: "*"
      Environment:
        Variables:
          SES_FROM_EMAIL: !Ref SESFromEmail

  SendWeeklySummaryFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/sendWeeklySummary.handler
      Runtime: nodejs18.x
      Policies:
        - Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - ses:SendEmail
              Resource: "*"
      Environment:
        Variables:
          SES_FROM_EMAIL: !Ref SESFromEmail

  OverspendingAlertRoute:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref ApiGateway
      ParentId: !GetAtt ApiGateway.RootResourceId
      PathPart: email

  OverspendingAlertMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref ApiGateway
      ResourceId: !Ref OverspendingAlertRoute
      HttpMethod: POST
      AuthorizationType: CUSTOM
      AuthorizerId: !Ref AuthorizerFunction
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${SendOverspendingAlertFunction.Arn}/invocations"
```

### 5. DynamoDB Permissions
Ensure your Lambda functions have DynamoDB access in `template.yaml`:

```yaml
Policies:
  - DynamoDBCrudPolicy:
      TableName: !Ref DynamoDBTable
```

### 6. Testing

#### Test Overspending Alert:
```bash
curl -X POST https://your-api.execute-api.region.amazonaws.com/email/overspending-alert \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "category": "Dining",
    "spent": 150,
    "limit": 100
  }'
```

#### Test Weekly Summary:
```bash
curl -X POST https://your-api.execute-api.region.amazonaws.com/email/weekly-summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## How It Works

### Overspending Alert Flow:
1. User adds an expense
2. Frontend calculates if category spending > budget limit
3. If yes AND alerts enabled, sends POST to `/email/overspending-alert`
4. Backend queries DynamoDB for user settings
5. Generates HTML email with alert details
6. Sends via AWS SES

### Weekly Summary Flow:
1. User clicks "Send Weekly Summary Now" (or scheduled via EventBridge)
2. Backend queries all expenses from past 7 days
3. Calculates totals, budgets, and alerts
4. Generates formatted HTML email
5. Sends via AWS SES

## Email Templates

### Overspending Alert
- Subject: ⚠️ Budget Alert: {Category} Budget Exceeded
- Shows: Category, Spent, Limit, Overage amount, Percentage
- Color-coded red for visibility

### Weekly Summary
- Subject: 📊 Your Weekly Spending Summary
- Shows: Total spent, budgeted vs unbudgeted, budget utilization %
- Table with budget status for each category
- Color-coded by status (safe/warn/alert/overspent)

## User Settings

Users can configure:
1. **Email Address** - Where to receive notifications
2. **Email Alerts Toggle** - Enable/disable overspending alerts
3. **Weekly Summary Toggle** - Enable/disable weekly emails
4. **Currency** - Display currency in emails

## Scheduled Weekly Summary (Optional)

To automatically send weekly summaries, use AWS EventBridge:

```yaml
WeeklySummarySchedule:
  Type: AWS::Events::Rule
  Properties:
    ScheduleExpression: "cron(0 9 ? * MON *)"  # Every Monday at 9 AM
    State: ENABLED
    Targets:
      - Arn: !GetAtt SendWeeklySummaryFunction.Arn
        RoleArn: !GetAtt EventBridgeRole.Arn
```

## Troubleshooting

### Emails not sending:
1. Check SES verification status
2. Verify email is in verified identities
3. Check Lambda CloudWatch logs
4. Ensure IAM role has `ses:SendEmail` permission

### User not receiving emails:
1. Check user's email address in Settings
2. Verify email alerts/summary toggles are enabled
3. Check spam folder
4. Verify user email is in SES verified identities

### Template issues:
- HTML templates are in `src/lib/email.ts`
- Text versions automatically generated
- Both included in sent emails
