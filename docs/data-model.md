# Data Model

SpendGuard uses a DynamoDB single-table pattern.

## Primary Keys

- **Partition Key (`PK`)**: `USER#<userId>`
- **Sort Key (`SK`)**:
  - Expenses: `EXPENSE#<date>` (e.g. `EXPENSE#2026-01-15`)
  - Budgets: `BUDGET#<category>` (e.g. `BUDGET#Dining`)
  - Settings: `SETTINGS`

> **Note:** The `expenseId` (a UUID generated at write time) is stored as a top-level attribute on the item, not embedded in the sort key. Because multiple expenses on the same date share the same SK pattern, a `PutItem` on the same `PK`/`SK` pair will overwrite the previous item. Each expense write therefore generates a new item at the key `USER#<userId>` / `EXPENSE#<date>`.

## Global Secondary Indexes

- **GSI1** for date-based expense queries:
  - `GSI1PK`: `USER#<userId>`
  - `GSI1SK`: `EXPENSE#<date>`

## Item Types

### Expense

| Attribute   | Type   | Notes                                      |
|-------------|--------|--------------------------------------------|
| `PK`        | String | `USER#<userId>`                            |
| `SK`        | String | `EXPENSE#<date>` (e.g. `EXPENSE#2026-01-15`) |
| `GSI1PK`    | String | Same as `PK`                               |
| `GSI1SK`    | String | Same as `SK`                               |
| `expenseId` | String | UUID — stored as an attribute, not in the key |
| `userId`    | String | Cognito `sub` of the owning user           |
| `amount`    | Number | Expense amount                             |
| `category`  | String | Expense category                           |
| `date`      | String | ISO date string (`YYYY-MM-DD`)             |
| `notes`     | String | Optional free-text notes (max 500 chars)   |
| `createdAt` | String | ISO 8601 timestamp                         |

### Budget

| Attribute   | Type   | Notes                        |
|-------------|--------|------------------------------|
| `PK`        | String | `USER#<userId>`              |
| `SK`        | String | `BUDGET#<category>`          |
| `category`  | String | Budget category              |
| `limit`     | Number | Spending limit               |
| `period`    | String | Budget period (e.g. monthly) |
| `createdAt` | String | ISO 8601 timestamp           |

### Settings

| Attribute       | Type    | Notes                                          |
|-----------------|---------|------------------------------------------------|
| `PK`            | String  | `USER#<userId>`                                |
| `SK`            | String  | `SETTINGS`                                     |
| `alertsEnabled` | Boolean | Whether overspending alerts are active         |
| `weeklySummary` | Boolean | Whether weekly email summaries are active      |
| `currency`      | String  | Preferred display currency (e.g. `USD`)        |
| `email`         | String  | Email address to send notifications to         |
| `updatedAt`     | String  | ISO 8601 timestamp of last settings update     |

## Example Items

### Expense item
```json
{
  "PK": "USER#abc123",
  "SK": "EXPENSE#2026-01-15",
  "GSI1PK": "USER#abc123",
  "GSI1SK": "EXPENSE#2026-01-15",
  "expenseId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "abc123",
  "amount": 120.5,
  "category": "Dining",
  "date": "2026-01-15",
  "notes": "Team lunch",
  "createdAt": "2026-01-15T09:00:00.000Z"
}
```

### Settings item
```json
{
  "PK": "USER#abc123",
  "SK": "SETTINGS",
  "alertsEnabled": true,
  "weeklySummary": true,
  "currency": "USD",
  "email": "user@example.com",
  "updatedAt": "2026-01-15T09:00:00.000Z"
}
```
