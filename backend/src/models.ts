export type ExpenseInput = {
  amount: number;
  category: string;
  date?: string;
  notes?: string;
};

export type ExpenseItem = ExpenseInput & {
  userId: string;
  expenseId: string;
  createdAt: string;
};

export type BudgetInput = {
  category: string;
  limit: number;
  period: "weekly" | "monthly";
};

export type BudgetItem = BudgetInput & {
  userId: string;
  budgetId: string;
  createdAt: string;
};
