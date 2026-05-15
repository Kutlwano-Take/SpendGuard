import {
  toExpenseCategory,
  type ExpenseDraft,
  type ExpenseFormState,
  validateExpenseForm,
} from "./expense-validation";

export type ExpenseImportResult = {
  valid: ExpenseDraft[];
  errors: string[];
};

type CsvRecord = Record<string, string | undefined>;

const merchantColumns = ["merchant", "description", "details", "payee", "name"];

export function parseExpenseCsv(csvText: string): ExpenseImportResult {
  const rows = parseCsvRows(csvText);
  const errors: string[] = [];

  if (rows.length < 2) {
    return { valid: [], errors: ["CSV needs a header row and at least one transaction row."] };
  }

  const headers = rows[0].map((header) => normalizeHeader(header));
  const amountIndex = headers.indexOf("amount");
  const dateIndex = headers.indexOf("date");

  if (amountIndex === -1) {
    errors.push('Missing required "amount" column.');
  }

  if (dateIndex === -1) {
    errors.push('Missing required "date" column.');
  }

  if (errors.length > 0) {
    return { valid: [], errors };
  }

  const valid: ExpenseDraft[] = [];

  rows.slice(1).forEach((row, index) => {
    if (row.every((cell) => !cell.trim())) {
      return;
    }

    const record = toRecord(headers, row);
    const merchant = getMerchant(record);
    const amount = parseAmount(record.amount ?? "");
    const state: ExpenseFormState = {
      merchant,
      amount: amount === null ? record.amount ?? "" : String(Math.abs(amount)),
      category: toExpenseCategory(record.category),
      date: record.date ?? "",
      notes: record.notes ?? record.memo ?? record.description ?? "",
    };
    const validation = validateExpenseForm(state);

    if (validation.ok) {
      valid.push(validation.value);
      return;
    }

    const message = Object.values(validation.errors).join(" ");
    errors.push(`Row ${index + 2}: ${message}`);
  });

  return { valid, errors };
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows.filter((csvRow) => csvRow.some((cell) => cell.length > 0));
}

function toRecord(headers: string[], row: string[]): CsvRecord {
  return Object.fromEntries(headers.map((header, index) => [header, row[index]]));
}

function getMerchant(record: CsvRecord) {
  for (const column of merchantColumns) {
    const value = record[column]?.trim();
    if (value) {
      return value;
    }
  }

  return "Imported transaction";
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_").replace(/^transaction_/, "");
}

function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[^\d.-]/g, "");
  const amount = Number(cleaned);

  return Number.isFinite(amount) && amount !== 0 ? amount : null;
}
