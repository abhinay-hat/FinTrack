/**
 * OCR Engine abstraction layer.
 * Provides interface for text recognition from images.
 *
 * Current: Returns false for isOCRAvailable (Expo Go managed workflow).
 * Future: When building with dev client, install @react-native-ml-kit/text-recognition
 * and implement the performOCR function.
 */

export interface OCRResult {
  text: string;
  blocks: OCRBlock[];
  confidence: number;
}

export interface OCRBlock {
  text: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
  lines: OCRLine[];
}

export interface OCRLine {
  text: string;
  confidence: number;
}

/**
 * Check if on-device OCR is available.
 * ML Kit Text Recognition requires a dev client build with
 * @react-native-ml-kit/text-recognition installed.
 */
export function isOCRAvailable(): boolean {
  // OCR is not available in Expo Go managed workflow.
  // When building with dev client, replace this with actual check.
  return false;
}

/**
 * Perform OCR on an image URI.
 * Returns extracted text with confidence scores.
 *
 * Note: Requires dev client build with @react-native-ml-kit/text-recognition.
 * In Expo Go, use extractPDFText() for digital PDFs instead.
 */
export async function performOCR(_imageUri: string): Promise<OCRResult> {
  throw new Error(
    'On-device OCR is not available in Expo Go. ' +
    'Please use a development build with @react-native-ml-kit/text-recognition, ' +
    'or use the CSV/Excel import for statement files.',
  );
}
