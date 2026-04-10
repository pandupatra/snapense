"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BillFormData,
  CATEGORIES,
  COMMON_CURRENCIES,
  CATEGORY_NAMES_ID,
  INCOME_CATEGORIES,
  INCOME_CATEGORY_NAMES_ID,
  type Category,
  type IncomeCategory,
  type IncomeFormData,
} from "@/types/bill";
import {
  extractReceiptData,
  type ExtractedReceiptData,
} from "@/app/actions/bills";
import { useI18n } from "@/lib/i18n";

export type TransactionType = "expense" | "income";

interface BillEntryDialogProps {
  mode: "manual" | "photo" | "upload";
  image: string | null;
  onSaveExpense: (data: BillFormData) => void;
  onSaveIncome: (data: IncomeFormData) => void;
  onCancel: () => void;
  initialData?: BillFormData;
  initialIncomeData?: IncomeFormData;
  initialType?: TransactionType;
}

export function BillEntryDialog({
  mode,
  image,
  onSaveExpense,
  onSaveIncome,
  onCancel,
  initialData,
  initialIncomeData,
  initialType = "expense",
}: BillEntryDialogProps) {
  const { locale, t } = useI18n();
  const [transactionType, setTransactionType] =
    useState<TransactionType>(initialType);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(image);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const processedImageRef = useRef<string | null>(null);
  const [extractedData, setExtractedData] =
    useState<ExtractedReceiptData | null>(null);

  const [expenseForm, setExpenseForm] = useState<BillFormData>(
    initialData || {
      amount: "",
      currency: "IDR",
      category: "Other",
      description: "",
      merchant: "",
      date: new Date().toISOString().split("T")[0],
    },
  );

  const [incomeForm, setIncomeForm] = useState<IncomeFormData>(
    initialIncomeData || {
      amount: "",
      currency: "IDR",
      category: "Other",
      description: "",
      source: "",
      date: new Date().toISOString().split("T")[0],
    },
  );

  // Update forms when initial data changes
  useEffect(() => {
    if (initialData) setExpenseForm(initialData);
  }, [initialData]);

  useEffect(() => {
    if (initialIncomeData) setIncomeForm(initialIncomeData);
  }, [initialIncomeData]);

  // Start camera when in photo mode
  useEffect(() => {
    if (mode === "photo" && !capturedImage && transactionType === "expense") {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode, capturedImage, transactionType]);

  // Set capturedImage from image prop (for upload mode)
  useEffect(() => {
    if (image && image !== capturedImage) {
      setCapturedImage(image);
    }
  }, [image]);

  // Process image with AI when capturedImage is set (runs once per new image)
  useEffect(() => {
    if (
      capturedImage &&
      capturedImage !== processedImageRef.current &&
      !isProcessing
    ) {
      processedImageRef.current = capturedImage;
      processImage(capturedImage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedImage]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.85);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    processedImageRef.current = null;
    setExtractedData(null);
    setExpenseForm({
      amount: "",
      currency: "IDR",
      category: "Other",
      description: "",
      merchant: "",
      date: new Date().toISOString().split("T")[0],
    });
    startCamera();
  };

  const compressImage = async (
    dataUrl: string,
    maxSizeKB = 1024,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDimension = 2048;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        let result = canvas.toDataURL("image/jpeg", quality);

        while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.5) {
          quality -= 0.1;
          result = canvas.toDataURL("image/jpeg", quality);
        }

        console.log(
          `Image compressed: ${((result.length * 0.75) / 1024).toFixed(0)}KB`,
        );
        resolve(result);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = dataUrl;
    });
  };

  const handleCameraFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setCapturedImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    try {
      const compressedImage = await compressImage(imageData, 1024);
      const extracted = await extractReceiptData(compressedImage);
      console.log("Extracted receipt data:", extracted);
      setExtractedData(extracted);
      setExpenseForm({
        amount: extracted.amount,
        currency: extracted.currency,
        category: extracted.category,
        description: extracted.description,
        merchant: extracted.merchant,
        date: extracted.date,
      });
    } catch (error) {
      console.error("Error processing image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTypeChange = (type: TransactionType) => {
    setTransactionType(type);
    // Reset forms when switching type
    if (type === "expense") {
      setExpenseForm({
        amount: "",
        currency: "IDR",
        category: "Other",
        description: "",
        merchant: "",
        date: new Date().toISOString().split("T")[0],
      });
    } else {
      setIncomeForm({
        amount: "",
        currency: "IDR",
        category: "Other",
        description: "",
        source: "",
        date: new Date().toISOString().split("T")[0],
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transactionType === "expense") {
      onSaveExpense(expenseForm);
    } else {
      onSaveIncome(incomeForm);
    }
  };

  // Show camera preview in photo mode (expense only)
  if (mode === "photo" && !capturedImage && transactionType === "expense") {
    return (
      <div className="space-y-4">
        {/* Type toggle */}
        <TypeToggle
          type={transactionType}
          onChange={handleTypeChange}
          isDark={document.documentElement.classList.contains("dark")}
        />

        <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            {t.common.cancel}
          </Button>
          <Button type="button" className="flex-1" onClick={capturePhoto}>
            {t.form.capture}
          </Button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraFileSelect}
        />
      </div>
    );
  }

  // Show captured/uploaded image preview with processing
  if (
    (mode === "photo" || mode === "upload") &&
    capturedImage &&
    isProcessing
  ) {
    return (
      <div className="space-y-4 py-4">
        <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
          <img
            src={capturedImage}
            alt="Captured receipt"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            <span className="text-sm">{t.form.processingReceipt}</span>
          </div>
        </div>
      </div>
    );
  }

  // Show form (manual or after image capture)
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle */}
      <TypeToggle
        type={transactionType}
        onChange={handleTypeChange}
        isDark={document.documentElement.classList.contains("dark")}
      />

      {/* Show image preview if available (expense only) */}
      {capturedImage && transactionType === "expense" && (
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden mb-4">
          <img
            src={capturedImage}
            alt="Receipt"
            className="w-full h-full object-cover"
          />
          {mode === "photo" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="absolute bottom-2 left-2"
              onClick={retakePhoto}
            >
              {t.form.retake}
            </Button>
          )}
        </div>
      )}

      {/* Show confidence and issues if available (expense only) */}
      {extractedData &&
        (capturedImage || mode === "upload") &&
        transactionType === "expense" && (
          <div
            className={`rounded-lg p-3 mb-4 ${
              extractedData.confidence >= 80
                ? "bg-green-500/10 border border-green-500/20"
                : extractedData.confidence >= 50
                  ? "bg-yellow-500/10 border border-yellow-500/20"
                  : "bg-red-500/10 border border-red-500/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t.form.aiConfidence}</span>
              <span
                className={`text-sm font-bold ${
                  extractedData.confidence >= 80
                    ? "text-green-600 dark:text-green-400"
                    : extractedData.confidence >= 50
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {extractedData.confidence}%
              </span>
            </div>
            {extractedData.issues && extractedData.issues.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">{t.form.notes}:</span>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {extractedData.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

      <div className="space-y-2">
        <Label htmlFor="amount">{t.form.amount}</Label>
        <div className="flex gap-2">
          <Select
            value={
              transactionType === "expense"
                ? expenseForm.currency
                : incomeForm.currency
            }
            onChange={(e) => {
              if (transactionType === "expense") {
                setExpenseForm({ ...expenseForm, currency: e.target.value });
              } else {
                setIncomeForm({ ...incomeForm, currency: e.target.value });
              }
            }}
            className="w-24"
          >
            {COMMON_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </Select>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={
              transactionType === "expense"
                ? expenseForm.amount
                : incomeForm.amount
            }
            onChange={(e) => {
              if (transactionType === "expense") {
                setExpenseForm({ ...expenseForm, amount: e.target.value });
              } else {
                setIncomeForm({ ...incomeForm, amount: e.target.value });
              }
            }}
            required
            className="flex-1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">{t.form.category}</Label>
        <Select
          id="category"
          value={
            transactionType === "expense"
              ? expenseForm.category
              : incomeForm.category
          }
          onChange={(e) => {
            if (transactionType === "expense") {
              setExpenseForm({
                ...expenseForm,
                category: e.target.value as Category,
              });
            } else {
              setIncomeForm({
                ...incomeForm,
                category: e.target.value as IncomeCategory,
              });
            }
          }}
        >
          {transactionType === "expense"
            ? CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {locale === "id" ? CATEGORY_NAMES_ID[cat] : cat}
                </option>
              ))
            : INCOME_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {locale === "id" ? INCOME_CATEGORY_NAMES_ID[cat] : cat}
                </option>
              ))}
        </Select>
      </div>

      {/* Merchant (expense) or Source (income) */}
      <div className="space-y-2">
        <Label htmlFor={transactionType === "expense" ? "merchant" : "source"}>
          {transactionType === "expense" ? t.form.merchant : t.form.source}
        </Label>
        <Input
          id={transactionType === "expense" ? "merchant" : "source"}
          type="text"
          placeholder={
            transactionType === "expense"
              ? t.form.merchantPlaceholder
              : t.form.sourcePlaceholder
          }
          value={
            transactionType === "expense"
              ? expenseForm.merchant
              : incomeForm.source
          }
          onChange={(e) => {
            if (transactionType === "expense") {
              setExpenseForm({ ...expenseForm, merchant: e.target.value });
            } else {
              setIncomeForm({ ...incomeForm, source: e.target.value });
            }
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t.form.description}</Label>
        <Textarea
          id="description"
          placeholder={
            transactionType === "expense"
              ? t.form.descriptionPlaceholder
              : t.form.incomeDescriptionPlaceholder
          }
          value={
            transactionType === "expense"
              ? expenseForm.description
              : incomeForm.description
          }
          onChange={(e) => {
            if (transactionType === "expense") {
              setExpenseForm({ ...expenseForm, description: e.target.value });
            } else {
              setIncomeForm({ ...incomeForm, description: e.target.value });
            }
          }}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">{t.form.date}</Label>
        <Input
          id="date"
          type="date"
          value={
            transactionType === "expense" ? expenseForm.date : incomeForm.date
          }
          onChange={(e) => {
            if (transactionType === "expense") {
              setExpenseForm({ ...expenseForm, date: e.target.value });
            } else {
              setIncomeForm({ ...incomeForm, date: e.target.value });
            }
          }}
          required
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
        >
          {t.common.cancel}
        </Button>
        <Button type="submit" className="flex-1">
          {transactionType === "expense" ? t.form.saveBill : t.form.saveIncome}
        </Button>
      </div>
    </form>
  );
}

// Toggle component for Expense/Income
function TypeToggle({
  type,
  onChange,
  isDark,
}: {
  type: TransactionType;
  onChange: (t: TransactionType) => void;
  isDark: boolean;
}) {
  return (
    <div
      className={`flex rounded-lg p-1 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
    >
      <button
        type="button"
        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
          type === "expense"
            ? isDark
              ? "bg-gray-700 text-white shadow-sm"
              : "bg-white text-gray-900 shadow-sm"
            : isDark
              ? "text-gray-400 hover:text-gray-200"
              : "text-gray-500 hover:text-gray-700"
        }`}
        onClick={() => onChange("expense")}
      >
        Expense
      </button>
      <button
        type="button"
        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
          type === "income"
            ? isDark
              ? "bg-emerald-900/50 text-emerald-400 shadow-sm"
              : "bg-emerald-50 text-emerald-600 shadow-sm"
            : isDark
              ? "text-gray-400 hover:text-gray-200"
              : "text-gray-500 hover:text-gray-700"
        }`}
        onClick={() => onChange("income")}
      >
        Income
      </button>
    </div>
  );
}
