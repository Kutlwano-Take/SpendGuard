import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const sesClient = new SESv2Client({ region: process.env.AWS_REGION || "us-east-1" });

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailOptions {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text: string;
}

export const sendEmail = async (options: EmailOptions): Promise<string> => {
  const fromEmail = options.from || process.env.SES_FROM_EMAIL || "noreply@spendguard.app";

  try {
    const command = new SendEmailCommand({
      FromEmailAddress: fromEmail,
      Destination: {
        ToAddresses: [options.to],
      },
      Content: {
        Simple: {
          Subject: {
            Data: options.subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: options.html,
              Charset: "UTF-8",
            },
            Text: {
              Data: options.text,
              Charset: "UTF-8",
            },
          },
        },
      },
    });

    const result = await sesClient.send(command);
    return result.MessageId || "";
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

export const overspendingAlertTemplate = (
  category: string,
  spent: number,
  limit: number,
  email: string
): EmailTemplate => {
  const overage = spent - limit;
  const percentage = Math.round((spent / limit) * 100);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(120deg, #f4d06f, #d1a954); color: #0b0c10; padding: 20px; border-radius: 8px; }
    .alert-box { background: #fff3cd; border-left: 4px solid #f06565; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .stat { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .stat-label { font-weight: 600; }
    .stat-value { color: #f06565; font-weight: 700; }
    .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">⚠️ Budget Alert</h1>
      <p style="margin: 5px 0 0 0;">You've exceeded your budget</p>
    </div>
    
    <div class="alert-box">
      <strong>Overspending Alert</strong><br>
      Your <strong>${category}</strong> budget has been exceeded.
    </div>
    
    <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <div class="stat">
        <span class="stat-label">Category</span>
        <span>${category}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Spent</span>
        <span style="color: #f06565;">R${spent.toFixed(2)}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Budget Limit</span>
        <span>R${limit.toFixed(2)}</span>
      </div>
      <div class="stat" style="border: none;">
        <span class="stat-label">Over Budget By</span>
        <span class="stat-value">R${overage.toFixed(2)} (${percentage}%)</span>
      </div>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 20px;">
      We recommend reviewing your ${category} expenses to bring spending back within your budget limit.
    </p>
    
    <p style="margin-top: 20px;">
      <a href="https://spendguard.app/app" style="background: #f4d06f; color: #0b0c10; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Your Budgets</a>
    </p>
    
    <div class="footer">
      <p>This is an automated alert from SpendGuard. You received this because overspending alerts are enabled in your settings.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
BUDGET ALERT

You've exceeded your budget for ${category}.

Category: ${category}
Spent: R${spent.toFixed(2)}
Budget Limit: R${limit.toFixed(2)}
Over Budget By: R${overage.toFixed(2)} (${percentage}%)

We recommend reviewing your ${category} expenses to bring spending back within your budget limit.

View your budgets: https://spendguard.app/app

This is an automated alert from SpendGuard.
  `;

  return {
    subject: `⚠️ Budget Alert: ${category} Budget Exceeded`,
    html,
    text,
  };
};

export const weeklySummaryTemplate = (
  userEmail: string,
  totalSpent: number,
  totalBudget: number,
  budgetedSpent: number,
  unbudgetedSpent: number,
  budgetAlerts: Array<{ category: string; spent: number; limit: number; status: string }>
): EmailTemplate => {
  const budgetPercentage = totalBudget > 0 ? Math.round((budgetedSpent / totalBudget) * 100) : 0;
  const isOverBudget = budgetedSpent > totalBudget;

  const alertRows = budgetAlerts
    .map(
      (alert) =>
        `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px; color: ${alert.status === "overspent" ? "#d63333" : alert.status === "alert" ? "#f06565" : "#f4d06f"};">
        ${alert.category}
      </td>
      <td style="padding: 10px; text-align: right;">R${alert.spent.toFixed(2)}</td>
      <td style="padding: 10px; text-align: right;">R${alert.limit.toFixed(2)}</td>
      <td style="padding: 10px; text-align: right; font-weight: 600; color: ${alert.status === "overspent" ? "#d63333" : alert.status === "alert" ? "#f06565" : "#f4d06f"};">
        ${Math.round((alert.spent / alert.limit) * 100)}%
      </td>
    </tr>
  `
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(120deg, #f4d06f, #d1a954); color: #0b0c10; padding: 20px; border-radius: 8px; }
    .stat-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
    .stat-label { font-weight: 600; }
    .stat-value { font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
    .alert-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-warn { background: #fff3cd; color: #856404; }
    .badge-alert { background: #f8d7da; color: #721c24; }
    .badge-overspent { background: #ffe0e0; color: #d63333; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">📊 Weekly Spending Summary</h1>
      <p style="margin: 5px 0 0 0;">Week of ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <div class="stat-row">
        <span class="stat-label">Total Spent</span>
        <span class="stat-value">R${totalSpent.toFixed(2)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Budgeted Spending</span>
        <span class="stat-value" style="color: ${budgetPercentage > 100 ? "#d63333" : budgetPercentage > 80 ? "#f06565" : "#5dd39e"};">
          R${budgetedSpent.toFixed(2)} / R${totalBudget.toFixed(2)}
        </span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Budget Utilization</span>
        <span class="stat-value" style="color: ${budgetPercentage > 100 ? "#d63333" : budgetPercentage > 80 ? "#f06565" : "#5dd39e"};">
          ${budgetPercentage}%
        </span>
      </div>
      <div class="stat-row" style="border: none;">
        <span class="stat-label">Unbudgeted Spending</span>
        <span class="stat-value">R${unbudgetedSpent.toFixed(2)}</span>
      </div>
    </div>

    ${budgetAlerts.length > 0 ? `
    <h3 style="margin-top: 20px; margin-bottom: 10px;">Budget Status</h3>
    <table>
      <thead>
        <tr style="border-bottom: 2px solid #ddd;">
          <th style="text-align: left; padding: 10px;">Category</th>
          <th style="text-align: right; padding: 10px;">Spent</th>
          <th style="text-align: right; padding: 10px;">Limit</th>
          <th style="text-align: right; padding: 10px;">Usage</th>
        </tr>
      </thead>
      <tbody>
        ${alertRows}
      </tbody>
    </table>
    ` : ""}
    
    <p style="margin-top: 20px;">
      <a href="https://spendguard.app/app" style="background: #f4d06f; color: #0b0c10; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Full Dashboard</a>
    </p>
    
    <div class="footer">
      <p>This is your weekly spending summary from SpendGuard.</p>
      <p style="margin-top: 10px;">You can disable these emails in your account settings.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
WEEKLY SPENDING SUMMARY
Week of ${new Date().toLocaleDateString()}

OVERVIEW
Total Spent: R${totalSpent.toFixed(2)}
Budgeted Spending: R${budgetedSpent.toFixed(2)} / R${totalBudget.toFixed(2)}
Budget Utilization: ${budgetPercentage}%
Unbudgeted Spending: R${unbudgetedSpent.toFixed(2)}

${budgetAlerts.length > 0 ? `BUDGET STATUS\n${budgetAlerts.map((a) => `${a.category}: R${a.spent.toFixed(2)} / R${a.limit.toFixed(2)} (${Math.round((a.spent / a.limit) * 100)}%)`).join("\n")}\n` : ""}

View your full dashboard: https://spendguard.app/app

You can disable these emails in your account settings.
  `;

  return {
    subject: `📊 Your Weekly Spending Summary - R${totalSpent.toFixed(2)} spent`,
    html,
    text,
  };
};
