import { fetchAuthSession } from "aws-amplify/auth";
import type { Budget, Expense } from "./types";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://a1tghz4kb2.execute-api.af-south-1.amazonaws.com/local";

const getAuthTokens = async (): Promise<{ primary: string; secondary?: string }> => {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString();
  const idToken = session.tokens?.idToken?.toString();

  const primary = accessToken ?? idToken;
  const secondary = accessToken && idToken ? (primary === accessToken ? idToken : accessToken) : undefined;

  if (!primary) {
    throw new Error("Auth token not available");
  }
  return { primary, secondary };
};

const buildAuthHeaderValues = (tokens: { primary: string; secondary?: string }): string[] => {
  const rawTokens = [tokens.primary, tokens.secondary].filter(Boolean) as string[];
  const values: string[] = [];
  for (const token of rawTokens) {
    values.push(`Bearer ${token}`);
    values.push(token);
  }
  return Array.from(new Set(values));
};

const requestWithAuth = async <T>(
  path: string,
  init?: Omit<RequestInit, "headers"> & { headers?: Record<string, string> }
): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error("API base URL not configured");
  }

  // Local dev: bypass auth if VITE_API_BASE_URL is not pointing to the deployed backend
  const isLocalDev = !import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL.includes("localhost");
  if (isLocalDev) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  }

  // Deployed: attempt auth
  const tokens = await getAuthTokens();
  const authValues = buildAuthHeaderValues(tokens);

  let lastResponse: Response | null = null;

  for (const authValue of authValues) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
        Authorization: authValue,
      },
    });
    lastResponse = response;

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (response.status !== 401 && response.status !== 403) {
      break;
    }
  }

  const status = lastResponse?.status ?? 0;
  throw new Error(`Request failed: ${status}`);
};

const request = async <T>(path: string): Promise<T> => requestWithAuth<T>(path);

export const listExpenses = async (): Promise<Expense[]> => {
  const result = await request<{ items: Record<string, unknown>[] }>("/expenses");
  return (result.items ?? []).map((item, idx) => ({
    id:
      (item.expenseId as string) ??
      (typeof item.SK === "string" && item.SK.startsWith("EXPENSE#")
        ? item.SK.slice("EXPENSE#".length)
        : `expense-${idx}`),
    amount: Number(item.amount ?? 0),
    category: (item.category as string) ?? "Uncategorized",
    date:
      (item.date as string) ??
      (typeof item.SK === "string" && item.SK.startsWith("EXPENSE#")
        ? item.SK.slice("EXPENSE#".length)
        : ""),
    note: (item.note as string | undefined) ?? undefined,
    notes: (item.notes as string | undefined) ?? undefined,
  }));
};

export const getBudgetSummary = async (): Promise<Budget[]> => {
  const result = await request<{ items: Record<string, unknown>[] }>("/budgets/summary");
  return (result.items ?? []).map((item, idx) => ({
    id:
      (item.budgetId as string) ??
      (typeof item.SK === "string" && item.SK.startsWith("BUDGET#")
        ? item.SK.slice("BUDGET#".length)
        : `budget-${idx}`),
    category: (item.category as string) ?? "Uncategorized",
    limit: Number(item.limit ?? 0),
    spent: Number(item.spent ?? 0),
    period: (item.period as "weekly" | "monthly") === "weekly" ? "weekly" : "monthly",
  }));
};

export const createBudget = async (payload: {
  category: string;
  limit: number;
  period: "weekly" | "monthly";
}): Promise<void> => {
  await requestWithAuth<void>("/budgets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getUploadUrl = async (file: File): Promise<{ uploadUrl: string; key: string }> => {
  return await requestWithAuth<{ uploadUrl: string; key: string }>("/receipts/upload-url", {
    method: "POST",
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  });
};

export const uploadReceipt = async (file: File): Promise<void> => {
  if (!API_BASE_URL) {
    throw new Error("API base URL not configured");
  }
  const { uploadUrl } = await getUploadUrl(file);
  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!putResponse.ok) {
    throw new Error(`Receipt upload failed: ${putResponse.status}`);
  }
};

export const createExpense = async (payload: {
  amount: number;
  category: string;
  date?: string;
  notes?: string;
}): Promise<void> => {
  await requestWithAuth<void>("/expenses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getSettings = async (): Promise<{
  alertsEnabled?: boolean;
  weeklySummary?: boolean;
  currency?: string;
  email?: string;
} | null> => {
  const result = await request<{ item: Record<string, unknown> | null }>("/settings");
  if (!result.item) return null;
  return {
    alertsEnabled:
      typeof result.item.alertsEnabled === "boolean" ? result.item.alertsEnabled : undefined,
    weeklySummary:
      typeof result.item.weeklySummary === "boolean" ? result.item.weeklySummary : undefined,
    currency: typeof result.item.currency === "string" ? result.item.currency : undefined,
    email: typeof result.item.email === "string" ? result.item.email : undefined,
  };
};

export const updateSettings = async (payload: {
  alertsEnabled?: boolean;
  weeklySummary?: boolean;
  currency?: string;
  email?: string;
}): Promise<void> => {
  await requestWithAuth<void>("/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const deleteBudget = async (budgetId: string): Promise<void> => {
  await requestWithAuth<void>(`/budgets/${encodeURIComponent(budgetId)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const deleteExpense = async (expenseId: string): Promise<void> => {
  await requestWithAuth<void>(`/expenses/${encodeURIComponent(expenseId)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const sendOverspendingAlert = async (payload: {
  category: string;
  spent: number;
  limit: number;
}): Promise<void> => {
  await requestWithAuth<void>("/email/overspending-alert", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const sendWeeklySummary = async (): Promise<void> => {
  await requestWithAuth<void>("/email/weekly-summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
};
