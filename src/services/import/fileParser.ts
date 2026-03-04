/**
 * File parsing utilities for CSV and Excel files.
 * Handles multiple delimiters, merged headers, blank rows, summary rows.
 */

import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedFile {
  headers: string[];
  rows: string[][];
  fileName: string;
}

/**
 * Strip rows that are likely headers/summaries:
 * - Completely blank rows
 * - Rows with very few filled cells (< 30% of header count)
 */
function cleanRows(headers: string[], rows: string[][]): string[][] {
  const minCells = Math.max(2, Math.floor(headers.length * 0.3));
  return rows.filter((row) => {
    const filledCells = row.filter((cell) => cell && cell.trim() !== '').length;
    return filledCells >= minCells;
  });
}

/**
 * Find the actual header row — skip merged/title rows.
 * Looks for the row with the most non-empty cells.
 */
function findHeaderRow(allRows: string[][]): { headerIndex: number; headers: string[] } {
  let bestIndex = 0;
  let bestCount = 0;

  const searchLimit = Math.min(10, allRows.length);
  for (let i = 0; i < searchLimit; i++) {
    const row = allRows[i];
    const filledCount = row.filter((c) => c && c.trim() !== '').length;
    if (filledCount > bestCount) {
      bestCount = filledCount;
      bestIndex = i;
    }
  }

  return {
    headerIndex: bestIndex,
    headers: allRows[bestIndex].map((h) => (h ?? '').toString().trim()),
  };
}

export async function parseCSV(fileUri: string, fileName: string): Promise<ParsedFile> {
  const content = await FileSystem.readAsStringAsync(fileUri);

  // Auto-detect delimiter
  const firstLine = content.split('\n')[0];
  let delimiter = ',';
  if (firstLine.split('\t').length > firstLine.split(',').length) {
    delimiter = '\t';
  } else if (firstLine.split(';').length > firstLine.split(',').length) {
    delimiter = ';';
  }

  const result = Papa.parse(content, {
    delimiter,
    skipEmptyLines: false,
  });

  const allRows = result.data as string[][];
  if (allRows.length < 2) {
    throw new Error('File has insufficient data rows');
  }

  const { headerIndex, headers } = findHeaderRow(allRows);
  const dataRows = allRows.slice(headerIndex + 1);
  const cleaned = cleanRows(headers, dataRows);

  return { headers, rows: cleaned, fileName };
}

export async function parseExcel(fileUri: string, fileName: string): Promise<ParsedFile> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: 'base64',
  });

  const workbook = XLSX.read(base64, { type: 'base64' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const allRows: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (allRows.length < 2) {
    throw new Error('File has insufficient data rows');
  }

  const { headerIndex, headers } = findHeaderRow(allRows);
  const dataRows = allRows.slice(headerIndex + 1);
  const cleaned = cleanRows(headers, dataRows);

  return { headers, rows: cleaned, fileName };
}

export async function parseFile(fileUri: string, fileName: string): Promise<ParsedFile> {
  const ext = fileName.toLowerCase().split('.').pop();

  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    return parseCSV(fileUri, fileName);
  }
  if (ext === 'xls' || ext === 'xlsx') {
    return parseExcel(fileUri, fileName);
  }
  throw new Error(`Unsupported file format: .${ext}`);
}
