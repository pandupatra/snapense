"use server";

import { eq, desc, or, like, and } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import {
  bills,
  items,
  type BillSelect,
  type ItemSelect,
  type Category,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { extractTextFromImage } from "@/lib/ocr";
import { logGeminiCost } from "@/lib/gemini-cost";

export interface BillFormData {
  amount: string;
  currency: string;
  category: Category;
  description: string;
  merchant: string;
  date: string;
  items?: { name: string; qty: string; price: string }[];
}

export interface ExtractedReceiptData {
  amount: string;
  currency: string;
  category: Category;
  description: string;
  merchant: string;
  date: string;
  confidence: number;
  issues: string[];
  discount: string;
  items?: { name: string; qty: string; price: string }[];
}

const CATEGORIES: Category[] = [
  "Food",
  "Transport",
  "Shopping",
  "Utilities",
  "Health",
  "Entertainment",
  "Household",
  "Bills",
  "Other",
];

export async function getBills(
  page: number = 1,
  limit: number = 20,
): Promise<{
  bills: BillSelect[];
  hasMore: boolean;
}> {
  try {
    const session = await requireAuth();
    const offset = (page - 1) * limit;

    console.log(
      "[getBills] Fetching page",
      page,
      "limit",
      limit,
      "offset",
      offset,
      "userId",
      session.user.id,
    );

    const fetchedBills = await db
      .select()
      .from(bills)
      .where(eq(bills.userId, session.user.id))
      .orderBy(desc(bills.transactionDate))
      .limit(limit + 1) // Fetch one extra to check if there are more
      .offset(offset);

    const hasMore = fetchedBills.length > limit;
    const resultBills = hasMore ? fetchedBills.slice(0, limit) : fetchedBills;

    console.log(
      "[getBills] Returning",
      resultBills.length,
      "bills, hasMore:",
      hasMore,
    );

    return { bills: resultBills, hasMore };
  } catch (error) {
    console.error("[getBills] Error:", error);
    return { bills: [], hasMore: false };
  }
}

export async function createBill(
  data: BillFormData,
): Promise<BillSelect | null> {
  try {
    const session = await requireAuth();
    const billId = crypto.randomUUID();

    const hasItems = data.items && data.items.length > 0;
    const amount = hasItems
      ? data.items!.reduce(
          (sum, item) =>
            sum + parseFloat(item.price || "0") * parseInt(item.qty || "1", 10),
          0,
        )
      : parseFloat(data.amount);

    const newBill = {
      id: billId,
      userId: session.user.id,
      amount,
      currency: data.currency || "IDR",
      category: data.category,
      description: hasItems ? null : data.description || null,
      merchant: data.merchant || null,
      transactionDate: new Date(data.date),
    };

    if (hasItems) {
      db.transaction((tx) => {
        tx.insert(bills).values(newBill).run();
        const itemValues = data.items!.map((item) => ({
          id: crypto.randomUUID(),
          billId,
          name: item.name,
          qty: parseInt(item.qty || "1", 10),
          price: parseFloat(item.price || "0"),
        }));
        tx.insert(items).values(itemValues).run();
      });
    } else {
      await db.insert(bills).values(newBill);
    }

    return newBill as BillSelect;
  } catch (error) {
    console.error("Error creating bill:", error);
    return null;
  }
}

export async function updateBill(
  id: string,
  data: BillFormData,
): Promise<BillSelect | null> {
  try {
    const session = await requireAuth();

    // Verify the bill belongs to the user
    const bill = await db.select().from(bills).where(eq(bills.id, id)).limit(1);

    if (!bill[0] || bill[0].userId !== session.user.id) {
      return null;
    }

    const hasItems = data.items && data.items.length > 0;
    const amount = hasItems
      ? data.items!.reduce(
          (sum, item) =>
            sum + parseFloat(item.price || "0") * parseInt(item.qty || "1", 10),
          0,
        )
      : parseFloat(data.amount);

    const updatedBill = {
      amount,
      currency: data.currency || "IDR",
      category: data.category,
      description: hasItems ? null : data.description || null,
      merchant: data.merchant || null,
      transactionDate: new Date(data.date),
    };

    if (hasItems) {
      db.transaction((tx) => {
        tx.update(bills).set(updatedBill).where(eq(bills.id, id)).run();
        tx.delete(items).where(eq(items.billId, id)).run();
        const itemValues = data.items!.map((item) => ({
          id: crypto.randomUUID(),
          billId: id,
          name: item.name,
          qty: parseInt(item.qty || "1", 10),
          price: parseFloat(item.price || "0"),
        }));
        tx.insert(items).values(itemValues).run();
      });
    } else {
      await db.delete(items).where(eq(items.billId, id));
      await db.update(bills).set(updatedBill).where(eq(bills.id, id));
    }

    return { ...bill[0], ...updatedBill } as BillSelect;
  } catch (error) {
    console.error("Error updating bill:", error);
    return null;
  }
}

export async function deleteBill(id: string): Promise<boolean> {
  try {
    const session = await requireAuth();

    // Verify the bill belongs to the user
    const bill = await db.select().from(bills).where(eq(bills.id, id)).limit(1);

    if (!bill[0] || bill[0].userId !== session.user.id) {
      return false;
    }

    await db.delete(bills).where(eq(bills.id, id));
    return true;
  } catch (error) {
    console.error("Error deleting bill:", error);
    return false;
  }
}

export async function searchBills(
  query: string,
  page: number = 1,
  limit: number = 20,
): Promise<{
  bills: BillSelect[];
  hasMore: boolean;
}> {
  try {
    const session = await requireAuth();
    const offset = (page - 1) * limit;

    if (!query.trim()) {
      return getBills(page, limit);
    }

    const searchTerm = `%${query.trim()}%`;

    console.log(
      "[searchBills] Searching for",
      query,
      "page",
      page,
      "limit",
      limit,
      "userId",
      session.user.id,
    );

    const fetchedBills = await db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.userId, session.user.id),
          or(
            like(bills.merchant, searchTerm),
            like(bills.description, searchTerm),
            like(bills.category, searchTerm),
          ),
        ),
      )
      .orderBy(desc(bills.transactionDate))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = fetchedBills.length > limit;
    const resultBills = hasMore ? fetchedBills.slice(0, limit) : fetchedBills;

    console.log(
      "[searchBills] Returning",
      resultBills.length,
      "bills, hasMore:",
      hasMore,
    );

    return { bills: resultBills, hasMore };
  } catch (error) {
    console.error("[searchBills] Error:", error);
    return { bills: [], hasMore: false };
  }
}

