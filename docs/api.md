# API Reference

All endpoints require a valid Cognito JWT. Payloads are JSON.

## OpenAPI Specification

The complete API specification is available in [OpenAPI 3.0 format](./openapi.yaml).

## Authentication

All API endpoints require authentication using AWS Cognito JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Base URLs

- **Production**: `https://your-api-id.execute-api.af-south-1.amazonaws.com/local`
- **Local Development**: `http://localhost:3001`

## Endpoints

### Expenses

#### POST /expenses
Create an expense.

**Body**
```json
{
  "amount": 120.5,
  "category": "Dining",
  "date": "2026-01-15",
  "notes": "Team lunch"
}
```

**Response**
```json
{
  "expenseId": "uuid",
  "createdAt": "2026-01-15T09:00:00.000Z"
}
```

#### GET /expenses
List expenses (optional date range).

**Query Params**
- `from`: `YYYY-MM-DD` - Start date (optional)
- `to`: `YYYY-MM-DD` - End date (optional)

**Response**
```json
{
  "items": [
    {
      "id": "uuid",
      "amount": 120.5,
      "category": "Dining",
      "date": "2026-01-15",
      "notes": "Team lunch"
    }
  ]
}
```

#### DELETE /expenses/{expenseId}
Delete an expense by ID.

**Response**
```json
{
  "message": "Expense deleted successfully",
  "id": "uuid"
}
```

### Budgets

#### POST /budgets
Create a new budget.

**Body**
```json
{
  "category": "Groceries",
  "limit": 1800,
  "period": "monthly"
}
```

**Response**
```json
{
  "budgetId": "uuid",
  "createdAt": "2026-01-15T09:00:00.000Z"
}
```

#### GET /budgets/summary
Return budget totals with computed spend.

**Response**
```json
{
  "items": [
    {
      "id": "uuid",
      "category": "Groceries",
      "limit": 1800,
      "spent": 1250.75,
      "period": "monthly"
    }
  ]
}
```

#### DELETE /budgets/{budgetId}
Delete a budget by ID.

**Response**
```json
{
  "message": "Budget deleted successfully",
  "id": "uuid"
}
```

### Settings

#### GET /settings
Fetch user settings.

**Response**
```json
{
  "item": {
    "alertsEnabled": true,
    "weeklySummary": true,
    "currency": "ZAR",
    "email": "user@example.com"
  }
}
```

#### PUT /settings
Update user settings.

**Body**
```json
{
  "alertsEnabled": true,
  "weeklySummary": false,
  "currency": "USD",
  "email": "user@example.com"
}
```

**Response**
```json
{
  "updatedAt": "2026-01-15T09:00:00.000Z"
}
```

### Receipts

#### POST /receipts/upload-url
Generate a presigned URL for uploading receipt images.

**Body**
```json
{
  "filename": "receipt.jpg",
  "contentType": "image/jpeg"
}
```

**Response**
```json
{
  "uploadUrl": "https://s3-presigned-url...",
  "key": "receipts/user-id/uuid.jpg"
}
```

### Notifications

#### POST /email/overspending-alert
Trigger an overspending alert email.

**Body**
```json
{
  "category": "Dining",
  "spent": 150.75,
  "limit": 100.00
}
```

#### POST /email/weekly-summary
Trigger a weekly summary email.

**Response**
```json
{
  "message": "Weekly summary sent successfully"
}
```

## Error Responses

All endpoints may return these common error responses:

### 400 Bad Request
```json
{
  "message": "Invalid input: amount must be a positive number"
}
```

### 401 Unauthorized
```json
{
  "message": "Unauthorized: No user ID found in token"
}
```

### 403 Forbidden
```json
{
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "message": "Expense not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error"
}
```

## Input Validation

The API validates all inputs with the following rules:

- **Amount**: Number between 0 and 10,000,000
- **Category**: String (max 50 chars), only letters, numbers, spaces, hyphens, underscores, and ampersands
- **Date**: YYYY-MM-DD format
- **Notes**: String (max 500 chars), HTML escaped
- **Currency**: 3-letter currency code (e.g., USD, ZAR)
- **Email**: Valid email format
- **Period**: Either "weekly" or "monthly"

## Rate Limiting

API endpoints are rate-limited to prevent abuse. Current limits:
- 5 requests per minute per IP address
- 100 requests per minute per authenticated user

## CORS

The API supports Cross-Origin Resource Sharing (CORS) with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent`
- `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS`
