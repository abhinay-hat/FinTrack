/**
 * Structured parsing engine for bank statement text.
 * Uses regex patterns to extract transactions from OCR/PDF text.
 * Supports common Indian bank statement formats.
 */

export interface ParsedStatementRow {
  date: Date;
  description: string;
  debit: number;
  credit: number;
  balance: number | null;
  confidence: number; // 0-1
  rawText: string;
}

export interface StatementParseResult {
  rows: ParsedStatementRow[];
  bankName: string | null;
  dateRange: { from: Date; to: Date } | null;
  openingBalance: number | null;
  closingBalance: number | null;
  averageConfidence: number;
}

// Indian date formats
const DATE_PATTERNS = [
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,              // DD/MM/YYYY or DD-MM-YYYY
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2,4})/i, // DD Mon YYYY
];

// Amount patterns (Indian format: 1,23,456.78)
const AMOUNT_REGEX = /(?:₹\s*)?(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)/g;

// Bank identification patterns
const BANK_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /state bank of india|SBI/i, name: 'SBI' },
  { pattern: /HDFC Bank/i, name: 'HDFC' },
  { pattern: /ICICI Bank/i, name: 'ICICI' },
  { pattern: /Axis Bank/i, name: 'Axis' },
  { pattern: /Kotak Mahindra/i, name: 'Kotak' },
  { pattern: /Punjab National/i, name: 'PNB' },
  { pattern: /Bank of Baroda/i, name: 'BOB' },
  { pattern: /Canara Bank/i, name: 'Canara' },
  { pattern: /Union Bank/i, name: 'Union' },
  { pattern: /IndusInd/i, name: 'IndusInd' },
  { pattern: /Federal Bank/i, name: 'Federal' },
  { pattern: /Yes Bank/i, name: 'Yes Bank' },
  { pattern: /IDFC First/i, name: 'IDFC First' },
  { pattern: /RBL Bank/i, name: 'RBL' },
  { pattern: /AU Small Finance/i, name: 'AU SFB' },
];

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseIndianDate(text: string): Date | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    if (match[2] && isNaN(Number(match[2]))) {
      // DD Mon YYYY format
      const day = parseInt(match[1], 10);
      const month = MONTH_MAP[match[2].toLowerCase().slice(0, 3)];
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    } else {
      // DD/MM/YYYY format
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }
  }
  return null;
}