export async function getTotalExpenses(): Promise<number> {
  try {
    const session = await requireAuth();
    const result = await db
      .select({ amount: bills.amount })
      .from(bills)
      .where(eq(bills.userId, session.user.id));

    return result.reduce((sum, bill) => sum + bill.amount, 0);
  } catch (error) {
    console.error("Error fetching total:", error);
    return 0;
  }
}

// Helper function to extract text from Gemini API response
function extractResponseText(payload: any): string {
  return (payload.candidates || [])
    .flatMap((candidate: any) => candidate.content?.parts || [])
    .map((part: any) => part.text || "")
    .join("");
}

// Helper function to parse JSON from Gemini response
function parseJsonPayload(rawText: string): any {
  const clean = rawText.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// Helper function to normalize amount
function normalizeAmount(value: any): number {
  const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

// Helper function to normalize date
function normalizeDate(value: any): string {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

// Mock scan for when API is not configured (like old app)
function mockScan(): ExtractedReceiptData {
  return {
    amount: "0.00",
    currency: "IDR",
    category: "Other",
    description: "Mock extraction. Configure Gemini for real scan output.",
    merchant: "",
    date: new Date().toISOString().slice(0, 10),
    confidence: 0,
    issues: ["API key not configured - Set GEMINI_API_KEY in .env.local"],
    discount: "0.00",
    items: [],
  };
}

export async function importBillsFromCSV(
  csvData: string,
): Promise<{ success: number; errors: string[]; imported: BillSelect[] }> {
  try {
    const session = await requireAuth();
    const lines = csvData.split("\n").filter((line) => line.trim());
    const errors: string[] = [];
    const imported: BillSelect[] = [];

    // Skip header row if it exists
    const startIndex = lines[0]?.toLowerCase().includes("date") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        // Parse CSV line (handle quoted values)
        const values: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          const nextChar = line[j + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              current += '"';
              j++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        // Expected format: Date, Amount, Currency, Category, Merchant, Description
        const [dateStr, amountStr, currency, category, merchant, description] =
          values;

        // Validate required fields
        if (!amountStr || !dateStr) {
          errors.push(`Row ${i + 1}: Missing amount or date`);
          continue;
        }

        const amount = parseFloat(String(amountStr).replace(/[^\d.-]/g, ""));
        if (Number.isNaN(amount) || amount <= 0) {
          errors.push(`Row ${i + 1}: Invalid amount "${amountStr}"`);
          continue;
        }

        const billDate = new Date(dateStr);
        if (Number.isNaN(billDate.getTime())) {
          errors.push(`Row ${i + 1}: Invalid date "${dateStr}"`);
          continue;
        }

        // Validate category
        const validCategories: Category[] = [
          "Food",
          "Transport",
          "Shopping",
          "Utilities",
          "Health",
          "Entertainment",
          "Household",
          "Bills",
          "Other",
        ];
        const validCategory = validCategories.includes(category as Category)
          ? (category as Category)
          : "Other";

        const newBill = {
          id: crypto.randomUUID(),
          userId: session.user.id,
          amount,
          currency: String(currency || "IDR")
            .trim()
            .toUpperCase(),
          category: validCategory,
          description: String(description || "").trim() || null,
          merchant: String(merchant || "").trim() || null,
          transactionDate: billDate,
        };

        await db.insert(bills).values(newBill);
        imported.push(newBill as BillSelect);
      } catch (err) {
        errors.push(
          `Row ${i + 1}: ${err instanceof Error ? err.message : "Parse error"}`,
        );
      }
    }

    return { success: imported.length, errors, imported };
  } catch (error) {
    console.error("Error importing bills:", error);
    return { success: 0, errors: ["Authentication failed"], imported: [] };
  }
}

export async function extractReceiptData(
  params: { imageData: string },
): Promise<ExtractedReceiptData> {
  const { imageData } = params;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set, returning mock data");
    return mockScan();
  }

  // Step 1: Run OCR to get a text hint from the receipt
  let ocrText = "";
  try {
    const ocrResult = await extractTextFromImage(imageData);
    ocrText = ocrResult.text.trim();
    console.log("[OCR] Got text hint, length:", ocrText.length);
  } catch (err) {
    console.warn("[OCR] Failed, will rely on vision only:", err);
  }

  // Step 2: Send compressed image + OCR text hint to Gemini.
  // Image is downscaled heavily to reduce token cost — the OCR
  // text compensates for the lower visual quality.
  return extractWithCompressedVisionAndOCR(imageData, ocrText, apiKey);
}

async function compressImageForAPI(
  imageData: string,
): Promise<{ base64: string; mediaType: string }> {
  let base64Data: string;
  let mediaType = "image/jpeg";

  if (imageData.includes(",")) {
    const parts = imageData.split(",", 2);
    base64Data = parts.length === 2 ? parts[1] : imageData;
    const mimeMatch = parts[0]?.match(/image\/[a-z+]+/);
    if (mimeMatch) mediaType = mimeMatch[0];
  } else {
    base64Data = imageData;
  }

  try {
    const inputBuffer = Buffer.from(base64Data, "base64");
    const inputSizeKB = (inputBuffer.length / 1024).toFixed(0);
    console.log("[Compress] Input image size:", inputSizeKB, "KB");

    const compressed = await sharp(inputBuffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 50 })
      .toBuffer();

    const outputSizeKB = (compressed.length / 1024).toFixed(0);
    console.log(
      "[Compress] Output image size:",
      outputSizeKB,
      "KB (",
      Math.round((1 - compressed.length / inputBuffer.length) * 100),
      "% reduction)",
    );

    mediaType = "image/jpeg";
    base64Data = compressed.toString("base64");
  } catch (err) {
    console.warn("[Compress] Failed, sending original image:", err);
  }

  return { base64: base64Data, mediaType };
}

