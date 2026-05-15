import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Car,
  Coffee,
  Loader2,
  Music,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  ShoppingBag,
  Trash2,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { AuthPanel } from "./AuthPanel";
import { useAuth } from "@/lib/auth-context";
import {
  createExpense,
  deleteExpense,
  listBudgetSummary,
  listExpenses,
  type BudgetSummaryRecord,
  type ExpenseRecord,
} from "@/lib/api";
import {
  defaultExpenseFormState,
  expenseCategories,
  validateExpenseForm,
  type ExpenseCategory,
  type ExpenseDraft,
  type ExpenseFormState,
} from "@/lib/expense-validation";

type DashboardStatus = "idle" | "loading" | "ready" | "error";

type Transaction = {
  id: string;
  merchant: string;
  category: string;
  time: string;
  amount: number;
  source: "api" | "demo";
};

export function Dashboard() {
  const auth = useAuth();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [budgets, setBudgets] = useState<BudgetSummaryRecord[]>([]);
  const [status, setStatus] = useState<DashboardStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const session = auth.session;

  const refreshData = useCallback(async () => {
    if (!session) {
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const [nextExpenses, nextBudgets] = await Promise.all([
        listExpenses(session),
        listBudgetSummary(session),
      ]);
      setExpenses(nextExpenses.sort(sortExpenseRecords));
      setBudgets(nextBudgets);
      setStatus("ready");
    } catch (refreshError) {
      setError(readError(refreshError));
      setStatus("error");
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setExpenses([]);
      setBudgets([]);
      setStatus("idle");
      setError(null);
      return;
    }

    void refreshData();
  }, [session, refreshData]);

  const transactions = useMemo<Transaction[]>(
    () =>
      expenses.map((expense) => ({
        id: expense.expenseId,
        merchant: expense.merchant,
        category: expense.category,
        time: relativeDate(expense.date, expense.createdAt),
        amount: expense.amount,
        source: expense.source,
      })),
    [expenses],
  );

  const totals = useMemo(() => {
    const monthlySpend = expenses
      .filter((expense) => isCurrentMonth(expense.date))
      .reduce((total, expense) => total + expense.amount, 0);
    const weeklySpend = expenses
      .filter((expense) => isWithinDays(expense.date, 7))
      .reduce((total, expense) => total + expense.amount, 0);
    const todaySpend = expenses
      .filter((expense) => expense.date === todayDate())
      .reduce((total, expense) => total + expense.amount, 0);
    const income = 5420;
    const saved = Math.max(0, income - monthlySpend);
    const balance = 12847.2 - monthlySpend;
    const healthScore = clamp(Math.round(96 - (monthlySpend / 5000) * 16), 45, 96);

    return {
      balance,
      healthScore,
      income,
      monthlySpend,
      saved,
      todaySpend,
      weeklySpend,
    };
  }, [expenses]);

  async function handleAddExpense(values: ExpenseDraft) {
    if (!session) {
      throw new Error("Sign in before adding an expense.");
    }

    const created = await createExpense(session, values);
    setExpenses((current) => [created, ...current.filter((expense) => expense.expenseId !== created.expenseId)].sort(sortExpenseRecords));

    try {
      setBudgets(await listBudgetSummary(session));
    } catch {
      return;
    }
  }

  async function handleDeleteTransaction(expenseId: string) {
    if (!session) {
      return;
    }

    setDeletingId(expenseId);
    setError(null);

    try {
      await deleteExpense(session, expenseId);
      setExpenses((current) => current.filter((expense) => expense.expenseId !== expenseId));
      setBudgets(await listBudgetSummary(session));
    } catch (deleteError) {
      setError(readError(deleteError));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section id="dashboard" className="relative px-4 py-28">
      <SectionHeader
        eyebrow="Dashboard"
        title={
          <>
            One glance. <span className="text-gradient-aurora">Total clarity.</span>
          </>
        }
        sub="Modular cards, depth, and motion. A workspace built for decisions, not data entry."
      />

      {!session ? (
        <div className="mx-auto mt-14 max-w-6xl">
          {auth.status === "loading" ? <DashboardLoading /> : <AuthPanel />}
        </div>
      ) : (
        <>
          <DashboardToolbar
            email={session.email}
            mode={session.mode}
            status={status}
            onRefresh={refreshData}
          />

          {error ? (
            <div className="glass mx-auto mt-5 flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-sm text-warning">
              <span>{error}</span>
              <button
                type="button"
                onClick={refreshData}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-foreground transition hover:bg-white/5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          ) : null}

          <div className="mx-auto mt-8 grid max-w-7xl gap-5 lg:grid-cols-3">
            <BalanceCard
              totals={totals}
              loading={status === "loading"}
              onAddExpense={() => setIsExpenseOpen(true)}
            />
            <BudgetRingsCard
              monthlySpend={totals.monthlySpend}
              weeklySpend={totals.weeklySpend}
              todaySpend={totals.todaySpend}
            />
            <HealthScoreCard score={totals.healthScore} />
            <TransactionsCard
              transactions={transactions}
              showAll={showAllTransactions}
              deletingId={deletingId}
              onToggleShowAll={() => setShowAllTransactions((current) => !current)}
              onDeleteTransaction={handleDeleteTransaction}
            />
            <BudgetAlertsCard budgets={budgets} />
          </div>

          <ExpenseDialog
            open={isExpenseOpen}
            onClose={() => setIsExpenseOpen(false)}
            onSave={handleAddExpense}
          />
        </>
      )}
    </section>
  );
}

function DashboardToolbar({
  email,
  mode,
  status,
  onRefresh,
}: {
  email: string;
  mode: "api" | "cognito" | "demo";
  status: DashboardStatus;
  onRefresh: () => void;
}) {
  return (
    <div className="glass mx-auto mt-10 flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm text-muted-foreground">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="truncate text-foreground">{email}</span>
        <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-xs uppercase tracking-widest">
          {mode === "demo" ? "Demo" : "API"}
        </span>
        <span>{status === "loading" ? "Syncing dashboard" : "Dashboard synced"}</span>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-foreground transition hover:bg-white/5"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="glass-strong shadow-elevated grid min-h-64 place-items-center rounded-3xl p-8">
      <div className="text-center">
        <Loader2 className="text-gold mx-auto h-8 w-8 animate-spin" />
        <div className="mt-4 font-display text-2xl">Preparing your workspace</div>
        <p className="mt-2 text-sm text-muted-foreground">Checking the current session.</p>
      </div>
    </div>
  );
}

function BalanceCard({
  totals,
  loading,
  onAddExpense,
}: {
  totals: {
    balance: number;
    income: number;
    monthlySpend: number;
    saved: number;
    weeklySpend: number;
  };
  loading: boolean;
  onAddExpense: () => void;
}) {
  return (
    <div className="glass-strong shadow-elevated group relative overflow-hidden rounded-3xl p-7 lg:col-span-2">
      <div className="bg-violet/30 absolute -right-20 -top-20 h-72 w-72 rounded-full blur-3xl transition group-hover:bg-violet/40" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Total Balance
          </div>
          <div className="font-display mt-2 text-5xl md:text-6xl">
            <span className="text-gradient-gold">{formatRand(totals.balance, 2)}</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm text-success">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
            {formatRand(totals.weeklySpend, 2)} tracked this week
          </div>
        </div>
        <button
          type="button"
          onClick={onAddExpense}
          className="glass rounded-full px-4 py-2 text-sm transition hover:bg-white/10"
          data-testid="add-expense-btn"
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add expense
          </span>
        </button>
      </div>

      <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Income", value: formatRand(totals.income), tone: "text-success" },
          { label: "Spent", value: formatRand(totals.monthlySpend), tone: "text-warning" },
          { label: "Saved", value: formatRand(totals.saved), tone: "text-azure" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div className={`font-display mt-1 text-xl ${stat.tone}`}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetRingsCard({
  monthlySpend,
  weeklySpend,
  todaySpend,
}: {
  monthlySpend: number;
  weeklySpend: number;
  todaySpend: number;
}) {
  const rings = [
    { name: "Monthly", pct: (monthlySpend / 5000) * 100, color: "oklch(0.85 0.15 85)" },
    { name: "Weekly", pct: (weeklySpend / 1200) * 100, color: "oklch(0.62 0.22 295)" },
    { name: "Daily", pct: (todaySpend / 500) * 100, color: "oklch(0.7 0.18 230)" },
  ];

  return (
    <div className="glass rounded-3xl p-6">
      <div className="text-sm font-medium">Budget Progress</div>
      <div className="mt-1 text-xs text-muted-foreground">Live across 3 horizons</div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {rings.map((ring) => {
          const circumference = 2 * Math.PI * 28;
          const chartPct = clamp(ring.pct, 0, 100);

          return (
            <div key={ring.name} className="flex flex-col items-center">
              <svg viewBox="0 0 70 70" className="-rotate-90 h-20 w-20">
                <circle
                  cx="35"
                  cy="35"
                  r="28"
                  stroke="oklch(1 0 0 / 8%)"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="35"
                  cy="35"
                  r="28"
                  stroke={ring.color}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (chartPct / 100) * circumference}
                  strokeLinecap="round"
                />
              </svg>
              <div className="-mt-12 font-display text-lg">{Math.round(ring.pct)}%</div>
              <div className="mt-8 text-xs text-muted-foreground">{ring.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HealthScoreCard({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 60;

  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl p-6">
      <div className="bg-gold/20 absolute -bottom-10 -right-10 h-48 w-48 rounded-full blur-3xl" />
      <div className="text-sm font-medium">Spending Health Score</div>
      <div className="mt-1 text-xs text-muted-foreground">Updated from recent activity</div>
      <div className="relative mt-4 grid place-items-center">
        <svg viewBox="0 0 140 140" className="-rotate-90 h-40 w-40">
          <circle cx="70" cy="70" r="60" stroke="oklch(1 0 0 / 6%)" strokeWidth="10" fill="none" />
          <circle
            cx="70"
            cy="70"
            r="60"
            stroke="url(#healthScoreGradient)"
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (score / 100) * circumference}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="healthScoreGradient" x1="0" x2="1">
              <stop offset="0%" stopColor="oklch(0.85 0.15 85)" />
              <stop offset="100%" stopColor="oklch(0.62 0.22 295)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-gradient-gold font-display text-5xl">{score}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {score > 82 ? "Excellent" : score > 70 ? "Steady" : "Needs focus"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionsCard({
  transactions,
  showAll,
  deletingId,
  onToggleShowAll,
  onDeleteTransaction,
}: {
  transactions: Transaction[];
  showAll: boolean;
  deletingId: string | null;
  onToggleShowAll: () => void;
  onDeleteTransaction: (id: string) => void;
}) {
  const visibleItems = showAll ? transactions : transactions.slice(0, 4);

  return (
    <div className="glass rounded-3xl p-6 lg:col-span-2" data-testid="expenses-list">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium">Recent Transactions</div>
          <div className="mt-1 text-xs text-muted-foreground">Synced from the SpendGuard API</div>
        </div>
        {transactions.length > 4 ? (
          <button
            type="button"
            onClick={onToggleShowAll}
            className="shrink-0 text-xs text-muted-foreground transition hover:text-foreground"
          >
            {showAll ? "Show less" : "View all"} {"->"}
          </button>
        ) : null}
      </div>

      {visibleItems.length > 0 ? (
        <div className="divide-y divide-white/5">
          {visibleItems.map((item) => {
            const Icon = getTransactionIcon(item.category);
            const isDeleting = deletingId === item.id;

            return (
              <div
                key={item.id}
                className="-mx-2 flex items-center gap-4 rounded-xl px-2 py-3 transition hover:bg-white/[0.02]"
                data-testid="expense-item"
              >
                <div className="glass grid h-10 w-10 shrink-0 place-items-center rounded-xl">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{item.merchant}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {item.category}
                    <span className="rounded-full bg-violet/15 px-1.5 py-0.5 text-[10px] uppercase text-violet">
                      {item.source}
                    </span>
                    <span>- {item.time}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="font-mono text-sm">{formatRand(-item.amount, 2)}</div>
                  <button
                    type="button"
                    onClick={() => onDeleteTransaction(item.id)}
                    aria-label={`Remove ${item.merchant}`}
                    disabled={isDeleting}
                    className="glass grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid="delete-expense-btn"
                  >
                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground">
          No expenses yet. Add one to light up the dashboard.
        </div>
      )}
    </div>
  );
}

function BudgetAlertsCard({ budgets }: { budgets: BudgetSummaryRecord[] }) {
  return (
    <div className="glass rounded-3xl p-6">
      <div className="text-sm font-medium">Budgets and Alerts</div>
      <div className="mt-1 text-xs text-muted-foreground">Proactive thresholds</div>
      <div className="mt-5 space-y-4">
        {budgets.length > 0 ? (
          budgets.slice(0, 4).map((budget) => {
            const used = budget.limit > 0 ? Math.round((budget.spent / budget.limit) * 100) : 0;
            const chartPct = clamp(used, 0, 100);
            const color = used > 85 ? "bg-warning" : used > 60 ? "bg-azure" : "bg-success";

            return (
              <div key={budget.budgetId}>
                <div className="mb-1.5 flex justify-between gap-3 text-xs">
                  <span>{budget.category}</span>
                  <span className="font-mono text-muted-foreground">
                    {used}% of {formatRand(budget.limit)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div className={`h-full ${color}`} style={{ width: `${chartPct}%` }} />
                </div>
                {used > 85 ? (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-warning">
                    <span className="bg-warning animate-pulse-ring h-1.5 w-1.5 rounded-full" />
                    Approaching limit - consider pausing
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
            No budget limits returned yet. Demo mode includes starter budgets.
          </div>
        )}
      </div>
    </div>
  );
}

function ExpenseDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (values: ExpenseDraft) => Promise<void>;
}) {
  const [formState, setFormState] = useState<ExpenseFormState>(() => defaultExpenseFormState());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateField<TField extends keyof ExpenseFormState>(field: TField, value: ExpenseFormState[TField]) {
    setFormState((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setSubmitError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateExpenseForm(formState);

    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      await onSave(validation.value);
      setFormState(defaultExpenseFormState());
      setErrors({});
      onClose();
    } catch (error) {
      setSubmitError(readError(error));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form onSubmit={handleSubmit} className="glass-strong shadow-elevated w-full max-w-lg rounded-3xl p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="glass mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted-foreground">
              <WalletCards className="h-3.5 w-3.5" />
              New transaction
            </div>
            <h3 id="expense-dialog-title" className="font-display text-3xl font-semibold">
              Add expense
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Save a spend item and the dashboard will update immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add expense"
            className="glass grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm">
            Merchant
            <span className="relative">
              <ReceiptText className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={formState.merchant}
                onChange={(event) => updateField("merchant", event.target.value)}
                placeholder="e.g. Woolworths"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-gold/70"
                autoFocus
                data-testid="expense-merchant"
              />
            </span>
            <FieldError error={errors.merchant} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              Category
              <select
                value={formState.category}
                onChange={(event) => updateField("category", event.target.value as ExpenseCategory)}
                className="w-full rounded-2xl border border-white/10 bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-gold/70"
                data-testid="expense-category"
              >
                {expenseCategories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <FieldError error={errors.category} />
            </label>

            <label className="grid gap-2 text-sm">
              Amount
              <input
                value={formState.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-gold/70"
                data-testid="expense-amount"
              />
              <FieldError error={errors.amount} />
            </label>
          </div>

          <label className="grid gap-2 text-sm">
            Date
            <input
              type="date"
              value={formState.date}
              onChange={(event) => updateField("date", event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-foreground outline-none transition focus:border-gold/70"
              data-testid="expense-date"
            />
            <FieldError error={errors.date} />
          </label>

          <label className="grid gap-2 text-sm">
            Notes
            <textarea
              value={formState.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={3}
              placeholder="Optional context"
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-gold/70"
              data-testid="expense-notes"
            />
            <FieldError error={errors.notes} />
          </label>
        </div>

        {submitError ? (
          <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            {submitError}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="glass-strong rounded-full px-5 py-3 text-sm font-medium transition hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-aurora shadow-glow-gold inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-primary-foreground transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
            data-testid="save-expense-btn"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save expense
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? <span className="text-xs text-warning">{error}</span> : null;
}

export function SectionHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: ReactNode;
  sub: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="glass inline-block rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {eyebrow}
      </div>
      <h2 className="font-display mt-5 text-4xl font-semibold leading-tight md:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-muted-foreground">{sub}</p>
    </div>
  );
}

function getTransactionIcon(category: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    Food: Coffee,
    Groceries: ShoppingBag,
    Transport: Car,
    Subscriptions: Music,
    Utilities: Zap,
    Shopping: ShoppingBag,
    Health: ReceiptText,
    Housing: WalletCards,
    Travel: Car,
    Other: ReceiptText,
  };

  return icons[category] ?? ReceiptText;
}

function formatRand(value: number, fractionDigits = 0) {
  const formatted = Math.abs(value).toLocaleString("en-ZA", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  return `${value < 0 ? "-" : ""}R${formatted}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function isCurrentMonth(dateString: string) {
  const date = parseDate(dateString);
  if (!date) {
    return false;
  }

  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function isWithinDays(dateString: string, days: number) {
  const date = parseDate(dateString);
  if (!date) {
    return false;
  }

  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - days);

  return date >= start && date <= now;
}

function parseDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function relativeDate(dateString: string, createdAt?: string) {
  const source = createdAt ? new Date(createdAt) : parseDate(dateString);
  if (!source || Number.isNaN(source.getTime())) {
    return "Recently";
  }

  const diffMs = Date.now() - source.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return dateString;
}

function sortExpenseRecords(a: ExpenseRecord, b: ExpenseRecord) {
  return `${b.date}${b.createdAt ?? ""}`.localeCompare(`${a.date}${a.createdAt ?? ""}`);
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
