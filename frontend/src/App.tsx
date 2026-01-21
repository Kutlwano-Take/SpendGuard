import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Authenticator, ThemeProvider, createTheme } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import ProgressRing, { type CategorySegment } from "./components/ProgressRing";
import StatCard from "./components/StatCard";
import {
  createBudget,
  createExpense,
  deleteBudget,
  getBudgetSummary,
  getSettings,
  listExpenses,
  sendOverspendingAlert,
  sendWeeklySummary,
  updateSettings,
} from "./features/api";
import { budgets as sampleBudgets, expenses as sampleExpenses } from "./features/sampleData";
import type { Budget, Expense } from "./features/types";

const theme = createTheme({
  name: "spendguard",
  tokens: {
    colors: {
      background: {
        primary: { value: "#0d0f13" },
        secondary: { value: "#12151c" },
      },
      font: {
        primary: { value: "#e6e7ea" },
        secondary: { value: "#9aa0aa" },
      },
      brand: {
        primary: { value: "#f4d06f" },
        secondary: { value: "#d1a954" },
      },
    },
    radii: {
      medium: { value: "16px" },
      large: { value: "20px" },
    },
  },
});

const App = () => {
  const [budgetData, setBudgetData] = useState<Budget[]>(sampleBudgets);
  const [expenseData, setExpenseData] = useState<Expense[]>(sampleExpenses);
  const [apiError, setApiError] = useState<string | null>(null);
  const [view, setView] = useState<"dashboard" | "insights" | "budgets" | "settings">("dashboard");
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    category: "Groceries",
    date: "",
    notes: "",
  });
  const [expenseStatus, setExpenseStatus] = useState<string | null>(null);
  const [budgetForm, setBudgetForm] = useState({
    category: "",
    limit: "",
    period: "monthly",
  });
  const [budgetStatus, setBudgetStatus] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    alertsEnabled: true,
    weeklySummary: true,
    currency: "ZAR",
    email: "",
  });
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [quickAddHighlight, setQuickAddHighlight] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const quickAddRef = useRef<HTMLDivElement | null>(null);
  const expenseListRef = useRef<HTMLDivElement | null>(null);

  const formatCurrency = useMemo(() => {
    const currencyCode = settings.currency || "ZAR";
    try {
      const formatter = new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      });
      return (value: number) => formatter.format(value);
    } catch {
      const fallback = new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
        maximumFractionDigits: 0,
      });
      return (value: number) => fallback.format(value);
    }
  }, [settings.currency]);

  useEffect(() => {
    if (!import.meta.env.VITE_API_BASE_URL) return;
    Promise.all([listExpenses(), getBudgetSummary(), getSettings()])
      .then(([expenses, budgets, savedSettings]) => {
        setExpenseData(expenses);
        setBudgetData(budgets);
        if (savedSettings) {
          setSettings((prev) => ({
            alertsEnabled:
              typeof savedSettings.alertsEnabled === "boolean"
                ? savedSettings.alertsEnabled
                : prev.alertsEnabled,
            weeklySummary:
              typeof savedSettings.weeklySummary === "boolean"
                ? savedSettings.weeklySummary
                : prev.weeklySummary,
            currency:
              typeof savedSettings.currency === "string" ? savedSettings.currency : prev.currency,
            email:
              typeof savedSettings.email === "string" ? savedSettings.email : prev.email,
          }));
        }
      })
      .catch((err) => {
        setApiError(err instanceof Error ? err.message : "Failed to load data");
      });
  }, []);

  const handleExpenseChange = (field: keyof typeof expenseForm, value: string) => {
    setExpenseForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleExpenseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setExpenseStatus(null);
    const amount = Number(expenseForm.amount);
    if (!amount || Number.isNaN(amount)) {
      setExpenseStatus("Enter a valid amount.");
      return;
    }
    try {
      await createExpense({
        amount,
        category: expenseForm.category,
        date: expenseForm.date || undefined,
        notes: expenseForm.notes || undefined,
      });
      const refreshed = await listExpenses();
      const refreshedBudgets = await getBudgetSummary();
      setExpenseData(refreshed);
      setBudgetData(refreshedBudgets);
      setExpenseForm({ amount: "", category: expenseForm.category, date: "", notes: "" });
      setExpenseStatus("Expense saved.");

      if (settings.alertsEnabled && settings.email) {
        const relevantBudget = refreshedBudgets.find((b) => b.category === expenseForm.category);
        if (relevantBudget) {
          const categorySpent = relevantBudget.spent;
          if (categorySpent > relevantBudget.limit) {
            try {
              await sendOverspendingAlert({
                category: expenseForm.category,
                spent: categorySpent,
                limit: relevantBudget.limit,
              });
            } catch (alertError) {
              console.error("Failed to send alert:", alertError);
            }
          }
        }
      }
    } catch (submitError) {
      setExpenseStatus(
        submitError instanceof Error ? submitError.message : "Failed to save expense"
      );
    }
  };

  const handleBudgetChange = (field: keyof typeof budgetForm, value: string) => {
    setBudgetForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDeleteBudget = async (budgetId: string, budgetCategory: string) => {
    const ok = window.confirm(`Delete budget for "${budgetCategory}"? This cannot be undone.`);
    if (!ok) return;
    setBudgetStatus(null);
    try {
      await deleteBudget(budgetId);
      const refreshed = await getBudgetSummary();
      setBudgetData(refreshed);
      setBudgetStatus("Budget deleted.");
    } catch (err) {
      setBudgetStatus(err instanceof Error ? err.message : "Failed to delete budget");
    }
  };

  const handleBudgetSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBudgetStatus(null);
    const limit = Number(budgetForm.limit);
    if (!budgetForm.category || !limit || Number.isNaN(limit)) {
      setBudgetStatus("Provide a category and valid limit.");
      return;
    }
    createBudget({
      category: budgetForm.category,
      limit,
      period: budgetForm.period as Budget["period"],
    })
      .then(() => getBudgetSummary())
      .then((budgets) => {
        setBudgetData(budgets);
        setBudgetForm({ category: "", limit: "", period: budgetForm.period });
        setBudgetStatus("Budget saved.");
      })
      .catch((err) => {
        setBudgetStatus(err instanceof Error ? err.message : "Failed to save budget");
      });
  };

  const getBudgetStatus = (spent: number, limit: number): "safe" | "warn" | "alert" | "overspent" => {
    if (!limit || Number.isNaN(limit) || limit <= 0) return "safe";
    const percentage = (spent / limit) * 100;
    if (percentage > 100) return "overspent";
    if (percentage <= 50) return "safe";
    if (percentage <= 80) return "warn";
    return "alert";
  };

  const getBudgetPercentage = (spent: number, limit: number): number => {
    if (!limit || Number.isNaN(limit) || limit <= 0) return 0;
    return Math.round((spent / limit) * 100);
  };

  const toDateOnly = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  };

  const isInCurrentMonth = (dateValue: unknown): boolean => {
    const dateOnly = toDateOnly(dateValue);
    if (!dateOnly) return false;
    const monthPrefix = new Date().toISOString().slice(0, 7);
    return dateOnly.startsWith(monthPrefix);
  };

  const computedBudgets = useMemo(() => budgetData, [budgetData]);

  const budgetedSpent = useMemo(
    () => budgetData.reduce((sum, budget) => sum + (budget.spent ?? 0), 0),
    [budgetData]
  );

  const unbudgetedSpent = useMemo(() => {
    const budgetedCategories = new Set(budgetData.map((b) => b.category));
    return expenseData
      .filter((e) => !budgetedCategories.has(e.category) && isInCurrentMonth(e.date))
      .reduce((sum, item) => sum + item.amount, 0);
  }, [expenseData, budgetData]);

  const averageDailySpend = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - 29);
    const start = startDate.toISOString().slice(0, 10);
    const end = endDate.toISOString().slice(0, 10);
    const total = expenseData
      .filter((expense) => {
        const dateOnly = toDateOnly(expense.date);
        if (!dateOnly) return false;
        return dateOnly >= start && dateOnly <= end;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
    return total / 30;
  }, [expenseData]);

  const totalBudget = budgetData.reduce((sum: number, item: Budget) => sum + item.limit, 0);
  const utilization = totalBudget > 0 ? budgetedSpent / totalBudget : 0;

  const categorySegments = useMemo(() => {
    const totals = new Map<string, number>();
    for (const expense of expenseData) {
      if (!isInCurrentMonth(expense.date)) continue;
      totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
    }
    const segments: CategorySegment[] = Array.from(totals.entries()).map(([category, amount]) => ({
      category,
      amount,
    }));
    return segments.sort((a, b) => b.amount - a.amount);
  }, [expenseData]);

  const handleQuickAddScroll = () => {
    quickAddRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setQuickAddHighlight(true);
    window.setTimeout(() => setQuickAddHighlight(false), 2000);
  };

  return (
    <ThemeProvider theme={theme}>
      <Authenticator
        className="auth-shell"
        formFields={{
          signIn: {
            username: { label: "Email", placeholder: "you@domain.com", isRequired: true },
          },
          signUp: {
            email: { label: "Email", placeholder: "you@domain.com", isRequired: true },
            password: { label: "Password" },
            confirm_password: { label: "Confirm password" },
          },
        }}
        components={{
          Header: () => (
            <div className="auth-header">
              <span className="brand-mark">SpendGuard</span>
              <span className="brand-tagline">Financial companion</span>
            </div>
          ),
          Footer: () => (
            <div className="auth-footer">
              <span>Secure sign-in powered by AWS Cognito</span>
            </div>
          ),
        }}
      >
        {({ signOut, user }) => {
          return (
            <div className="app">
              <header className="top-bar">
                <div className="header-top">
                  <div className="brand">
                    <span className="brand-mark">SpendGuard</span>
                    <span className="user-email">{user?.signInDetails?.loginId}</span>
                  </div>
                  <button
                    className="nav-toggle"
                    type="button"
                    aria-label="Toggle navigation"
                    aria-expanded={isNavOpen}
                    onClick={() => setIsNavOpen((prev) => !prev)}
                  >
                    ☰
                  </button>
                </div>
                <div className="header-bottom">
                  <span className="brand-tagline">Financial companion</span>
                  <button className="ghost-button sign-out-btn" onClick={signOut}>
                    Sign out
                  </button>
                </div>
                <nav className="nav">
                  {(["dashboard", "insights", "budgets", "settings"] as const).map((tab) => (
                    <button
                      key={tab}
                      className={`nav-button ${view === tab ? "active" : ""}`}
                      onClick={() => setView(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </nav>
              </header>

              {isNavOpen && (
                <div className="mobile-nav">
                  {(["dashboard", "insights", "budgets", "settings"] as const).map((tab) => (
                    <button
                      key={tab}
                      className={`nav-button ${view === tab ? "active" : ""}`}
                      onClick={() => {
                        setView(tab);
                        setIsNavOpen(false);
                      }}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              )}

              {view === "dashboard" && (
                <>
                  <section className="hero">
                    <div>
                      <p className="eyebrow">Your Financial Snapshot</p>
                      <h1>Stay ahead of your spending with elegant, real-time guidance.</h1>
                      <p className="hero-subtext">
                        AI insights, receipt OCR, and proactive alerts keep you in control without the hassle.
                      </p>
                      <button className="primary-button" onClick={handleQuickAddScroll}>
                        Add expense
                      </button>
                    </div>
                    <div className="hero-card">
                      {categorySegments.length > 0 ? (
                        <ProgressRing
                          categories={categorySegments}
                          size={120}
                          stroke={10}
                          showLegend={true}
                          animateOnMount={true}
                        />
                      ) : (
                        <>
                          <ProgressRing value={utilization} size={96} />
                          <div>
                            <p className="stat-title">Budgeted spending</p>
                            <p className="stat-value">{Math.round(utilization * 100)}%</p>
                            <p className="stat-subtitle">
                              {formatCurrency(budgetedSpent)} of {formatCurrency(totalBudget)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </section>

                  <section className="stats-grid">
                    <StatCard
                      title="Budgeted spending"
                      value={formatCurrency(budgetedSpent)}
                      subtitle="Against budget limits"
                    />
                    <StatCard
                      title="Unbudgeted spending"
                      value={formatCurrency(unbudgetedSpent)}
                      subtitle="No budget assigned"
                    />
                    <StatCard
                      title="Upcoming alerts"
                      value={settings.alertsEnabled ? "Enabled" : "Disabled"}
                      subtitle="Alerts are based on your budgets"
                    />
                  </section>

                  <section className="content-grid">
                    <div className="card budgets-card">
                      <div className="section-header">
                        <h2>Budgets</h2>
                        <button className="ghost-button" onClick={() => setView("budgets")}>
                          Manage budgets
                        </button>
                      </div>
                      <div className="budgets-list">
                        {computedBudgets.length === 0 ? (
                          <p className="stat-subtitle">No budgets yet — add one to get insights.</p>
                        ) : (
                          computedBudgets.slice(0, 3).map((budget: Budget) => {
                            const percentage = getBudgetPercentage(budget.spent, budget.limit);
                            const statusClass = getBudgetStatus(budget.spent, budget.limit);
                            return (
                              <div className="budget-row" key={budget.id}>
                                <div className="budget-info">
                                  <p className="budget-title">{budget.category}</p>
                                  <p className="budget-subtitle">
                                    {formatCurrency(budget.spent)} of {formatCurrency(budget.limit)} · {budget.period}
                                  </p>
                                </div>
                                <div className="budget-controls">
                                  <div className={`budget-pill ${statusClass}`}>
                                    {percentage}%
                                  </div>
                                  <button
                                    type="button"
                                    className="icon-button delete-btn"
                                    onClick={() => handleDeleteBudget(budget.id, budget.category)}
                                    title="Delete budget"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div
                      className={`card quick-add ${quickAddHighlight ? "highlight" : ""}`}
                      ref={quickAddRef}
                    >
                      <div className="section-header">
                        <h2>Quick add</h2>
                        <span className="pill">OCR ready</span>
                      </div>
                      <form className="form-grid" onSubmit={handleExpenseSubmit}>
                        <label>
                          Amount
                          <input
                            type="number"
                            placeholder="0.00"
                            value={expenseForm.amount}
                            onChange={(event) => handleExpenseChange("amount", event.target.value)}
                          />
                        </label>
                        <label>
                          Category
                          <select
                            value={expenseForm.category}
                            onChange={(event) => handleExpenseChange("category", event.target.value)}
                          >
                            {[
                              "Groceries",
                              "Dining",
                              "Transport",
                              "Rent",
                              "Utilities",
                              "Internet",
                              "Phone",
                              "Insurance",
                              "Healthcare",
                              "Fitness",
                              "Entertainment",
                              "Shopping",
                              "Education",
                              "Childcare",
                              "Travel",
                              "Subscriptions",
                              "Gifts",
                              "Pets",
                              "Household",
                              "Savings",
                              "Other",
                            ].map((cat) => (
                              <option key={cat}>{cat}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Date
                          <input
                            type="date"
                            value={expenseForm.date}
                            onChange={(event) => handleExpenseChange("date", event.target.value)}
                          />
                        </label>
                        <label>
                          Notes
                          <input
                            type="text"
                            placeholder="Add a note"
                            value={expenseForm.notes}
                            onChange={(event) => handleExpenseChange("notes", event.target.value)}
                          />
                        </label>
                        <button type="submit" className="primary-button">
                          Save expense
                        </button>
                        {expenseStatus && <p className="stat-subtitle">{expenseStatus}</p>}
                      </form>
                    </div>
                  </section>

                  <section className="card recent-activity">
                    <div className="section-header">
                      <h2>Recent activity</h2>
                      <button
                        className="ghost-button"
                        onClick={() => {
                          setShowAllExpenses(!showAllExpenses);
                          if (!showAllExpenses && expenseListRef.current) {
                            setTimeout(() => {
                              expenseListRef.current?.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          }
                        }}
                      >
                        {showAllExpenses ? "Show less" : "View all"}
                      </button>
                    </div>
                    {apiError && <p className="stat-subtitle">API error: {apiError}</p>}
                    <div className="expense-list" ref={expenseListRef}>
                      {expenseData.length === 0 ? (
                        <p className="stat-subtitle">No expenses yet — add your first entry.</p>
                      ) : (
                        (showAllExpenses ? expenseData : expenseData.slice(0, 1)).map(
                          (expense: Expense) => (
                            <div className="expense-row" key={expense.id}>
                              <div>
                                <p className="expense-title">{expense.category}</p>
                                <p className="expense-subtitle">{expense.note ?? expense.notes}</p>
                              </div>
                              <div className="expense-meta">
                                <span>{expense.date}</span>
                                <strong>{formatCurrency(expense.amount)}</strong>
                              </div>
                            </div>
                          )
                        )
                      )}
                    </div>
                  </section>
                </>
              )}

              {view === "insights" && (
                <section className="card insights-view">
                  <div className="section-header">
                    <h2>Insights</h2>
                    <span className="pill">AI ready</span>
                  </div>
                  <div className="insights-grid">
                    <StatCard
                      title="Average daily spend"
                      value={formatCurrency(averageDailySpend)}
                      subtitle="Last 30 days"
                    />
                    <StatCard
                      title="Top category"
                      value={computedBudgets[0]?.category ?? "Not set"}
                      subtitle="Based on your budgets"
                    />
                    <StatCard
                      title="Savings tip"
                      value="Reduce dining by 10%"
                      subtitle="Projected monthly savings"
                    />
                  </div>
                </section>
              )}

              {view === "budgets" && (
                <section className="card budgets-view">
                  <div className="section-header">
                    <h2>Budgets</h2>
                    <span className="pill">Monthly / Weekly</span>
                  </div>
                  <form className="form-grid" onSubmit={handleBudgetSubmit}>
                    <label>
                      Category
                      <input
                        type="text"
                        placeholder="e.g. Groceries"
                        value={budgetForm.category}
                        onChange={(event) => handleBudgetChange("category", event.target.value)}
                      />
                    </label>
                    <label>
                      Limit
                      <input
                        type="number"
                        placeholder="0.00"
                        value={budgetForm.limit}
                        onChange={(event) => handleBudgetChange("limit", event.target.value)}
                      />
                    </label>
                    <label>
                      Period
                      <select
                        value={budgetForm.period}
                        onChange={(event) => handleBudgetChange("period", event.target.value)}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </label>
                    <button type="submit" className="primary-button">
                      Save budget
                    </button>
                    {budgetStatus && <p className="stat-subtitle">{budgetStatus}</p>}
                  </form>
                  <div className="budgets-list">
                    {computedBudgets.length === 0 ? (
                      <p className="stat-subtitle">No budgets yet — add one to get insights.</p>
                    ) : (
                      computedBudgets.map((budget) => {
                        const percentage = getBudgetPercentage(budget.spent, budget.limit);
                        const statusClass = getBudgetStatus(budget.spent, budget.limit);
                        return (
                          <div className="budget-row" key={budget.id}>
                            <div className="budget-info">
                              <p className="budget-title">{budget.category}</p>
                              <p className="budget-subtitle">
                                {formatCurrency(budget.spent)} of {formatCurrency(budget.limit)} · {budget.period}
                              </p>
                            </div>
                            <div className="budget-controls">
                              <div className={`budget-pill ${statusClass}`}>
                                {percentage}%
                              </div>
                              <button
                                type="button"
                                className="icon-button delete-btn"
                                onClick={() => handleDeleteBudget(budget.id, budget.category)}
                                title="Delete budget"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              )}

              {view === "settings" && (
                <section className="card settings-view">
                  <div className="section-header">
                    <h2>Settings</h2>
                    <span className="pill">Personalize</span>
                  </div>
                  <div className="settings-grid">
                    <label>
                      Email Address (for alerts & summaries)
                      <input
                        type="email"
                        placeholder="your.email@example.com"
                        value={settings.email}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, email: e.target.value.trim() }))
                        }
                      />
                    </label>

                    <label className="settings-row">
                      <span>Email alerts (overspending)</span>
                      <input
                        type="checkbox"
                        checked={settings.alertsEnabled}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, alertsEnabled: e.target.checked }))
                        }
                      />
                    </label>

                    <label className="settings-row">
                      <span>Weekly summary</span>
                      <input
                        type="checkbox"
                        checked={settings.weeklySummary}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, weeklySummary: e.target.checked }))
                        }
                      />
                    </label>

                    <label>
                      Preferred currency
                      <select
                        value={settings.currency}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, currency: e.target.value }))
                        }
                      >
                        <option value="ZAR">ZAR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </label>

                    <button
                      className="primary-button"
                      type="button"
                      onClick={async () => {
                        setSettingsStatus(null);
                        try {
                          // Basic validation
                          if (settings.email && !settings.email.includes("@")) {
                            setSettingsStatus("Please enter a valid email address.");
                            return;
                          }

                          await updateSettings({
                            alertsEnabled: settings.alertsEnabled,
                            weeklySummary: settings.weeklySummary,
                            currency: settings.currency,
                            email: settings.email || undefined,
                          });

                          setSettingsStatus("Settings saved successfully! ✓");
                        } catch (err) {
                          setSettingsStatus(
                            err instanceof Error ? err.message : "Failed to save settings"
                          );
                        }
                      }}
                    >
                      Save Settings
                    </button>

                    <button
                      className="secondary-button"
                      type="button"
                      onClick={async () => {
                        setSettingsStatus(null);
                        try {
                          await sendWeeklySummary();
                          setSettingsStatus("Weekly summary sent to your email!");
                        } catch (err) {
                          setSettingsStatus(
                            err instanceof Error ? err.message : "Failed to send summary"
                          );
                        }
                      }}
                    >
                      Send Weekly Summary Now
                    </button>

                    <button className="ghost-button" type="button" onClick={signOut}>
                      Sign out
                    </button>

                    {settingsStatus && (
                      <p
                        className={`stat-subtitle ${
                          settingsStatus.includes("success") || settingsStatus.includes("sent")
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {settingsStatus}
                      </p>
                    )}
                  </div>
                </section>
              )}

            </div>
          );
        }}
      </Authenticator>
    </ThemeProvider>
  );
};

export default App;