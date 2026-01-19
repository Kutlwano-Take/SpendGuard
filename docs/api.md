# API Reference

All endpoints require a valid Cognito JWT. Payloads are JSON.

## POST /expenses
Create an expense.

**Body**
```json
{
  "amount": 120.5,
  "category": "Dining",
  "date": "2026-01-15",
  "note": "Team lunch"
}
```

**Response**
```json
{
  "expenseId": "uuid",
  "createdAt": "2026-01-15T09:00:00.000Z"
}
```

## GET /expenses
List expenses (optional date range).

**Query Params**
- `from`: `YYYY-MM-DD`
- `to`: `YYYY-MM-DD`

**Response**
```json
{
  "items": []
}
```

## POST /budgets
Create or update a budget.

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

## GET /budgets/summary
Return budget totals with computed spend.

**Response**
```json
{
  "items": []
}
```

## GET /settings
Fetch user settings.

**Response**
```json
{
  "item": {
    "alertsEnabled": true,
    "weeklySummary": true,
    "currency": "ZAR"
  }
}
```

## PUT /settings
Update user settings.

**Body**
```json
{
  "alertsEnabled": true,
  "weeklySummary": false,
  "currency": "USD"
}
```