async function extractWithCompressedVisionAndOCR(
  imageData: string,
  ocrText: string,
  apiKey: string,
): Promise<ExtractedReceiptData> {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const promptLines = [
    "Analyze this receipt image and respond with valid JSON only.",
    "Target locale: Indonesian retail receipts unless the document clearly indicates otherwise.",
    "Extract an itemized list of products if visible on the receipt.",
    "Return this JSON shape exactly:",
    "{",
    '  "amount": "0.00",',
    '  "currency": "IDR",',
    '  "category": "Food | Transport | Shopping | Utilities | Health | Entertainment | Household | Bills | Other",',
    '  "description": "short summary up to 120 chars (only if items are not available)",',
    '  "merchant": "store/merchant name if visible, or empty string",',
    '  "confidence": 85,',
    '  "issues": ["array of short uncertainty notes"],',
    '  "date": "YYYY-MM-DD",',
    '  "items": [',
    '    {"name": "product name", "qty": "1", "price": "0.00"},',
    '    {"name": "VOUCHER", "qty": "1", "price": "0.00"},',
    '    {"name": "another product", "qty": "2", "price": "0.00"}',
    "  ]",
    "}",
    "If line items are clearly visible, list each one in the items array. Set amount to the NET total the customer paid.",
    "If line items are NOT visible or unclear, return an empty items array and provide a description instead.",
    "IMPORTANT: confidence must be a number from 0-100 (percentage), not a decimal.",
    "Use 80-100 for high confidence (clear receipt), 50-79 for medium (some unclear parts), 0-49 for low (very blurry or missing info).",
    "If a field is missing, use safe defaults rather than inventing detailed facts.",
    "Locale hint: Indonesian.",
    "",
    "DISCOUNT / VOUCHER HANDLING — CRITICAL:",
    "If the receipt contains a discount, voucher, or promotion line, you MUST include it in the items array:",
    "- Place the discount/voucher item DIRECTLY AFTER the item it applies to.",
    "- Use a name that describes the discount: 'VOUCHER', 'DISKON', 'PROMO', 'POTONGAN', etc.",
    "- Set the price to the DISCOUNT AMOUNT as a POSITIVE number (e.g. '10000' for a Rp 10.000 voucher).",
    "- Set qty to '1'.",
    "- Example receipt layout and items:",
    "  Receipt:                Items array:",
    "  Nasi Goreng  Rp 25000  → {\"name\": \"Nasi Goreng\", \"qty\": \"1\", \"price\": \"25000\"}",
    "  Voucher     -Rp 10000  → {\"name\": \"VOUCHER\", \"qty\": \"1\", \"price\": \"10000\"}",
    "  Es Teh      Rp 8000   → {\"name\": \"Es Teh\", \"qty\": \"1\", \"price\": \"8000\"}",
    "- The 'amount' field MUST be the NET total (25000 - 10000 + 8000 = 23000).",
    "- If the discount applies to the whole order (not a specific item), place it AFTER the last item.",
    "- Common discount keywords: DISCOUNT, DISKON, VOUCHER, PROMO, POTONGAN, CASHBACK, GRATIS, HEMAT.",
  ];

  if (ocrText) {
    promptLines.push(
      "",
      "Below is an OCR text extract from this same receipt. Use it as a reference to help identify text — but always trust the image over OCR when they disagree, as OCR may contain errors:",
      "",
      "--- OCR REFERENCE ---",
      ocrText.slice(0, 3000),
      "--- END OCR REFERENCE ---",
    );
  }

  const prompt = promptLines.join("\n");

  // Compress image to reduce API cost
  const { base64: base64Data, mediaType } =
    await compressImageForAPI(imageData);

  console.log(
    "[Gemini Scan] model:", model,
    "OCR ref:", ocrText ? `${ocrText.length} chars` : "none",
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mediaType, data: base64Data } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[Gemini API] Error:", response.status, errorBody);
      throw new Error(`Gemini scan failed: ${response.status} ${errorBody}`);
    }

    const payload = await response.json();
    console.log("[Gemini API] Response received");

    // Log cost / token usage
    logGeminiCost(model, payload.usageMetadata);

    const rawText = extractResponseText(payload);

    if (!rawText) {
      console.error("[Gemini API] Empty response text");
      return mockScan();
    }

    console.log("[Gemini API] Raw response length:", rawText.length);

    const parsed = parseJsonPayload(rawText);
    return normalizeExtractedData(parsed);
  } catch (error: any) {
    console.error("[Gemini API] Exception:", error.message);
    return mockScan();
  }
}

