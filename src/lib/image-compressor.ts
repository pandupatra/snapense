/**
 * Client-side image compression utility
 * Uses Canvas API to resize and compress images before uploading
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;      // 0.0 - 1.0
  maxSizeKB?: number;    // Target max size in KB
}

export interface CompressResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Compress an image file using Canvas API
 * @param file - The file or blob to compress
 * @param options - Compression options
 * @returns Promise resolving to compressed data URL
 */
export async function compressImage(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.7,
    maxSizeKB = 200
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Calculate dimensions maintaining aspect ratio
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Fill white background for JPEG (handles transparency)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Compress iteratively until under size limit
        let currentQuality = quality;
        let result = canvas.toDataURL('image/jpeg', currentQuality);

        const targetBytes = maxSizeKB * 1024;

        // Reduce quality if still too large
        while (result.length > targetBytes && currentQuality > 0.1) {
          currentQuality -= 0.1;
          result = canvas.toDataURL('image/jpeg', currentQuality);
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress image and return detailed result
 * @param file - The file or blob to compress
 * @param options - Compression options
 * @returns Promise resolving to compression result with metadata
 */
export async function compressImageWithStats(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const originalSize = file.size;
  const dataUrl = await compressImage(file, options);

  // Extract base64 data length
  const base64Length = dataUrl.split(',')[1].length;
  const compressedSize = Math.round(base64Length * 0.75); // Approximate byte size

  return {
    dataUrl,
    originalSize,
    compressedSize,
    compressionRatio: Math.round((1 - compressedSize / originalSize) * 100)
  };
}

/**
 * Get file size in KB from a file or blob
 */
export function getFileSizeKB(file: File | Blob): number {
  return Math.round(file.size / 1024);
}

/**
 * Get data URL size in KB
 */
export function getDataURLSizeKB(dataUrl: string): number {
  const base64Length = dataUrl.split(',')[1]?.length || 0;
  return Math.round((base64Length * 0.75) / 1024);
}
