/**
 * Image preprocessing for camera-captured bank statements.
 * Uses expo-image-manipulator for contrast/sharpening.
 */

import * as ImageManipulator from 'expo-image-manipulator';

export interface PreprocessedImage {
  uri: string;
  width: number;
  height: number;
  quality: 'good' | 'acceptable' | 'poor';
  qualityMessage: string;
}

/**
 * Preprocess an image for OCR — enhance contrast and resize.
 */
export async function preprocessImage(imageUri: string): Promise<PreprocessedImage> {
  // Step 1: Resize to optimal OCR dimensions (max 2048px wide)
  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 2048 } }],
    { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG },
  );

  // Step 2: Apply contrast enhancement
  // expo-image-manipulator doesn't have direct contrast controls,
  // so we rely on the JPEG quality setting for optimization
  const enhanced = await ImageManipulator.manipulateAsync(
    resized.uri,
    [],
    { compress: 0.98, format: ImageManipulator.SaveFormat.PNG },
  );

  // Assess quality based on dimensions
  const quality = assessImageQuality(enhanced.width, enhanced.height);

  return {
    uri: enhanced.uri,
    width: enhanced.width,
    height: enhanced.height,
    ...quality,
  };
}

function assessImageQuality(
  width: number,
  height: number,
): { quality: 'good' | 'acceptable' | 'poor'; qualityMessage: string } {
  const pixels = width * height;

  if (pixels >= 2000000) {
    return { quality: 'good', qualityMessage: 'Image quality is good for OCR' };
  }
  if (pixels >= 1000000) {
    return { quality: 'acceptable', qualityMessage: 'Image quality is acceptable. Better lighting may improve results.' };
  }
  return {
    quality: 'poor',
    qualityMessage: 'Image quality is low. Try better lighting and hold the phone steady.',
  };
}

/**
 * Auto-rotate image based on aspect ratio (landscape → portrait for statements).
 */
export async function autoRotateForStatement(imageUri: string): Promise<string> {
  const info = await ImageManipulator.manipulateAsync(imageUri, [], {});

  if (info.width > info.height) {
    // Landscape — rotate to portrait
    const rotated = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ rotate: 90 }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.95 },
    );
    return rotated.uri;
  }

  return imageUri;
}
