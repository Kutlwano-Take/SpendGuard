import type { AuthSession } from "./auth";
import type { ExpenseDraft } from "./expense-validation";

export type ExpenseRecord = {
  expenseId: string;
  merchant: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt?: string;
  receiptKey?: string;
  source: "api" | "demo";
};

export type BudgetSummaryRecord = {
  budgetId: string;
  category: string;
  limit: number;
  period: "weekly" | "monthly";
  spent: number;
};

const apiBaseUrl = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:3001").replace(/\/$/, "");

const demoExpenses: ExpenseRecord[] = [
  {
    expenseId: "demo-coffee",
    merchant: "Blue Bottle Coffee",
    category: "Food",
    amount: 64.4,
    date: "2026-05-15",
    notes: "Morning coffee",
    createdAt: new Date().toISOString(),
    source: "demo",
  },
  {
    expenseId: "demo-grocery",
    merchant: "Checkers Hyper",
    category: "Groceries",
    amount: 842.22,
    date: "2026-05-14",
    notes: "Weekly groceries",
    createdAt: new Date().toISOString(),
    source: "demo",
  },
  {
    expenseId: "demo-transport",
    merchant: "Uber Trip",
    category: "Transport",
    amount: 185.5,
    date: "2026-05-14",
    notes: "Client meeting",
    createdAt: new Date().toISOString(),
    source: "demo",
  },
];

const demoBudgets: BudgetSummaryRecord[] = [
  { budgetId: "demo-food", category: "Food", limit: 4000, period: "monthly", spent: 3680 },
  { budgetId: "demo-subscriptions", category: "Subscriptions", limit: 800, period: "monthly", spent: 512 },
  { budgetId: "demo-shopping", category: "Shopping", limit: 3000, period: "monthly", spent: 1140 },
];

export async function listExpenses(session: AuthSession): Promise<ExpenseRecord[]> {
  if (session.mode === "demo") {
    await wait(250);
    return [...demoExpenses].sort(sortExpenses);
  }

  const response = await apiFetch<{ items?: unknown[] }>(session, "/expenses");
  return (response.items ?? []).map(normalizeExpenseRecord).sort(sortExpenses);
}

export async function createExpense(session: AuthSession, input: ExpenseDraft): Promise<ExpenseRecord> {
  if (session.mode === "demo") {
    await wait(250);
    const item: ExpenseRecord = {
      expenseId: `demo-${Date.now()}`,
      ...input,
      createdAt: new Date().toISOString(),
      source: "demo",
    };
    demoExpenses.unshift(item);
    return item;
  }

  const response = await apiFetch<{ expenseId: string; createdAt?: string; item?: unknown }>(session, "/expenses", {
    method: "POST",
    body: input,
  });

  if (response.item) {
    return normalizeExpenseRecord(response.item);
  }

  return {
    expenseId: response.expenseId,
    merchant: input.merchant,
    category: input.category,
    amount: input.amount,
    date: input.date,
    notes: input.notes,
    createdAt: response.createdAt,
    source: "api",
  };
}

export async function deleteExpense(session: AuthSession, expenseId: string): Promise<void> {
  if (session.mode === "demo") {
    await wait(200);
    const index = demoExpenses.findIndex((expense) => expense.expenseId === expenseId);
    if (index >= 0) {
      demoExpenses.splice(index, 1);
    }
    return;
  }

  await apiFetch(session, `/expenses/${encodeURIComponent(expenseId)}`, { method: "DELETE" });
}

export async function listBudgetSummary(session: AuthSession): Promise<BudgetSummaryRecord[]> {
  if (session.mode === "demo") {
    await wait(200);
    return demoBudgets.map((budget) => ({
      ...budget,
      spent: budget.spent + demoExpenses.filter((expense) => expense.category === budget.category).reduce((total, expense) => total + expense.amount, 0),
    }));
  }

  const response = await apiFetch<{ items?: unknown[] }>(session, "/budgets/summary");
  return (response.items ?? []).map(normalizeBudgetSummary);
}

async function apiFetch<T = unknown>(
  session: AuthSession,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${session.idToken}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const body = (await response.json().catch(() => ({}))) as { message?: string };

  if (!response.ok) {
    throw new Error(body.message || `Request failed with status ${response.status}.`);
  }

  return body as T;
}

function normalizeExpenseRecord(value: unknown): ExpenseRecord {
  const item = value as Record<string, unknown>;
  const expenseId = readString(item.expenseId) ?? readString(item.id) ?? "unknown-expense";
  const notes = readString(item.notes);

  return {
    expenseId,
    merchant: readString(item.merchant) ?? readString(item.description) ?? notes ?? "Expense",
    category: readString(item.category) ?? "Other",
    amount: readNumber(item.amount) ?? 0,
    date: readString(item.date) ?? readDateFromSortKey(item.SK) ?? "",
    notes,
    createdAt: readString(item.createdAt),
    receiptKey: readString(item.receiptKey),
    source: "api",
  };
}

function normalizeBudgetSummary(value: unknown): BudgetSummaryRecord {
  const item = value as Record<string, unknown>;
  const period = readString(item.period) === "weekly" ? "weekly" : "monthly";

  return {
    budgetId: readString(item.budgetId) ?? readString(item.id) ?? `${readString(item.category) ?? "budget"}-${period}`,
    category: readString(item.category) ?? "Other",
    limit: readNumber(item.limit) ?? 0,
    period,
    spent: readNumber(item.spent) ?? 0,
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readDateFromSortKey(value: unknown) {
  const sortKey = readString(value);
  const match = sortKey ? /^EXPENSE#(\d{4}-\d{2}-\d{2})#/.exec(sortKey) : null;
  return match?.[1];
}

function sortExpenses(a: ExpenseRecord, b: ExpenseRecord) {
  return `${b.date}${b.createdAt ?? ""}`.localeCompare(`${a.date}${a.createdAt ?? ""}`);
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
