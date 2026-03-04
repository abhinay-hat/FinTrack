/**
 * PDF export service for FinTrack transactions.
 *
 * Generates a styled HTML report and converts it to PDF via expo-print.
 * Indian formatting throughout (DD/MM/YYYY, INR grouping).
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { documentDirectory, moveAsync } from 'expo-file-system/legacy';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/setup';
import Transaction from '@/models/Transaction';
import Category from '@/models/Category';
import Account from '@/models/Account';
import { colors } from '@/theme/colors';
import type { ExportOptions } from './csvExporter';
import { formatIndianCurrency } from './csvExporter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateDDMMYYYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Export transactions to a PDF file. Returns the file URI.
 */
export async function exportToPDF(options: ExportOptions): Promise<string> {
  // Build query conditions
  const conditions: Q.Clause[] = [];
  if (options.dateRange) {
    conditions.push(
      Q.where('date', Q.gte(options.dateRange.start.getTime())),
      Q.where('date', Q.lte(options.dateRange.end.getTime())),
    );
  }
  if (options.accountId) {
    conditions.push(Q.where('account_id', options.accountId));
  }

  const transactions = await database
    .get<Transaction>('transactions')
    .query(...conditions)
    .fetch();

  // Pre-fetch categories and accounts
  const categoryMap = new Map<string, string>();
  const accountMap = new Map<string, string>();

  if (options.includeCategories !== false) {
    const categories = await database
      .get<Category>('categories')
      .query()
      .fetch();
    for (const cat of categories) {
      categoryMap.set(cat.id, cat.name);
    }
  }

  const accounts = await database.get<Account>('accounts').query().fetch();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc.name);
  }

  // Compute summary
  let totalIncome = 0;
  let totalExpense = 0;
  for (const tx of transactions) {
    if (tx.transactionType === 'income') {
      totalIncome += tx.amount;
    } else if (tx.transactionType === 'expense') {
      totalExpense += tx.amount;
    }
  }
  const netBalance = totalIncome - totalExpense;

  // Date range label
  let dateRangeLabel = 'All time';
  if (options.dateRange) {
    dateRangeLabel = `${formatDateDDMMYYYY(options.dateRange.start)} — ${formatDateDDMMYYYY(options.dateRange.end)}`;
  }

  // Build transaction rows HTML
  const transactionRows = transactions
    .map((tx) => {
      const typeColor =
        tx.transactionType === 'income'
          ? colors.teal.DEFAULT
          : tx.transactionType === 'expense'
            ? colors.danger.DEFAULT
            : colors.blueAccent.DEFAULT;
      return `
        <tr>
          <td>${formatDateDDMMYYYY(tx.date)}</td>
          <td>${escapeHtml(tx.description)}</td>
          <td>${escapeHtml(categoryMap.get(tx.categoryId) ?? '—')}</td>
          <td style="color:${typeColor};font-weight:600;">
            ${formatIndianCurrency(tx.amount)}
          </td>
          <td>${tx.transactionType.charAt(0).toUpperCase() + tx.transactionType.slice(1)}</td>
          <td>${escapeHtml(accountMap.get(tx.accountId) ?? '—')}</td>
        </tr>`;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: ${colors.textPrimary.DEFAULT};
      padding: 32px;
      font-size: 11px;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      border-bottom: 2px solid ${colors.navy};
      padding-bottom: 16px;
    }
    .header h1 {
      font-size: 22px;
      color: ${colors.navy};
      margin-bottom: 4px;
    }
    .header p { color: ${colors.textSecondary.DEFAULT}; font-size: 12px; }
    .summary {
      display: flex;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 16px;
    }
    .summary-card {
      flex: 1;
      padding: 12px 16px;
      border-radius: 8px;
      text-align: center;
    }
    .summary-card.income {
      background: ${colors.teal.DEFAULT}15;
      border: 1px solid ${colors.teal.DEFAULT}40;
    }
    .summary-card.expense {
      background: ${colors.danger.DEFAULT}15;
      border: 1px solid ${colors.danger.DEFAULT}40;
    }
    .summary-card.balance {
      background: ${colors.navy}15;
      border: 1px solid ${colors.navy}40;
    }
    .summary-card .label { font-size: 10px; color: ${colors.textSecondary.DEFAULT}; text-transform: uppercase; }
    .summary-card .value { font-size: 16px; font-weight: 700; margin-top: 4px; }
    .summary-card.income .value { color: ${colors.teal.DEFAULT}; }
    .summary-card.expense .value { color: ${colors.danger.DEFAULT}; }
    .summary-card.balance .value { color: ${colors.navy}; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th {
      background: ${colors.navy};
      color: ${colors.white};
      padding: 8px 6px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 6px;
      border-bottom: 1px solid ${colors.divider};
    }
    tr:nth-child(even) { background: #f8fafc; }
    .footer {
      margin-top: 24px;
      text-align: center;
      font-size: 9px;
      color: ${colors.textSecondary.DEFAULT};
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>FinTrack Transaction Report</h1>
    <p>${dateRangeLabel} &bull; ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}</p>
  </div>

  <div class="summary">
    <div class="summary-card income">
      <div class="label">Total Income</div>
      <div class="value">${formatIndianCurrency(totalIncome)}</div>
    </div>
    <div class="summary-card expense">
      <div class="label">Total Expenses</div>
      <div class="value">${formatIndianCurrency(totalExpense)}</div>
    </div>
    <div class="summary-card balance">
      <div class="label">Net Balance</div>
      <div class="value">${formatIndianCurrency(netBalance)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Category</th>
        <th>Amount</th>
        <th>Type</th>
        <th>Account</th>
      </tr>
    </thead>
    <tbody>
      ${transactionRows || '<tr><td colspan="6" style="text-align:center;padding:20px;">No transactions found</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    Generated by FinTrack on ${formatDateDDMMYYYY(new Date())}
  </div>
</body>
</html>`;

  // Generate PDF
  const { uri: pdfUri } = await Print.printToFileAsync({ html });

  // Move to a more descriptive filename
  const fileName = `fintrack-report-${Date.now()}.pdf`;
  const destUri = `${documentDirectory}${fileName}`;
  await moveAsync({ from: pdfUri, to: destUri });

  return destUri;
}

/**
 * Share a PDF file via the system share sheet.
 */
export async function sharePDF(fileUri: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
}
