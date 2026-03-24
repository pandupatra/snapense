"use server";

import { eq, desc, or, like, and } from "drizzle-orm";
import { db } from "@/db";
import { bills, type BillSelect, type Category } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";

export interface BillFormData {
  amount: string;
  currency: string;
  category: Category;
  description: string;
  merchant: string;
  date: string;
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

    const newBill = {
      id: crypto.randomUUID(),
      userId: session.user.id,
      amount: parseFloat(data.amount),
      currency: data.currency || "IDR",
      category: data.category,
      description: data.description || null,
      merchant: data.merchant || null,
      transactionDate: new Date(data.date),
    };

    await db.insert(bills).values(newBill);
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

    const updatedBill = {
      amount: parseFloat(data.amount),
      currency: data.currency || "IDR",
      category: data.category,
      description: data.description || null,
      merchant: data.merchant || null,
      transactionDate: new Date(data.date),
    };

    await db
      .update(bills)
      .set(updatedBill)
      .where(eq(bills.id, id));

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

// Helper function to compress base64 image data (server-side using Buffer)
function compressBase64Image(base64Data: string, maxSizeKB = 1024): string {
  // For server-side, we'll just truncate if too large
  // In production, use sharp or jimp library for proper compression
  const currentSizeKB = (base64Data.length * 0.75) / 1024; // approximate
  if (currentSizeKB > maxSizeKB) {
    console.warn(
      `Image too large (${currentSizeKB.toFixed(0)}KB), may fail API call`,
    );
  }
  return base64Data;
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
    issues: ["Mock data - API not configured"],
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
  imageData: string,
): Promise<ExtractedReceiptData> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Use mock scan if API key is not configured (like old app)
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set, returning mock data");
    return mockScan();
  }

  // Use known valid model name
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const prompt = [
    "Analyze this retail receipt image and respond with valid JSON only.",
    "Target locale: Indonesian retail receipts unless the document clearly indicates otherwise.",
    "Extract a summary only, not itemized products.",
    "Return this JSON shape exactly:",
    "{",
    '  "amount": "0.00",',
    '  "currency": "IDR",',
    '  "category": "Food | Transport | Shopping | Utilities | Health | Entertainment | Household | Bills | Other",',
    '  "description": "short summary up to 120 chars",',
    '  "merchant": "store/merchant name if visible, or empty string",',
    '  "confidence": 0.0,',
    '  "issues": ["array of short uncertainty notes"]',
    '  "date": "YYYY-MM-DD"',
    "}",
    "If a field is missing, use safe defaults rather than inventing detailed facts.",
    "Locale hint: Indonesian.",
  ].join("\n");

  // Extract base64 data from data URL (format: data:image/jpeg;base64,<data>)
  let base64Data: string;
  let mediaType = "image/jpeg";

  if (imageData.includes(",")) {
    const parts = imageData.split(",", 2);
    if (parts.length === 2) {
      base64Data = parts[1];
      // Extract mime type from the data URL prefix
      const mimeMatch = parts[0].match(/image\/[a-z+]+/);
      if (mimeMatch) {
        mediaType = mimeMatch[0];
      }
    } else {
      base64Data = imageData;
    }
  } else {
    base64Data = imageData;
  }

  console.log(
    "[Gemini Scan] base64 length:",
    base64Data.length,
    "mime type:",
    mediaType,
    "model:",
    model,
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
              {
                text: prompt,
              },
              {
                inline_data: {
                  mime_type: mediaType,
                  data: base64Data,
                },
              },
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

    // Extract text from Gemini response using helper function
    const rawText = extractResponseText(payload);

    if (!rawText) {
      console.error("[Gemini API] Empty response text");
      return mockScan();
    }

    console.log("[Gemini API] Raw response length:", rawText.length);

    // Parse JSON using helper function
    const parsed = parseJsonPayload(rawText);

    // Normalize the extracted data
    const amount = normalizeAmount(parsed.amount);
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
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;
    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.map((i: string) => String(i)).filter(Boolean)
      : [];

    console.log("[Gemini Scan] Extracted:", {
      amount,
      currency,
      category,
      description,
      merchant,
      date,
      confidence,
      issues,
    });

    return {
      amount: amount.toFixed(2),
      currency,
      category,
      description,
      merchant,
      date,
      confidence,
      issues,
    };
  } catch (error: any) {
    console.error("[Gemini API] Exception:", error.message);
    return mockScan();
  }
}
