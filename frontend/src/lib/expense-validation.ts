export const expenseCategories = [
  "Food",
  "Groceries",
  "Transport",
  "Subscriptions",
  "Utilities",
  "Shopping",
  "Health",
  "Housing",
  "Travel",
  "Other",
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];

export type ExpenseDraft = {
  merchant: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string;
};

export type ExpenseFormState = {
  merchant: string;
  category: ExpenseCategory;
  amount: string;
  date: string;
  notes: string;
};

export type ExpenseValidationResult =
  | { ok: true; value: ExpenseDraft; errors: Record<string, string> }
  | { ok: false; errors: Record<string, string> };

const maxAmount = 10000000;
const categorySet = new Set<string>(expenseCategories);

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function defaultExpenseFormState(): ExpenseFormState {
  return {
    merchant: "",
    category: "Food",
    amount: "",
    date: todayDate(),
    notes: "",
  };
}

export function validateExpenseForm(state: ExpenseFormState): ExpenseValidationResult {
  const errors: Record<string, string> = {};
  const merchant = state.merchant.trim();
  const notes = state.notes.trim();
  const amount = Number(state.amount);
  const date = normalizeDate(state.date);

  if (merchant.length < 2) {
    errors.merchant = "Merchant is required.";
  } else if (merchant.length > 120) {
    errors.merchant = "Merchant must be 120 characters or fewer.";
  }

  if (!categorySet.has(state.category)) {
    errors.category = "Choose a valid category.";
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Amount must be a positive number.";
  } else if (amount > maxAmount) {
    errors.amount = "Amount is too large.";
  }

  if (!date) {
    errors.date = "Use a valid date.";
  }

  if (notes.length > 500) {
    errors.notes = "Notes must be 500 characters or fewer.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors,
    value: {
      merchant,
      category: state.category,
      amount: roundMoney(amount),
      date: date ?? todayDate(),
      notes: notes || undefined,
    },
  };
}

export function normalizeDate(value: string): string | null {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : trimmed;
  }

  const slashDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (slashDate) {
    const [, day, month, year] = slashDate;
    const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const date = new Date(`${normalized}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : normalized;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return categorySet.has(value);
}

export function toExpenseCategory(value: string | undefined): ExpenseCategory {
  if (!value) {
    return "Other";
  }

  const cleaned = value.trim();
  const directMatch = expenseCategories.find((category) => category.toLowerCase() === cleaned.toLowerCase());

  return directMatch ?? "Other";
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
