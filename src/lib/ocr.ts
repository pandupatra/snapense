import { createWorker } from "tesseract.js";
import sharp from "sharp";

export interface OCRResult {
  text: string;
  confidence: number;
}

async function preprocessImage(base64Data: string): Promise<Buffer> {
  const imageBuffer = Buffer.from(base64Data, "base64");

  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 1000;

  // Target ~300 DPI equivalent for better OCR on receipts.
  // Receipts are narrow, so scale up small images aggressively.
  const targetWidth = Math.max(width * 2, 2000);

  const processed = await sharp(imageBuffer)
    .resize(targetWidth, null, {
      fit: "inside",
      withoutEnlargement: false,
      kernel: "lanczos3",
    })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 0.8 })
    .linear(1.2, -(0.2 * 128))
    .png()
    .toBuffer();

  return processed;
}

export async function extractTextFromImage(
  imageData: string,
): Promise<OCRResult> {
  let base64Data: string;

  if (imageData.includes(",")) {
    const parts = imageData.split(",", 2);
    base64Data = parts.length === 2 ? parts[1] : imageData;
  } else {
    base64Data = imageData;
  }

  console.log("[OCR] Preprocessing image...");

  let processedBuffer: Buffer;
  try {
    processedBuffer = await preprocessImage(base64Data);
    console.log(
      "[OCR] Preprocessed image size:",
      (processedBuffer.length / 1024).toFixed(0) + "KB",
    );
  } catch (err) {
    console.warn("[OCR] Preprocessing failed, using raw image:", err);
    processedBuffer = Buffer.from(base64Data, "base64");
  }

  console.log("[OCR] Running Tesseract...");

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    worker = await createWorker("ind+eng", 1, {
      logger: () => {},
    });

    const result = await worker.recognize(processedBuffer);

    const text = result.data.text;
    const confidence = result.data.confidence;

    console.log(
      "[OCR] Result: length=",
      text.length,
      "confidence=",
      confidence.toFixed(1),
    );
    console.log("[OCR] Text preview:", text.slice(0, 500));

    return {
      text,
      confidence,
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}