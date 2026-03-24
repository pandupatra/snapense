"use client";

import { useState, useRef, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { BillEntryDialog } from "@/components/bill-entry-dialog";
import { SignInButton, UserButton, useUser } from "@/components/auth-components";
import { getCategoryIcon, CATEGORY_ICONS, type Category } from "@/components/category-icons";
import { getBills, createBill, updateBill, deleteBill, getTotalExpenses, importBillsFromCSV, searchBills, type BillFormData } from "@/app/actions/bills";
import { Bill, COMMON_CURRENCIES } from "@/types/bill";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Camera,
  Upload,
  Download,
  FileText,
  Search,
  Sun,
  Moon,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

function getCurrencySymbol(currency: string): string {
  const currencyObj = COMMON_CURRENCIES.find((c) => c.code === currency);
  return currencyObj?.symbol || "Rp";
}

function formatCurrency(amount: number, currency: string): string {
  const hasDecimals = amount % 1 !== 0;
  const parts = hasDecimals ? amount.toFixed(2).split(".") : [amount.toString()];
  const integerPart = parseInt(parts[0]).toLocaleString("id-ID");
  if (hasDecimals) {
    return `${integerPart},${parts[1]}`;
  }
  return integerPart;
}

function formatCurrencyIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("Rp", "Rp");
}

