import { useEffect, useMemo, useState, type CSSProperties } from "react";
import LoadingSpinner from "./LoadingSpinner";
import { getInsights, type InsightsResponse } from "../features/insights";

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

const riskStyles: Record<InsightsResponse["insights"]["riskLevel"], CSSProperties> = {
  LOW: {
    background: "rgba(93, 211, 158, 0.15)",
    color: "#5dd39e",
  },
  MEDIUM: {
    background: "rgba(244, 208, 111, 0.15)",
    color: "#f4d06f",
  },
  HIGH: {
    background: "rgba(240, 101, 101, 0.15)",
    color: "#f06565",
  },
};

const formatCurrency = (value: number) => currencyFormatter.format(value || 0);

const Insights = () => {
  const [payload, setPayload] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getInsights()
      .then((response) => {
        if (cancelled) return;
        setPayload(response);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load insights");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const topCategories = useMemo(() => {
    if (!payload) return [];
    return Object.entries(payload.data.spendingByCategory)
      .sort(([, left], [, right]) => right - left)
      .slice(0, 4);
  }, [payload]);

  const budgetsAtRisk = useMemo(() => {
    if (!payload) return 0;
    return payload.data.budgetStatus.filter((budget) => budget.percentage >= 80).length;
  }, [payload]);

  if (loading) {
    return (
      <section className="card">
        <div className="section-header">
          <h2>Insights</h2>
          <span className="pill">Analyzing</span>
        </div>
        <LoadingSpinner size="lg" className="insights-loading" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="card">
        <div className="section-header">
          <h2>Insights</h2>
          <span className="pill">Unavailable</span>
        </div>
        <p className="stat-subtitle">
          The insights view loaded, but the API request failed: {error}
        </p>
      </section>
    );
  }

  if (!payload) {
    return (
      <section className="card">
        <div className="section-header">
          <h2>Insights</h2>
          <span className="pill">Empty</span>
        </div>
        <p className="stat-subtitle">No insights are available yet.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h2>Insights</h2>
          <p className="stat-subtitle">
            {payload.data.period.from} to {payload.data.period.to}
          </p>
        </div>
        <span className="pill" style={riskStyles[payload.insights.riskLevel]}>
          Risk {payload.insights.riskLevel}
        </span>
      </div>

      <div className="insights-grid" style={{ marginBottom: "16px" }}>
        <div className="card">
          <p className="stat-title">Total spending</p>
          <p className="stat-value">{formatCurrency(payload.data.totalSpending)}</p>
          <p className="stat-subtitle">Last 30 days</p>
        </div>
        <div className="card">
          <p className="stat-title">Categories tracked</p>
          <p className="stat-value">{Object.keys(payload.data.spendingByCategory).length}</p>
          <p className="stat-subtitle">Across captured expenses</p>
        </div>
        <div className="card">
          <p className="stat-title">Budgets at risk</p>
          <p className="stat-value">{budgetsAtRisk}</p>
          <p className="stat-subtitle">At or above 80% used</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="card">
          <div className="section-header">
            <h3>Summary</h3>
            <span className="pill">AI</span>
          </div>
          <p className="hero-subtext" style={{ marginBottom: "0" }}>
            {payload.insights.summary}
          </p>
        </div>

        <div className="card">
          <div className="section-header">
            <h3>Top categories</h3>
            <span className="pill">Live data</span>
          </div>
          <div className="expense-list">
            {topCategories.length === 0 ? (
              <p className="stat-subtitle">No category spend detected.</p>
            ) : (
              topCategories.map(([category, amount]) => (
                <div className="expense-row" key={category}>
                  <div>
                    <p className="expense-title">{category}</p>
                    <p className="expense-subtitle">Highest spend category</p>
                  </div>
                  <div className="expense-meta">
                    <strong>{formatCurrency(amount)}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <h3>Recommendations</h3>
            <span className="pill">Next actions</span>
          </div>
          <div className="expense-list">
            {payload.insights.recommendations.map((recommendation) => (
              <div className="expense-row" key={recommendation}>
                <div>
                  <p className="expense-title">{recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <h3>Budget advice</h3>
            <span className="pill">Planning</span>
          </div>
          <p className="hero-subtext" style={{ marginBottom: "0" }}>
            {payload.insights.budgetAdvice}
          </p>
        </div>

        <div className="card">
          <div className="section-header">
            <h3>Trend watch</h3>
            <span className="pill">Signals</span>
          </div>
          <p className="hero-subtext" style={{ marginBottom: "0" }}>
            {payload.insights.trends}
          </p>
        </div>

        <div className="card">
          <div className="section-header">
            <h3>Budget status</h3>
            <span className="pill">Thresholds</span>
          </div>
          <div className="expense-list">
            {payload.data.budgetStatus.length === 0 ? (
              <p className="stat-subtitle">No budgets found for the current user.</p>
            ) : (
              payload.data.budgetStatus.map((budget) => (
                <div className="budget-row" key={budget.category}>
                  <div className="budget-info">
                    <p className="budget-title">{budget.category}</p>
                    <p className="budget-subtitle">
                      {formatCurrency(budget.spent)} of {formatCurrency(budget.limit)}
                    </p>
                  </div>
                  <div className="budget-controls">
                    <div
                      className={`budget-pill ${
                        budget.percentage > 100
                          ? "overspent"
                          : budget.percentage > 80
                          ? "alert"
                          : budget.percentage > 50
                          ? "warn"
                          : "safe"
                      }`}
                    >
                      {budget.percentage}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Insights;