function normalizeExtractedData(parsed: any): ExtractedReceiptData {
  let amount = normalizeAmount(parsed.amount);
  const currency = String(parsed.currency || "IDR")
    .trim()
    .toUpperCase();
  const category = CATEGORIES.includes(parsed.category)
    ? parsed.category
    : "Other";
  const description = String(parsed.description || "")
    .trim()
    .slice(0, 200);
  const merchant = String(parsed.merchant || "")
    .trim()
    .slice(0, 100);
  const date = normalizeDate(parsed.date);

  let confidence =
    typeof parsed.confidence === "number" ? parsed.confidence : 0;
  if (confidence > 0 && confidence < 1) {
    confidence = Math.round(confidence * 100);
  }
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  const issues = Array.isArray(parsed.issues)
    ? parsed.issues.map((i: string) => String(i)).filter(Boolean)
    : [];

  const DISCOUNT_KEYWORDS = [
    "voucher", "diskon", "discount", "promo", "potongan",
    "cashback", "gratis", "hemat", "saving",
  ];

  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const mappedItems: { name: string; qty: string; price: string }[] =
    rawItems
      .filter((item: any) => item && item.name)
      .map((item: any) => ({
        name: String(item.name || "")
          .trim()
          .slice(0, 200),
        qty: String(item.qty || "1").trim(),
        price: String(item.price || "0").trim(),
      }));

  // Merge discount items into their preceding item:
  // e.g. "Nasi Goreng Rp 25000" + "VOUCHER Rp 10000"
  //      → "Nasi Goreng Rp 15000" (25000 - 10000)
  const extractedItems: { name: string; qty: string; price: string }[] = [];
  for (const item of mappedItems) {
    const nameLower = item.name.toLowerCase();
    const isDiscount = DISCOUNT_KEYWORDS.some((kw) => nameLower.includes(kw));

    if (isDiscount && extractedItems.length > 0) {
      const prev = extractedItems[extractedItems.length - 1];
      const discountAmt = normalizeAmount(item.price);
      const prevTotal = normalizeAmount(prev.price) * parseInt(prev.qty || "1", 10);
      const newTotal = Math.max(0, prevTotal - discountAmt);
      const prevQty = parseInt(prev.qty || "1", 10);
      prev.price = prevQty > 1
        ? (newTotal / prevQty).toFixed(2)
        : newTotal.toFixed(2);
      prev.name = `${prev.name} (${item.name} -Rp ${discountAmt.toLocaleString("id-ID")})`;
    } else {
      extractedItems.push(item);
    }
  }

  const hasExtractedItems = extractedItems.length > 0;

  console.log("[Scan] Extracted:", {
    amount,
    currency,
    category,
    description,
    merchant,
    date,
    confidence,
    issues,
    itemsCount: extractedItems.length,
  });

  return {
    amount: hasExtractedItems
      ? extractedItems
          .reduce(
            (sum: number, i) =>
              sum + normalizeAmount(i.price) * parseInt(i.qty || "1", 10),
            0,
          )
          .toFixed(2)
      : amount.toFixed(2),
    currency,
    category,
    description: hasExtractedItems ? "" : description,
    merchant,
    date,
    confidence,
    issues,
    discount: "0.00",
    items: hasExtractedItems ? extractedItems : undefined,
  };
}