function formatDate(dateStr: string | Date) {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface DailySpending {
  day: string;
  amount: number;
}

// Generate chart data from bills
function generateChartData(bills: Bill[]): DailySpending[] {
  // Group bills by date and sum amounts
  const dailyTotals = new Map<string, number>();

  bills.forEach((bill) => {
    const dateKey = format(new Date(bill.transactionDate), "MMM d");
    const current = dailyTotals.get(dateKey) || 0;
    dailyTotals.set(dateKey, current + bill.amount);
  });

  // Convert to array and sort by date
  const sortedData = Array.from(dailyTotals.entries())
    .map(([day, amount]) => ({ day, amount }))
    .sort((a, b) => {
      const dateA = new Date(a.day + ", 2024");
      const dateB = new Date(b.day + ", 2024");
      return dateA.getTime() - dateB.getTime();
    });

  return sortedData;
}

function HomeWrapper() {
  const searchParams = useSearchParams();
  const { user, isLoading } = useUser();
  const [bills, setBills] = useState<Bill[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
  const [formMode, setFormMode] = useState<"manual" | "photo" | "upload">(
    "manual"
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isExportingToSheets, setIsExportingToSheets] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(
    null
  );
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Handle Google OAuth callback
  useEffect(() => {
    const accessToken = searchParams.get("google_access_token");
    const authError = searchParams.get("google_auth_error");

    if (authError) {
      console.error("Google auth error:", authError);
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (accessToken) {
      setGoogleAccessToken(accessToken);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  const fetchBills = useCallback(async (query?: string) => {
    setIsLoadingBills(true);
    setIsInitialized(false);
    try {
      const [billsData, total] = await Promise.all([
        query && query.trim()
          ? searchBills(query.trim(), 1, 20)
          : getBills(1, 20),
        getTotalExpenses(),
      ]);
      setBills(billsData.bills);
      setTotalAmount(total);
      setHasMore(billsData.hasMore);
      setPage(1);
      setIsInitialized(true);
    } catch (error) {
      console.error("[fetchBills] Error:", error);
    } finally {
      setIsLoadingBills(false);
    }
  }, []);

  const fetchMoreBills = useCallback(async () => {
    if (isLoadingMore || !hasMore || !isInitialized) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const billsData = searchQuery.trim()
        ? await searchBills(searchQuery.trim(), nextPage, 20)
        : await getBills(nextPage, 20);
      setBills((prev) => [...prev, ...billsData.bills]);
      setHasMore(billsData.hasMore);
      setPage(nextPage);
    } catch (error) {
      console.error("Error fetching more bills:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, hasMore, isLoadingMore, isInitialized, searchQuery]);

  // Fetch bills when user is loaded
  useEffect(() => {
    if (user) {
      fetchBills();
    }
  }, [user, fetchBills]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !isLoadingBills &&
          isInitialized
        ) {
          fetchMoreBills();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoadingMore, isLoadingBills, isInitialized, fetchMoreBills]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch bills when debounced query changes
  useEffect(() => {
    if (isInitialized) {
      const performSearch = async () => {
        setIsLoadingBills(true);
        try {
          const query = debouncedQuery.trim();
          const billsData = query
            ? await searchBills(query, 1, 20)
            : await getBills(1, 20);
          setBills(billsData.bills);
          setHasMore(billsData.hasMore);
          setPage(1);
        } catch (error) {
          console.error("Error searching bills:", error);
        } finally {
          setIsLoadingBills(false);
        }
      };
      performSearch();
    }
  }, [debouncedQuery, isInitialized]);

  // Generate chart data
  const chartData = useMemo(() => generateChartData(bills), [bills]);

  // Find max value for chart peak display
  const maxChartValue = useMemo(() => {
    if (chartData.length === 0) return { amount: 0, day: "" };
    const max = chartData.reduce((max, curr) =>
      curr.amount > max.amount ? curr : max
    );
    return max;
  }, [chartData]);

  // Calculate current month's expenses
  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return bills
      .filter((bill) => {
        const billDate = new Date(bill.transactionDate);
        return (
          billDate.getMonth() === currentMonth &&
          billDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, bill) => sum + bill.amount, 0);
  }, [bills]);

  // Get current month name
  const currentMonthName = new Date().toLocaleString("default", {
    month: "long",
  });

  const handleSaveBill = async (data: BillFormData) => {
    let result;
    if (editingBillId) {
      result = await updateBill(editingBillId, data);
    } else {
      result = await createBill(data);
    }
    if (result) {
      await fetchBills(debouncedQuery);
      setIsFormOpen(false);
      setSelectedImage(null);
      setEditingBillId(null);
    }
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setSelectedImage(null);
    setEditingBillId(null);
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBillId(bill.id);
    setFormMode("manual");
    setSelectedImage(null);
    setIsFormOpen(true);
  };

  const handleDeleteBill = async (id: string) => {
    const success = await deleteBill(id);
    if (success) {
      await fetchBills(debouncedQuery);
    } else {
      alert("Failed to delete bill");
    }
    setDeleteConfirmId(null);
  };

  const handleManualEntry = () => {
    setFormMode("manual");
    setSelectedImage(null);
    setIsFormOpen(true);
  };

  const handlePhotoMode = () => {
    setFormMode("photo");
    setSelectedImage(null);
    setIsFormOpen(true);
  };

  const handleUploadPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setFormMode("upload");
        setIsFormOpen(true);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Amount", "Currency", "Category", "Merchant", "Description"];
    const rows = bills.map((bill) => [
      format(new Date(bill.transactionDate), "yyyy-MM-dd"),
      bill.amount.toString(),
      bill.currency,
      bill.category,
      bill.merchant || "",
      bill.description || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bills-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const result = await importBillsFromCSV(text);

      if (result.imported.length > 0) {
        await fetchBills();
      }

      setImportResult({ success: result.success, errors: result.errors });
      setIsImportOpen(true);
    } catch (error) {
      setImportResult({ success: 0, errors: ["Failed to read file"] });
      setIsImportOpen(true);
    } finally {
      setIsImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  const handleExportToSheets = async () => {
    if (!googleAccessToken) {
      try {
        const response = await fetch("/api/auth/google");
        const data = await response.json();

        if (data.authUrl) {
          window.location.href = data.authUrl;
          return;
        }

        if (data.error) {
          alert(data.error);
        }
      } catch (error) {
        console.error("Failed to get Google auth URL:", error);
        alert(
          "Failed to connect to Google. Please make sure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set."
        );
      }
      return;
    }

    setIsExportingToSheets(true);
    try {
      const response = await fetch("/api/export/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: googleAccessToken }),
      });

      const data = await response.json();

      if (data.success) {
        window.open(data.spreadsheetUrl, "_blank");
      } else {
        alert(data.error || "Failed to export to Google Sheets");
      }
    } catch (error) {
      console.error("Export to Sheets error:", error);
      alert("Failed to export to Google Sheets");
    } finally {
      setIsExportingToSheets(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <main
        className={cn(
          "min-h-screen transition-colors duration-300 font-sans",
          isDarkMode ? "bg-[#0f1115] text-white" : "bg-gray-50 text-gray-900"
        )}
      >
        <div className="flex items-center justify-center h-screen">
          <div className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
            Loading...
          </div>
        </div>
      </main>
    );
  }

  // Show sign-in page if not authenticated
  if (!user) {
    return (
      <main
        className={cn(
          "min-h-screen transition-colors duration-300 font-sans",
          isDarkMode ? "bg-[#0f1115] text-white" : "bg-gray-50 text-gray-900"
        )}
      >
        <div className="max-w-6xl mx-auto px-6 py-8">
          <header className="flex justify-end mb-8">
            <ThemeToggle />
          </header>

          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Bill Tracker
            </h1>
            <p
              className={cn(
                "mb-12 text-center",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              Minimalist expense tracking powered by AI
            </p>
            <SignInButton />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className={cn(
        "min-h-screen transition-colors duration-300 font-sans",
        isDarkMode ? "bg-[#0f1115] text-white" : "bg-gray-50 text-gray-900"
      )}
    >
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Bill Tracker
            </h1>
            <p
              className={cn(
                "text-sm mt-1",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              Track your expenses effortlessly
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                isDarkMode
                  ? "border-gray-700 hover:bg-gray-800 text-gray-300"
                  : "border-gray-200 hover:bg-gray-100 text-gray-700"
              )}
              onClick={handleImportClick}
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>

            {/* Export Dropdown */}
            <DropdownMenu
              trigger={
                <button
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                    isDarkMode
                      ? "border-gray-700 hover:bg-gray-800 text-gray-300"
                      : "border-gray-200 hover:bg-gray-100 text-gray-700"
                  )}
                >
                  <Download className="w-4 h-4" />
                  Export
                  <ChevronDown className="w-3 h-3" />
                </button>
              }
            >
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileText className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportToSheets}
                disabled={isExportingToSheets}
              >
                <FileText className="mr-2 h-4 w-4" />
                {isExportingToSheets ? "Exporting..." : "Export to Google Sheets"}
              </DropdownMenuItem>
            </DropdownMenu>

            <div
              className={cn(
                "flex items-center gap-3 ml-4 pl-4 border-l",
                isDarkMode ? "border-gray-700" : "border-gray-200"
              )}
            >
              <div className="flex items-center gap-2">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || "User"}
                    className="w-8 h-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      isDarkMode
                        ? "bg-cyan-900/30 text-cyan-400"
                        : "bg-gray-200 text-gray-600"
                    )}
                  >
                    {(user.name || user.email)?.[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium hidden sm:inline">
                  {user.name || user.email}
                </span>
              </div>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isDarkMode
                    ? "bg-gray-800 text-yellow-400"
                    : "bg-gray-200 text-gray-700"
                )}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Summary Card with Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-2xl p-8 mb-10 relative overflow-hidden border",
            isDarkMode
              ? "bg-[#1a1d24] border-gray-800"
              : "bg-white border-gray-200 shadow-sm"
          )}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-1 space-y-6">
              <div>
                <span
                  className={cn(
                    "inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4",
                    isDarkMode
                      ? "bg-gray-800 text-gray-400"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  Total Expenses
                </span>
                <h2 className="text-5xl font-bold tracking-tighter mb-2">
                  {getCurrencySymbol(bills[0]?.currency || "IDR")}
                  {formatCurrency(totalAmount, bills[0]?.currency || "IDR")}
                </h2>
              </div>

              <div>
                <span
                  className={cn(
                    "inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4",
                    isDarkMode
                      ? "bg-cyan-950/30 text-cyan-400 border border-cyan-500/20"
                      : "bg-cyan-50 text-cyan-600 border border-cyan-200"
                  )}
                >
                  {currentMonthName} Expenses
                </span>
                <h2 className="text-3xl font-bold tracking-tighter mb-2 text-cyan-400">
                  {getCurrencySymbol(bills[0]?.currency || "IDR")}
                  {formatCurrency(currentMonthExpenses, bills[0]?.currency || "IDR")}
                </h2>
              </div>
            </div>

            {chartData.length > 0 && (
              <div className="lg:col-span-2 h-[200px] relative">
                {/* Tooltip Simulation */}
                {maxChartValue.amount > 0 && (
                  <div className="absolute top-0 right-1/4 z-10 bg-cyan-950/80 border border-cyan-500/30 backdrop-blur-md rounded-lg px-3 py-1.5 text-[10px] text-cyan-100 flex items-center gap-2 shadow-lg shadow-cyan-950/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>
                      Current Peak:{" "}
                      <span className="font-bold">
                        {formatCurrencyIDR(maxChartValue.amount)}
                      </span>{" "}
                      on {maxChartValue.day}
                    </span>
                  </div>
                )}

                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorSpending"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#22d3ee"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#22d3ee"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 10,
                        fill: isDarkMode ? "#6b7280" : "#9ca3af",
                      }}
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#1a1d24" : "#fff",
                        borderColor: isDarkMode ? "#374151" : "#e5e7eb",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      itemStyle={{ color: "#22d3ee" }}
                      formatter={(value: any) => [
                        formatCurrencyIDR(Number(value) || 0),
                        "Amount",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#22d3ee"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorSpending)"
                      dot={{
                        r: 4,
                        fill: "#22d3ee",
                        strokeWidth: 2,
                        stroke: isDarkMode ? "#1a1d24" : "#fff",
                      }}
                      activeDot={{ r: 6, fill: "#22d3ee" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-gray-500 font-medium tracking-widest">
                  SPENDING
                </div>
                <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 text-[10px] text-gray-500 font-medium tracking-widest">
                  DAYS
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Bills Section */}
        <section>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="text-xl font-bold">Recent Bills</h3>

            <div className="flex items-center gap-2">
              <button
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                  isDarkMode
                    ? "border-gray-700 hover:bg-gray-800 text-gray-300"
                    : "border-gray-200 hover:bg-gray-100 text-gray-700"
                )}
                onClick={handleManualEntry}
              >
                <Plus className="w-4 h-4" />
                Manual Entry
              </button>
              <button
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                  isDarkMode
                    ? "border-gray-700 hover:bg-gray-800 text-gray-300"
                    : "border-gray-200 hover:bg-gray-100 text-gray-700"
                )}
                onClick={handlePhotoMode}
              >
                <Camera className="w-4 h-4" />
                Photo Mode
              </button>
              <button
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-all border-none"
                )}
                onClick={handleUploadPhoto}
              >
                <Upload className="w-4 h-4" />
                Upload Bill
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4 relative">
            <div className="relative">
              <Search
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                  isDarkMode ? "text-gray-500" : "text-gray-400"
                )}
              />
              <Input
                type="text"
                placeholder="Search by merchant, description, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-10",
                  isDarkMode
                    ? "bg-[#1a1d24] border-gray-700 text-white placeholder:text-gray-500"
                    : "bg-white border-gray-200"
                )}
              />
              {searchQuery && (
                <button
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center",
                    isDarkMode
                      ? "hover:bg-gray-700 text-gray-400"
                      : "hover:bg-gray-200 text-gray-500"
                  )}
                  onClick={() => setSearchQuery("")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div
            className={cn(
              "rounded-xl overflow-hidden border",
              isDarkMode
                ? "border-gray-800 bg-[#1a1d24]"
                : "border-gray-200 bg-white shadow-sm"
            )}
          >
            {isLoadingBills ? (
              <div className="text-center py-8 text-gray-500">
                Loading bills...
              </div>
            ) : bills.length === 0 ? (
              <div className="text-center py-12">
                <p
                  className={cn(
                    "mb-4",
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  )}
                >
                  No bills yet. Add your first bill to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className={cn(
                        "text-[11px] uppercase tracking-wider font-semibold",
                        isDarkMode
                          ? "text-gray-500 bg-gray-900/50"
                          : "text-gray-400 bg-gray-50"
                      )}
                    >
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Merchant</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody
                    className={cn(
                      "divide-y",
                      isDarkMode ? "divide-gray-800/50" : "divide-gray-100"
                    )}
                  >
                    <AnimatePresence mode="popLayout">
                      {bills.map((bill, index) => (
                        <motion.tr
                          key={bill.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "group transition-colors",
                            isDarkMode
                              ? "hover:bg-gray-800/30"
                              : "hover:bg-gray-50"
                          )}
                        >
                          <td className="px-6 py-5 text-sm font-medium">
                            {formatDate(bill.transactionDate)}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "p-1.5 rounded-md",
                                  isDarkMode
                                    ? "bg-cyan-950/30"
                                    : "bg-cyan-50"
                                )}
                              >
                                {getCategoryIcon(bill.category as Category)}
                              </div>
                              <span className="text-sm">{bill.category}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-sm font-medium">
                            {bill.merchant || "-"}
                          </td>
                          <td
                            className={cn(
                              "px-6 py-5 text-sm max-w-xs truncate",
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            )}
                          >
                            {bill.description || "-"}
                          </td>
                          <td className="px-6 py-5 text-sm font-bold text-right">
                            {getCurrencySymbol(bill.currency)}
                            {formatCurrency(bill.amount, bill.currency)}
                          </td>
                          <td className="px-6 py-5">
                            <DropdownMenu
                              trigger={
                                <button
                                  className={cn(
                                    "h-8 w-8 rounded flex items-center justify-center",
                                    isDarkMode
                                      ? "hover:bg-gray-700 text-gray-500"
                                      : "hover:bg-gray-100 text-gray-400"
                                  )}
                                >
                                  <svg
                                    className="h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                    />
                                  </svg>
                                </button>
                              }
                            >
                              <DropdownMenuItem onClick={() => handleEditBill(bill)}>
                                <svg
                                  className="mr-2 h-4 w-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirmId(bill.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              >
                                <svg
                                  className="mr-2 h-4 w-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenu>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                {/* Infinite scroll trigger */}
                {hasMore && (
                  <div ref={loadMoreRef} className="py-4 text-center">
                    {isLoadingMore && (
                      <div
                        className={cn(
                          "text-sm",
                          isDarkMode ? "text-gray-500" : "text-gray-400"
                        )}
                      >
                        Loading more bills...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Hidden import file input */}
      <input
        ref={importInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleImportFileSelect}
      />

      {/* Bill Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent
          className={isDarkMode ? "bg-[#1a1d24] border-gray-800" : ""}
        >
          <DialogHeader>
            <DialogTitle>
              {editingBillId
                ? "Edit Bill"
                : formMode === "manual"
                ? "Manual Entry"
                : formMode === "photo"
                ? "Photo Mode"
                : "Upload Photo"}
            </DialogTitle>
          </DialogHeader>
          <BillEntryDialog
            mode={formMode}
            image={selectedImage}
            onSave={handleSaveBill}
            onCancel={handleCancelForm}
            initialData={(() => {
              if (!editingBillId) return undefined;
              const bill = bills.find((b) => b.id === editingBillId);
              if (!bill) return undefined;
              return {
                amount: bill.amount.toString(),
                currency: bill.currency,
                category: bill.category,
                description: bill.description || "",
                merchant: bill.merchant || "",
                date: new Date(bill.transactionDate)
                  .toISOString()
                  .split("T")[0],
              };
            })()}
          />
        </DialogContent>
      </Dialog>

      {/* Import Result Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent
          className={isDarkMode ? "bg-[#1a1d24] border-gray-800" : ""}
        >
          <DialogHeader>
            <DialogTitle>Import Results</DialogTitle>
          </DialogHeader>
          {importResult && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-3xl font-light">{importResult.success}</p>
                <p
                  className={cn(
                    "text-sm",
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  )}
                >
                  bills imported
                </p>
              </div>
              {importResult.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Errors:</p>
                  <div
                    className={cn(
                      "max-h-40 overflow-y-auto text-sm space-y-1",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}
                  >
                    {importResult.errors.slice(0, 10).map((error, idx) => (
                      <p key={idx}>{error}</p>
                    ))}
                    {importResult.errors.length > 10 && (
                      <p>
                        ...and {importResult.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsImportOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent
          className={isDarkMode ? "bg-[#1a1d24] border-gray-800" : ""}
        >
          <DialogHeader>
            <DialogTitle>Delete Bill</DialogTitle>
          </DialogHeader>
          <p
            className={cn(
              "text-sm",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}
          >
            Are you sure you want to delete this bill? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
              onClick={() =>
                deleteConfirmId && handleDeleteBill(deleteConfirmId)
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// Wrapper to handle useSearchParams in client component
export default function Home() {
  return (
    <Suspense
      fallback={
        <div
          className={cn(
            "min-h-screen transition-colors duration-300 font-sans flex items-center justify-center",
            "bg-[#0f1115] text-white"
          )}
        >
          <div className="text-gray-400">Loading...</div>
        </div>
      }
    >
      <HomeWrapper />
    </Suspense>
  );
}
