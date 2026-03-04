export { extractPDFText, extractPDFTextWithPassword } from './pdfTextExtractor';
export type { PDFPageText, PDFExtractionResult } from './pdfTextExtractor';

export { parseStatementText, validateWithBalance } from './statementParser';
export type { ParsedStatementRow, StatementParseResult } from './statementParser';

export { scoreTransactions, getConfidenceSummary } from './confidenceScoring';
export type { ScoredTransaction, ConfidenceLevel } from './confidenceScoring';

export { preprocessImage, autoRotateForStatement } from './imagePreprocessor';
export type { PreprocessedImage } from './imagePreprocessor';

export { isOCRAvailable, performOCR } from './ocrEngine';
export type { OCRResult, OCRBlock, OCRLine } from './ocrEngine';
