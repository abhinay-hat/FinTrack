/**
 * Pre-built column mapping templates for top 15 Indian banks.
 * Each template defines expected column headers for auto-matching.
 */

export interface BankTemplate {
  bankName: string;
  dateColumns: string[];
  amountColumns: string[];
  debitColumns: string[];
  creditColumns: string[];
  descriptionColumns: string[];
  balanceColumns: string[];
  dateFormat: string; // moment-style format
  skipRows?: number; // rows to skip before header
}

export const BANK_TEMPLATES: BankTemplate[] = [
  {
    bankName: 'SBI',
    dateColumns: ['Txn Date', 'Value Date', 'Transaction Date'],
    amountColumns: [],
    debitColumns: ['Debit', 'Withdrawal', 'Withdrawal Amt'],
    creditColumns: ['Credit', 'Deposit', 'Deposit Amt'],
    descriptionColumns: ['Description', 'Particulars', 'Narration', 'Ref No./Cheque No.'],
    balanceColumns: ['Balance', 'Closing Balance'],
    dateFormat: 'DD/MM/YYYY',
  },
  {
    bankName: 'HDFC',
    dateColumns: ['Date', 'Value Dt', 'Transaction Date'],
    amountColumns: [],
    debitColumns: ['Withdrawal Amt.', 'Debit Amount', 'Withdrawal'],
    creditColumns: ['Deposit Amt.', 'Credit Amount', 'Deposit'],
    descriptionColumns: ['Narration', 'Description', 'Particulars'],
    balanceColumns: ['Closing Balance', 'Balance'],
    dateFormat: 'DD/MM/YY',
  },
  {
    bankName: 'ICICI',
    dateColumns: ['Transaction Date', 'Value Date', 'Date'],
    amountColumns: ['Transaction Amount'],
    debitColumns: ['Withdrawal Amount (INR )', 'Debit'],
    creditColumns: ['Deposit Amount (INR )', 'Credit'],
    descriptionColumns: ['Transaction Remarks', 'Particulars', 'Description'],
    balanceColumns: ['Balance (INR )', 'Balance'],
    dateFormat: 'DD/MM/YYYY',
  },
  {
    bankName: 'Axis',
    dateColumns: ['Tran Date', 'Transaction Date'],
    amountColumns: [],
    debitColumns: ['Debit', 'Dr Amount'],
    creditColumns: ['Credit', 'Cr Amount'],
    descriptionColumns: ['Particulars', 'Description'],
    balanceColumns: ['Balance', 'Init. Br'],
    dateFormat: 'DD-MM-YYYY',
  },
  {
    bankName: 'Kotak',
    dateColumns: ['Date', 'Transaction Date'],
    amountColumns: ['Amount'],
    debitColumns: ['Debit', 'Dr'],
    creditColumns: ['Credit', 'Cr'],
    descriptionColumns: ['Description', 'Narration', 'Particulars'],
    balanceColumns: ['Balance'],
    dateFormat: 'DD/MM/YYYY',
  },
  {
    bankName: 'PNB',
    dateColumns: ['Transaction Date', 'Date'],
    amountColumns: [],
    debitColumns: ['Withdrawal', 'Debit'],
    creditColumns: ['Deposit', 'Credit'],
    descriptionColumns: ['Particulars', 'Description'],
    balanceColumns: ['Balance'],
    dateFormat: 'DD/MM/YYYY',
  },
  {
    bankName: 'BOB',
    dateColumns: ['TXN DATE', 'DATE'],
    amountColumns: [],
    debitColumns: ['WITHDRAWAL', 'DEBIT'],
    creditColumns: ['DEPOSIT', 'CREDIT'],
    descriptionColumns: ['PARTICULARS', 'DESCRIPTION'],
    balanceColumns: ['BALANCE'],
    dateFormat: 'DD/MM/YYYY',
  },
  {
    bankName: 'Canara',
    dateColumns: ['Transaction Date', 'Date'],
    amountColumns: [],
    debitColumns: ['Debit', 'Withdrawal'],
    creditColumns: ['Credit', 'Deposit'],
    descriptionColumns: ['Description', 'Narration'],
    balanceColumns: ['Balance'],
    dateFormat: 'DD-MM-YYYY',
  },
  {
    bankName: 'Union',
    dateColumns: ['Transaction Date', 'Date'],
    amountColumns: [],
    debitColumns: ['Debit Amount', 'Withdrawal'],
    creditColumns: ['Credit Amount', 'Deposit'],
    descriptionColumns: ['Narration', 'Description'],
    balanceColumns: ['Balance'],
    dateFormat: 'DD/MM/YYYY',
  },
  {
    bankName: 'IndusInd',
    dateColumns: ['Transaction Date', 'Date'],
    amountColumns: ['Amount'],
    debitColumns: ['Debit'],
    creditColumns: ['Credit'],
    descriptionColumns: ['Transaction Particulars', 'Description'],
    balanceColumns: ['Balance'],
    dateFormat: 'DD-MM-YYYY',
  },
  {
    bankName: 'Federal',
    dateColumns: ['Transaction Date', 'Date'],
    amountColumns: [],
    debitColumns: ['Debit', 'Withdrawal'],
    creditColumns: ['Credit', 'Deposit'],
    descriptionColumns: ['Description', 'Narration'],
    balanceColumns: ['Balance'],
    dateFormat: 'DD/MM/YYYY',
  },
  {
    bankName: 'Yes Bank',
    dateColumns: ['Transaction Date', 'Date'],
    amountColumns: [],
    debitColumns: ['Debit', 'Withdrawal'],
    creditColumns: ['Credit', 'Deposit'],
    descriptionColumns: ['Description', 'Particulars'],
    balanceColumns: ['Balance', 'Running Balance'],
    dateFormat: 'DD/MM/YYYY',
  },
  {
    bankName: 'IDFC First',
    dateColumns: ['Transaction Date', 'Date'],
    amountColumns: ['Transaction Amount'],
    debitColumns: ['Debit'],
    creditColumns: ['Credit'],
    descriptionColumns: ['Transaction Remarks', 'Description'],
    balanceColumns: ['Balance'],
    dateFormat: 'DD/MM/YYYY',
  },
  {
    bankName: 'RBL',
    dateColumns: ['Transaction Date', 'Date'],
    amountColumns: [],
    debitColumns: ['Debit Amount', 'Withdrawal'],
    creditColumns: ['Credit Amount', 'Deposit'],
    descriptionColumns: ['Description', 'Narration'],
    balanceColumns: ['Balance'],
    dateFormat: 'DD/MM/YYYY',
  },
  {
    bankName: 'AU SFB',
    dateColumns: ['Txn Date', 'Date'],
    amountColumns: [],
    debitColumns: ['Debit', 'Withdrawal'],
    creditColumns: ['Credit', 'Deposit'],
    descriptionColumns: ['Particulars', 'Description'],
    balanceColumns: ['Balance'],
    dateFormat: 'DD/MM/YYYY',
  },
];

export function findBankTemplate(bankName: string): BankTemplate | undefined {
  const lower = bankName.toLowerCase();
  return BANK_TEMPLATES.find((t) => lower.includes(t.bankName.toLowerCase()));
}
