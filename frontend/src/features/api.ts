import { fetchAuthSession } from "aws-amplify/auth";
import type { Budget, Expense } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

const getAuthToken = async (): Promise<string> => {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) {
    throw new Error("Auth token not available");
  }
  return token;
};

const request = async <T>(path: string): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error("API base URL not configured");
  }
  const authToken = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

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
  if (!API_BASE_URL) {
    throw new Error("API base URL not configured");
  }
  const authToken = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/budgets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Create budget failed: ${response.status}`);
  }
};

export const getUploadUrl = async (file: File): Promise<{ uploadUrl: string; key: string }> => {
  if (!API_BASE_URL) {
    throw new Error("API base URL not configured");
  }
  const authToken = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/receipts/upload-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  });
  if (!response.ok) {
    throw new Error(`Upload URL request failed: ${response.status}`);
  }
  return (await response.json()) as { uploadUrl: string; key: string };
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
  if (!API_BASE_URL) {
    throw new Error("API base URL not configured");
  }
  const authToken = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/expenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Create expense failed: ${response.status}`);
  }
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
  if (!API_BASE_URL) {
    throw new Error("API base URL not configured");
  }
  const authToken = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Update settings failed: ${response.status}`);
  }
};

export const deleteBudget = async (budgetId: string): Promise<void> => {
  if (!API_BASE_URL) {
    throw new Error("API base URL not configured");
  }
  const authToken = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/budgets/${encodeURIComponent(budgetId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Delete budget failed: ${response.status}`);
  }
};

export const sendOverspendingAlert = async (payload: {
  category: string;
  spent: number;
  limit: number;
}): Promise<void> => {
  if (!API_BASE_URL) {
    throw new Error("API base URL not configured");
  }
  const authToken = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/email/overspending-alert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Send overspending alert failed: ${response.status}`);
  }
};

export const sendWeeklySummary = async (): Promise<void> => {
  if (!API_BASE_URL) {
    throw new Error("API base URL not configured");
  }
  const authToken = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/email/weekly-summary`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Send weekly summary failed: ${response.status}`);
  }
};