function parseIndianAmount(text: string): number {
  const cleaned = text.replace(/[₹,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function detectBank(text: string): string | null {
  for (const { pattern, name } of BANK_PATTERNS) {
    if (pattern.test(text)) return name;
  }
  return null;
}

/**
 * Parse raw text from a bank statement into structured transaction rows.
 */
export function parseStatementText(rawText: string): StatementParseResult {
  const bankName = detectBank(rawText);
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  const rows: ParsedStatementRow[] = [];
  let currentDate: Date | null = null;
  let currentDescription = '';
  let currentAmounts: number[] = [];
  let currentConfidence = 0;
  let currentRawText = '';

  for (const line of lines) {
    const dateMatch = parseIndianDate(line);

    if (dateMatch) {
      // If we have a pending row, flush it
      if (currentDate && currentAmounts.length > 0) {
        const row = buildRow(currentDate, currentDescription, currentAmounts, currentConfidence, currentRawText);
        if (row) rows.push(row);
      }

      currentDate = dateMatch;
      currentDescription = line.replace(DATE_PATTERNS[0], '').replace(DATE_PATTERNS[1], '').trim();
      currentAmounts = [];
      currentConfidence = 0.8;
      currentRawText = line;

      // Extract amounts from this line
      const amounts = extractAmounts(line);
      currentAmounts = amounts;
    } else if (currentDate) {
      // Continuation line — append to description and check for amounts
      currentDescription += ' ' + line;
      currentRawText += '\n' + line;
      const amounts = extractAmounts(line);
      if (amounts.length > 0) {
        currentAmounts = [...currentAmounts, ...amounts];
      }
    }
  }

  // Flush last row
  if (currentDate && currentAmounts.length > 0) {
    const row = buildRow(currentDate, currentDescription, currentAmounts, currentConfidence, currentRawText);
    if (row) rows.push(row);
  }

  // Compute date range
  let dateRange: { from: Date; to: Date } | null = null;
  if (rows.length > 0) {
    const sorted = rows.map((r) => r.date.getTime()).sort();
    dateRange = { from: new Date(sorted[0]), to: new Date(sorted[sorted.length - 1]) };
  }

  // Compute balances
  const balances = rows.filter((r) => r.balance !== null).map((r) => r.balance!);
  const openingBalance = balances.length > 0 ? balances[0] : null;
  const closingBalance = balances.length > 0 ? balances[balances.length - 1] : null;

  const averageConfidence = rows.length > 0
    ? rows.reduce((sum, r) => sum + r.confidence, 0) / rows.length
    : 0;

  return { rows, bankName, dateRange, openingBalance, closingBalance, averageConfidence };
}

function extractAmounts(line: string): number[] {
  const amounts: number[] = [];
  const matches = line.matchAll(AMOUNT_REGEX);
  for (const match of matches) {
    const val = parseIndianAmount(match[1]);
    if (val > 0) amounts.push(val);
  }
  return amounts;
}

function buildRow(
  date: Date,
  description: string,
  amounts: number[],
  baseConfidence: number,
  rawText: string,
): ParsedStatementRow | null {
  if (amounts.length === 0) return null;

  let debit = 0;
  let credit = 0;
  let balance: number | null = null;
  let confidence = baseConfidence;

  // Determine debit/credit based on amount count and position
  if (amounts.length >= 3) {
    // Likely: debit, credit, balance (one of debit/credit is 0)
    debit = amounts[0];
    credit = amounts[1];
    balance = amounts[2];
    confidence = 0.7;
  } else if (amounts.length === 2) {
    // Could be: (amount, balance) or (debit, credit)
    // Heuristic: if second amount > first, likely (amount, balance)
    if (amounts[1] > amounts[0] * 2) {
      debit = amounts[0]; // Assume expense
      balance = amounts[1];
      confidence = 0.5;
    } else {
      debit = amounts[0];
      credit = amounts[1];
      confidence = 0.5;
    }
  } else if (amounts.length === 1) {
    // Single amount — check for debit/credit keywords
    const lower = rawText.toLowerCase();
    if (lower.includes('cr') || lower.includes('credit') || lower.includes('deposit') || lower.includes('received')) {
      credit = amounts[0];
      confidence = 0.6;
    } else {
      debit = amounts[0];
      confidence = 0.6;
    }
  }

  // Clean description
  const cleanDesc = description
    .replace(AMOUNT_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);

  return {
    date,
    description: cleanDesc || 'Transaction',
    debit,
    credit,
    balance,
    confidence,
    rawText,
  };
}

/**
 * Validate parsed rows against running balance.
 * Adjusts confidence scores based on balance consistency.
 */
export function validateWithBalance(rows: ParsedStatementRow[]): ParsedStatementRow[] {
  const rowsWithBalance = rows.filter((r) => r.balance !== null);
  if (rowsWithBalance.length < 2) return rows;

  return rows.map((row, idx) => {
    if (idx === 0 || row.balance === null) return row;

    const prevRow = rows.slice(0, idx).reverse().find((r) => r.balance !== null);
    if (!prevRow || prevRow.balance === null) return row;

    const expectedBalance = prevRow.balance - row.debit + row.credit;
    const actualBalance = row.balance;
    const delta = Math.abs(expectedBalance - actualBalance);

    if (delta < 0.01) {
      // Perfect match — high confidence
      return { ...row, confidence: Math.min(row.confidence + 0.2, 1.0) };
    } else if (delta < 1) {
      // Close match (rounding)
      return { ...row, confidence: Math.min(row.confidence + 0.1, 0.95) };
    } else {
      // Mismatch — possibly debit/credit swapped or amount error
      return { ...row, confidence: Math.max(row.confidence - 0.2, 0.2) };
    }
  });
}
