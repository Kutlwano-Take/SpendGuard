import { requestWithAuth } from "./api";

export interface InsightsResponse {
  insights: {
    summary: string;
    recommendations: string[];
    budgetAdvice: string;
    trends: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
  };
  data: {
    totalSpending: number;
    spendingByCategory: Record<string, number>;
    budgetStatus: Array<{
      category: string;
      limit: number;
      spent: number;
      percentage: number;
    }>;
    period: {
      from: string;
      to: string;
    };
  };
}

export async function getInsights(): Promise<InsightsResponse> {
  return requestWithAuth<InsightsResponse>("/insights", {
    method: "GET",
  });
}
