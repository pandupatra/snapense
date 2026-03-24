"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BillFormData, CATEGORIES, COMMON_CURRENCIES } from "@/types/bill";
import { extractReceiptData, type ExtractedReceiptData } from "@/app/actions/bills";

interface BillEntryDialogProps {
  mode: "manual" | "photo" | "upload";
  image: string | null;
  onSave: (data: BillFormData) => void;
  onCancel: () => void;
  initialData?: BillFormData;
}

export function BillEntryDialog({ mode, image, onSave, onCancel, initialData }: BillEntryDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(image);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const processedImageRef = useRef<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);

  const [formData, setFormData] = useState<BillFormData>(
    initialData || {
      amount: "",
      currency: "IDR",
      category: "Other",
      description: "",
      merchant: "",
      date: new Date().toISOString().split("T")[0],
    }
  );

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Start camera when in photo mode
  useEffect(() => {
    if (mode === "photo" && !capturedImage) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode, capturedImage]);

  // Set capturedImage from image prop (for upload mode)
  useEffect(() => {
    if (image && image !== capturedImage) {
      setCapturedImage(image);
    }
  }, [image]);

  // Process image with AI when capturedImage is set (runs once per new image)
  useEffect(() => {
    // Only process if we have a new image that hasn't been processed yet
    if (capturedImage && capturedImage !== processedImageRef.current && !isProcessing) {
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
      // Fallback: use file input
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
        // processImage will be called by useEffect when capturedImage changes
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    processedImageRef.current = null;
    setExtractedData(null);
    setFormData({
      amount: "",
      currency: "IDR",
      category: "Other",
      description: "",
      merchant: "",
      date: new Date().toISOString().split("T")[0],
    });
    startCamera();
  };

  // Compress image to reduce size before sending to API
  const compressImage = async (dataUrl: string, maxSizeKB = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 2048;

        // Scale down if too large
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
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Try compressing with different quality levels
        let quality = 0.85;
        let result = canvas.toDataURL('image/jpeg', quality);

        // Keep reducing quality until under size limit or quality is too low
        while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.5) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        console.log(`Image compressed: ${(result.length * 0.75 / 1024).toFixed(0)}KB`);
        resolve(result);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
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
        // processImage will be called by useEffect when capturedImage changes
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    try {
      // Compress image before sending to API (max 1MB)
      const compressedImage = await compressImage(imageData, 1024);
      // Call server action to extract receipt data
      const extracted = await extractReceiptData(compressedImage);
      console.log("Extracted receipt data:", extracted);
      setExtractedData(extracted);
      setFormData({
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Show camera preview in photo mode
  if (mode === "photo" && !capturedImage) {
    return (
      <div className="space-y-4">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
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
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={capturePhoto}
          >
            Capture
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
  if ((mode === "photo" || mode === "upload") && capturedImage && isProcessing) {
    return (
      <div className="space-y-4 py-4">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <img
            src={capturedImage}
            alt="Captured receipt"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            <span className="text-sm">Processing receipt with AI...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show form (manual or after image capture)
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Show image preview if available */}
      {capturedImage && (
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
              Retake
            </Button>
          )}
        </div>
      )}

      {/* Show confidence and issues if available */}
      {extractedData && (capturedImage || mode === "upload") && (
        <div className={`rounded-lg p-3 mb-4 ${
          extractedData.confidence >= 80
            ? "bg-green-500/10 border border-green-500/20"
            : extractedData.confidence >= 50
            ? "bg-yellow-500/10 border border-yellow-500/20"
            : "bg-red-500/10 border border-red-500/20"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">AI Confidence</span>
            <span className={`text-sm font-bold ${
              extractedData.confidence >= 80
                ? "text-green-600 dark:text-green-400"
                : extractedData.confidence >= 50
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-red-600 dark:text-red-400"
            }`}>
              {extractedData.confidence}%
            </span>
          </div>
          {extractedData.issues && extractedData.issues.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Notes:</span>
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
        <Label htmlFor="amount">Amount</Label>
        <div className="flex gap-2">
          <Select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
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
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            className="flex-1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="merchant">Merchant</Label>
        <Input
          id="merchant"
          type="text"
          placeholder="Store or merchant name"
          value={formData.merchant}
          onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What was this expense for?"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          Save Bill
        </Button>
      </div>
    </form>
  );
}
