# Data Model

SpendGuard uses a DynamoDB single-table pattern.

## Primary Keys
- **Partition Key (`PK`)**: `USER#<userId>`
- **Sort Key (`SK`)**:
  - Expenses: `EXPENSE#<date>#<expenseId>`
  - Budgets: `BUDGET#<category>`

## Global Secondary Indexes
- **GSI1** for date-based expense queries:
  - `GSI1PK`: `USER#<userId>`
  - `GSI1SK`: `EXPENSE#<date>`

## Attributes
### Expense
- `amount`, `category`, `date`, `note`, `createdAt`

### Budget
- `category`, `limit`, `period`, `createdAt`

## Example Item
```json
{
  "PK": "USER#abc123",
  "SK": "EXPENSE#2026-01-15#uuid",
  "GSI1PK": "USER#abc123",
  "GSI1SK": "EXPENSE#2026-01-15",
  "amount": 120.5,
  "category": "Dining",
  "date": "2026-01-15",
  "note": "Team lunch",
  "createdAt": "2026-01-15T09:00:00.000Z"
}
```
