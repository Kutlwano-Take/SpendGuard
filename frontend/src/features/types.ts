export type Budget = {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: "weekly" | "monthly";
};

export type Expense = {
  id: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
  notes?: string;
};
