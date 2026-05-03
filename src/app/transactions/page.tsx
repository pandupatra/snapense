"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  Suspense,
} from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  BillEntryDialog,
  type TransactionType,
} from "@/components/bill-entry-dialog";
import {
  SignInButton,
  useUser,
  authClient,
} from "@/components/auth-components";
import {
  getCategoryIcon,
  getIncomeCategoryIcon,
  type Category,
  type IncomeCategory,
} from "@/components/category-icons";
import {
  createBill,
  updateBill,
  deleteBill,
  type BillFormData,
} from "@/app/actions/bills";
import {
  createIncome,
  updateIncome,
  deleteIncome,
  type IncomeFormData,
} from "@/app/actions/incomes";
import {
  getAllTimeSummary,
  getFilteredTransactions,
  type FinancialSummary,
} from "@/app/actions/transactions";
import {
  Bill,
  Income,
  type Transaction,
  COMMON_CURRENCIES,
  CATEGORY_NAMES_ID,
  INCOME_CATEGORY_NAMES_ID,
  type IncomeCategory as BillIncomeCategory,
} from "@/types/bill";
import { format } from "date-fns";
import { useI18n, formatMonthName } from "@/lib/i18n";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
  TrendingUp,
  TrendingDown,
  Wallet,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

function getCurrencySymbol(currency: string): string {
  const currencyObj = COMMON_CURRENCIES.find((c) => c.code === currency);
  return currencyObj?.symbol || "Rp";
}

function formatCurrency(amount: number, currency: string): string {
  const hasDecimals = amount % 1 !== 0;
  const parts = hasDecimals
    ? amount.toFixed(2).split(".")
    : [amount.toString()];
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

interface CategoryColors {
  darkBg: string;
  lightBg: string;
  darkPill: string;
  lightPill: string;
}

function getCategoryColor(category: Category): CategoryColors {
  const map: Record<Category, CategoryColors> = {
    Food: {
      darkBg: "bg-[#ef9f27]/15",
      lightBg: "bg-amber-100",
      darkPill: "bg-[#ef9f27]/15 text-[#ef9f27]",
      lightPill: "bg-amber-100 text-amber-700",
    },
    Transport: {
      darkBg: "bg-blue-400/15",
      lightBg: "bg-blue-100",
      darkPill: "bg-blue-400/15 text-blue-400",
      lightPill: "bg-blue-100 text-blue-700",
    },
    Shopping: {
      darkBg: "bg-emerald-400/15",
      lightBg: "bg-emerald-100",
      darkPill: "bg-emerald-400/15 text-emerald-400",
      lightPill: "bg-emerald-100 text-emerald-700",
    },
    Utilities: {
      darkBg: "bg-yellow-400/15",
      lightBg: "bg-yellow-100",
      darkPill: "bg-yellow-400/15 text-yellow-400",
      lightPill: "bg-yellow-100 text-yellow-700",
    },
    Health: {
      darkBg: "bg-pink-400/15",
      lightBg: "bg-pink-100",
      darkPill: "bg-pink-400/15 text-pink-400",
      lightPill: "bg-pink-100 text-pink-700",
    },
    Entertainment: {
      darkBg: "bg-purple-400/15",
      lightBg: "bg-purple-100",
      darkPill: "bg-purple-400/15 text-purple-400",
      lightPill: "bg-purple-100 text-purple-700",
    },
    Household: {
      darkBg: "bg-orange-400/15",
      lightBg: "bg-orange-100",
      darkPill: "bg-orange-400/15 text-orange-400",
      lightPill: "bg-orange-100 text-orange-700",
    },
    Bills: {
      darkBg: "bg-cyan-400/15",
      lightBg: "bg-cyan-100",
      darkPill: "bg-cyan-400/15 text-cyan-400",
      lightPill: "bg-cyan-100 text-cyan-700",
    },
    Other: {
      darkBg: "bg-gray-400/15",
      lightBg: "bg-gray-100",
      darkPill: "bg-gray-400/15 text-gray-400",
      lightPill: "bg-gray-100 text-gray-600",
    },
  };
  return map[category] || map.Other;
}

function getIncomeCategoryColor(): CategoryColors {
  return {
    darkBg: "bg-emerald-400/12",
    lightBg: "bg-emerald-100",
    darkPill: "bg-emerald-400/12 text-emerald-300",
    lightPill: "bg-emerald-100 text-emerald-700",
  };
}

function TransactionsPageWrapper() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { locale, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTimeSummary, setAllTimeSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
  });
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Filters
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [isNominalHidden, setIsNominalHidden] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Edit/delete state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"manual" | "photo" | "upload">("manual");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<"expense" | "income">("expense");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState<"expense" | "income" | null>(null);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = !mounted || theme === "dark" || !theme;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoadingBills(true);
    setIsInitialized(false);
    try {
      const [txData, summary] = await Promise.all([
        getFilteredTransactions(1, 20, selectedMonth, selectedYear, typeFilter, debouncedQuery || undefined),
        getAllTimeSummary(),
      ]);
      setTransactions(txData.transactions);
      setAllTimeSummary(summary);
      setHasMore(txData.hasMore);
      setPage(1);
      setIsInitialized(true);
    } catch (error) {
      console.error("[fetchData] Error:", error);
    } finally {
      setIsLoadingBills(false);
    }
  }, [user, selectedMonth, selectedYear, typeFilter, debouncedQuery]);

  const fetchMoreTransactions = useCallback(async () => {
    if (isLoadingMore || !hasMore || !isInitialized) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const txData = await getFilteredTransactions(
        nextPage,
        20,
        selectedMonth,
        selectedYear,
        typeFilter,
        debouncedQuery || undefined,
      );
      setTransactions((prev) => [...prev, ...txData.transactions]);
      setHasMore(txData.hasMore);
      setPage(nextPage);
    } catch (error) {
      console.error("Error fetching more transactions:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, hasMore, isLoadingMore, isInitialized, selectedMonth, selectedYear, typeFilter, debouncedQuery]);

  // Fetch data when user is loaded or filters change
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

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
          fetchMoreTransactions();
        }
      },
      { threshold: 0.1 },
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
  }, [
    hasMore,
    isLoadingMore,
    isLoadingBills,
    isInitialized,
    fetchMoreTransactions,
  ]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSaveExpense = async (data: BillFormData) => {
    let result;
    if (editingBillId) {
      result = await updateBill(editingBillId, data);
    } else {
      result = await createBill(data);
    }
    if (result) {
      await fetchData();
      setIsFormOpen(false);
      setSelectedImage(null);
      setEditingBillId(null);
    }
  };

  const handleSaveIncome = async (data: IncomeFormData) => {
    let result;
    if (editingIncomeId) {
      result = await updateIncome(editingIncomeId, data);
    } else {
      result = await createIncome(data);
    }
    if (result) {
      await fetchData();
      setIsFormOpen(false);
      setEditingIncomeId(null);
    }
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setSelectedImage(null);
    setEditingBillId(null);
    setEditingIncomeId(null);
  };

  const handleEditTransaction = (tx: Transaction) => {
    if (tx.type === "expense") {
      setEditingBillId(tx.data.id);
      setEditingIncomeId(null);
      setEditingType("expense");
    } else {
      setEditingIncomeId(tx.data.id);
      setEditingBillId(null);
      setEditingType("income");
    }
    setFormMode("manual");
    setSelectedImage(null);
    setIsFormOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (deleteConfirmType === "income") {
      const success = await deleteIncome(id);
      if (!success) alert("Failed to delete income");
    } else {
      const success = await deleteBill(id);
      if (!success) alert("Failed to delete bill");
    }
    await fetchData();
    setDeleteConfirmId(null);
    setDeleteConfirmType(null);
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  // Month/year navigation
  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString(
    locale === "id" ? "id-ID" : "en-US",
    { month: "long" },
  );
  const displayMonthName = formatMonthName(monthName, locale);

  const yearOptions = Array.from({ length: 11 }, (_, i) => selectedYear - 5 + i);

  // Show loading state
  if (isLoading) {
    return (
      <main
        className={cn(
          "min-h-screen transition-colors duration-300 font-sans",
          isDarkMode ? "bg-[#0f1115] text-white" : "bg-gray-50 text-gray-900",
        )}
      >
        <LoadingSpinner
          size="lg"
          text={t.common.loading}
          isDarkMode={isDarkMode}
          fullScreen
        />
      </main>
    );
  }

  // Show sign-in page if not authenticated
  if (!user) {
    return (
      <main
        className={cn(
          "min-h-screen transition-colors duration-300 font-sans",
          isDarkMode ? "bg-[#0f1115] text-white" : "bg-gray-50 text-gray-900",
        )}
      >
        <div className="max-w-6xl mx-auto px-6 py-8">
          <header className="flex justify-between items-center mb-8 gap-4">
            <button
              onClick={() => setTheme(isDarkMode ? "light" : "dark")}
              className={cn(
                "p-2 rounded-full transition-colors",
                isDarkMode
                  ? "hover:bg-gray-800 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-200 text-gray-600 hover:text-gray-800",
              )}
              title={t.theme.toggle}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <LanguageSwitcher />
          </header>

          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              {t.app.title}
            </h1>
            <p
              className={cn(
                "mb-12 text-center",
                isDarkMode ? "text-gray-400" : "text-gray-600",
              )}
            >
              {t.app.tagline}
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
        isDarkMode ? "bg-[#0f1115] text-white" : "bg-gray-50 text-gray-900",
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 gap-3 sm:gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => router.push("/")}
              className={cn(
                "p-2 rounded-full transition-colors shrink-0",
                isDarkMode
                  ? "hover:bg-gray-800 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-200 text-gray-600 hover:text-gray-800",
              )}
              title="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {t.transactions?.title || "Transactions"}
              </h1>
              <p
                className={cn(
                  "text-xs sm:text-sm mt-0.5",
                  isDarkMode ? "text-gray-400" : "text-gray-600",
                )}
              >
                {t.transactions?.subtitle || "View and manage all your transactions"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setIsNominalHidden(!isNominalHidden)}
              className={cn(
                "p-2 rounded-full transition-colors",
                isDarkMode
                  ? "hover:bg-gray-800 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-200 text-gray-600 hover:text-gray-800",
              )}
              title={isNominalHidden ? "Show amounts" : "Hide amounts"}
            >
              {isNominalHidden ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => setTheme(isDarkMode ? "light" : "dark")}
              className={cn(
                "p-2 rounded-full transition-colors",
                isDarkMode
                  ? "hover:bg-gray-800 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-200 text-gray-600 hover:text-gray-800",
              )}
              title={t.theme.toggle}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <LanguageSwitcher />

            {/* User Profile */}
            <DropdownMenu
              align="end"
              trigger={
                <button
                  className={cn(
                    "flex items-center gap-2 p-1 rounded-full transition-colors",
                    isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-200",
                  )}
                >
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
                          : "bg-gray-200 text-gray-600",
                      )}
                    >
                      {(user.name || user.email)?.[0]?.toUpperCase()}
                    </div>
                  )}
                </button>
              }
            >
              <div className="px-2 py-1.5 border-b">
                <p className="text-sm font-medium">
                  {user.name || t.auth.user}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t.auth.signOut}
              </DropdownMenuItem>
            </DropdownMenu>
          </div>
        </header>

        {/* All-Time Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-10"
        >
          {/* Income Card */}
          <div
            className={cn(
              "rounded-xl p-4 sm:p-5 border",
              isDarkMode
                ? "bg-[#1a1d24] border-gray-800"
                : "bg-white border-gray-200 shadow-sm",
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={cn(
                  "p-1.5 rounded-md",
                  isDarkMode ? "bg-emerald-950/30" : "bg-emerald-50",
                )}
              >
                <TrendingUp
                  className={cn(
                    "w-4 h-4",
                    isDarkMode ? "text-emerald-400" : "text-emerald-600",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-xs font-semibold",
                  isDarkMode ? "text-gray-400" : "text-gray-600",
                )}
              >
                {t.summary.totalIncome}
              </span>
            </div>
            <h2
              className={cn(
                "text-2xl sm:text-3xl font-bold tracking-tighter",
                isDarkMode ? "text-emerald-400" : "text-emerald-600",
              )}
            >
              {isNominalHidden
                ? "••••••"
                : `Rp${formatCurrency(allTimeSummary.totalIncome, "IDR")}`}
            </h2>
          </div>

          {/* Expenses Card */}
          <div
            className={cn(
              "rounded-xl p-4 sm:p-5 border",
              isDarkMode
                ? "bg-[#1a1d24] border-gray-800"
                : "bg-white border-gray-200 shadow-sm",
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={cn(
                  "p-1.5 rounded-md",
                  isDarkMode ? "bg-red-950/30" : "bg-red-50",
                )}
              >
                <TrendingDown
                  className={cn(
                    "w-4 h-4",
                    isDarkMode ? "text-red-400" : "text-red-500",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-xs font-semibold",
                  isDarkMode ? "text-gray-400" : "text-gray-600",
                )}
              >
                {t.summary.totalExpenses}
              </span>
            </div>
            <h2
              className={cn(
                "text-2xl sm:text-3xl font-bold tracking-tighter",
                isDarkMode ? "text-red-400" : "text-red-500",
              )}
            >
              {isNominalHidden
                ? "••••••"
                : `Rp${formatCurrency(allTimeSummary.totalExpenses, "IDR")}`}
            </h2>
          </div>

          {/* Balance Card */}
          <div
            className={cn(
              "rounded-xl p-4 sm:p-5 border",
              isDarkMode
                ? "bg-[#1a1d24] border-gray-800"
                : "bg-white border-gray-200 shadow-sm",
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={cn(
                  "p-1.5 rounded-md",
                  isDarkMode ? "bg-cyan-950/30" : "bg-cyan-50",
                )}
              >
                <Wallet
                  className={cn(
                    "w-4 h-4",
                    isDarkMode ? "text-cyan-400" : "text-cyan-600",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-xs font-semibold",
                  isDarkMode ? "text-gray-400" : "text-gray-600",
                )}
              >
                {t.summary.balance}
              </span>
            </div>
            <h2
              className={cn(
                "text-2xl sm:text-3xl font-bold tracking-tighter",
                allTimeSummary.balance >= 0
                  ? isDarkMode
                    ? "text-emerald-400"
                    : "text-emerald-600"
                  : isDarkMode
                    ? "text-red-400"
                    : "text-red-500",
              )}
            >
              {isNominalHidden
                ? "••••••"
                : `Rp${formatCurrency(Math.abs(allTimeSummary.balance), "IDR")}`}
              {!isNominalHidden && allTimeSummary.balance < 0 && (
                <span className="text-sm ml-1">(deficit)</span>
              )}
            </h2>
          </div>
        </motion.div>

        {/* Filters Section */}
        <section
          className={cn(
            "rounded-2xl p-4 sm:p-6 mb-6 sm:mb-10 border",
            isDarkMode
              ? "bg-[#1a1d24] border-gray-800"
              : "bg-white border-gray-200 shadow-sm",
          )}
        >
          {/* Month/Year Navigator */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPrevMonth}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isDarkMode
                  ? "hover:bg-gray-800 text-gray-400"
                  : "hover:bg-gray-100 text-gray-600",
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{displayMonthName}</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className={cn(
                  "text-lg font-semibold bg-transparent border-none outline-none cursor-pointer",
                  isDarkMode ? "text-white" : "text-gray-900",
                )}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={goToNextMonth}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isDarkMode
                  ? "hover:bg-gray-800 text-gray-400"
                  : "hover:bg-gray-100 text-gray-600",
              )}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex gap-1 mb-4">
            {(["all", "income", "expense"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                  typeFilter === type
                    ? isDarkMode
                      ? "bg-gray-700 text-white"
                      : "bg-gray-900 text-white"
                    : isDarkMode
                      ? "text-gray-400 hover:bg-gray-800"
                      : "text-gray-600 hover:bg-gray-100",
                )}
              >
                {type === "all"
                  ? t.transactions?.all || "All"
                  : type === "income"
                    ? t.transactions?.income || "Income"
                    : t.transactions?.expense || "Expense"}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                isDarkMode ? "text-gray-400" : "text-gray-600",
              )}
            />
            <Input
              type="text"
              placeholder={t.transactions?.searchPlaceholder || "Search transactions..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-10",
                isDarkMode
                  ? "bg-[#0e0e10] border-gray-700 text-white placeholder:text-gray-400"
                  : "bg-gray-50 border-gray-200",
              )}
            />
            {searchQuery && (
              <button
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center",
                  isDarkMode
                    ? "hover:bg-gray-700 text-gray-400"
                    : "hover:bg-gray-200 text-gray-500",
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
        </section>

        {/* Transaction List */}
        <section>
          <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">
            {t.transactions?.filteredTransactions || "Filtered Transactions"}
          </h3>

          <div
            className={cn(
              "rounded-2xl overflow-hidden border",
              isDarkMode
                ? "border-white/[0.08] bg-[#0e0e10]"
                : "border-gray-200 bg-white shadow-sm",
            )}
          >
            {isLoadingBills ? (
              <div className="py-8">
                <LoadingSpinner
                  size="md"
                  text={t.bills.loadingBills}
                  isDarkMode={isDarkMode}
                />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <p
                  className={cn(
                    "mb-4",
                    isDarkMode ? "text-gray-500" : "text-gray-400",
                  )}
                >
                  {t.transactions?.noTransactions || "No transactions found for this period."}
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {transactions.map((tx, index) => {
                  const isIncome = tx.type === "income";
                  const data = tx.data;
                  const category = data.category;
                  const date = isIncome
                    ? (data as Income).receivedAt
                    : (data as Bill).transactionDate;
                  const label = isIncome
                    ? (data as Income).source ||
                      (locale === "id"
                        ? INCOME_CATEGORY_NAMES_ID[
                            category as BillIncomeCategory
                          ]
                        : category)
                    : (data as Bill).merchant || "-";
                  const description = data.description || "";
                  const categoryLabel = isIncome
                    ? locale === "id"
                      ? INCOME_CATEGORY_NAMES_ID[category as BillIncomeCategory]
                      : category
                    : locale === "id"
                      ? CATEGORY_NAMES_ID[category as Category]
                      : category;

                  const categoryIcon = isIncome
                    ? getIncomeCategoryIcon(category as IncomeCategory)
                    : getCategoryIcon(category as Category);
                  const categoryColor = isIncome
                    ? getIncomeCategoryColor()
                    : getCategoryColor(category as Category);

                  const billItems =
                    !isIncome &&
                    (data as Bill).items &&
                    (data as Bill).items!.length > 0
                      ? (data as Bill).items!
                      : null;

                  const isExpanded = expandedItems.has(data.id);

                  return (
                    <motion.div
                      key={`${tx.type}-${data.id}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        index !== transactions.length - 1 &&
                          (isDarkMode
                            ? "border-b border-white/[0.05]"
                            : "border-b border-gray-100"),
                      )}
                    >
                      {/* Row main */}
                      <div
                        onClick={() => billItems && toggleExpand(data.id)}
                        className={cn(
                          "group grid grid-cols-[40px_1fr_auto_auto] items-center gap-3 px-4 py-[13px] transition-colors",
                          billItems ? "cursor-pointer" : "",
                          isDarkMode
                            ? "hover:bg-white/[0.03]"
                            : "hover:bg-gray-50/80",
                        )}
                      >
                        {/* Category Icon */}
                        <div
                          className={cn(
                            "w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0",
                            isDarkMode
                              ? categoryColor.darkBg
                              : categoryColor.lightBg,
                          )}
                        >
                          {categoryIcon}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex flex-col gap-[2px]">
                          <div className="flex items-center gap-[7px]">
                            <span
                              className={cn(
                                "text-sm font-medium truncate",
                                isDarkMode ? "text-[#e8e8e8]" : "text-gray-900",
                              )}
                            >
                              {label !== "-" ? label : categoryLabel}
                            </span>
                            {billItems && !isExpanded && (
                              <span
                                className={cn(
                                  "text-[11px] px-1.5 rounded-[10px] font-medium shrink-0",
                                  isDarkMode
                                    ? "bg-white/[0.07] text-[#666]"
                                    : "bg-gray-100 text-gray-500",
                                )}
                              >
                                {billItems.length} item
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={cn(
                                "text-xs",
                                isDarkMode ? "text-gray-500" : "text-gray-400",
                              )}
                            >
                              {format(new Date(date), "d MMM yyyy")}
                            </span>
                            <span
                              className={cn(
                                "text-[11px] px-2 py-[2px] rounded-full font-medium",
                                isDarkMode
                                  ? categoryColor.darkPill
                                  : categoryColor.lightPill,
                              )}
                            >
                              {categoryLabel}
                            </span>
                          </div>
                          {description && (!billItems || isExpanded) && (
                            <span
                              className={cn(
                                "text-xs truncate max-w-[340px]",
                                isDarkMode ? "text-gray-500" : "text-gray-400",
                              )}
                            >
                              {description}
                            </span>
                          )}
                        </div>

                        {/* Amount + Chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              "text-sm font-medium whitespace-nowrap",
                              isIncome
                                ? isDarkMode
                                  ? "text-emerald-400"
                                  : "text-emerald-600"
                                : isDarkMode
                                  ? "text-[#f09595]"
                                  : "text-red-500",
                            )}
                          >
                            {isNominalHidden
                              ? "••••••"
                              : `${isIncome ? "+" : "-"}${getCurrencySymbol(data.currency)}${formatCurrency(data.amount, data.currency)}`}
                          </span>
                          {billItems && (
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 shrink-0 transition-transform duration-200",
                                isDarkMode ? "text-gray-500" : "text-gray-400",
                                isExpanded && "rotate-180",
                              )}
                            />
                          )}
                        </div>

                        {/* Kebab */}
                        <div
                          className="shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu
                            trigger={
                              <button
                                className={cn(
                                  "w-7 h-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all",
                                  isDarkMode
                                    ? "hover:bg-white/[0.08] text-gray-500 hover:text-gray-300"
                                    : "hover:bg-gray-100 text-gray-400 hover:text-gray-600",
                                )}
                              >
                                <svg
                                  className="h-4 w-4"
                                  viewBox="0 0 16 16"
                                  fill="currentColor"
                                >
                                  <circle cx="8" cy="3.5" r="1.3" />
                                  <circle cx="8" cy="8" r="1.3" />
                                  <circle cx="8" cy="12.5" r="1.3" />
                                </svg>
                              </button>
                            }
                          >
                            <DropdownMenuItem
                              onClick={() => handleEditTransaction(tx)}
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
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              {t.common.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setDeleteConfirmId(data.id);
                                setDeleteConfirmType(tx.type);
                              }}
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
                              {t.common.delete}
                            </DropdownMenuItem>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Expandable items panel */}
                      {billItems && (
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              key="items"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="relative pl-[62px] pr-4 pb-1.5">
                                <div
                                  className={cn(
                                    "absolute left-[50px] top-0 bottom-1 w-[1.5px] rounded-sm",
                                    isDarkMode
                                      ? "bg-white/[0.07]"
                                      : "bg-gray-200",
                                  )}
                                />
                                <div className="flex flex-col">
                                  {billItems.map((item, itemIdx) => (
                                    <div
                                      key={itemIdx}
                                      className={cn(
                                        "flex flex-col py-1.5 border-b last:border-b-0",
                                        isDarkMode
                                          ? "border-b-white/[0.04]"
                                          : "border-b-gray-100",
                                      )}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <div
                                          className={cn(
                                            "w-1 h-1 rounded-full shrink-0",
                                            isDarkMode
                                              ? "bg-white/[0.12]"
                                              : "bg-gray-300",
                                          )}
                                        />
                                        <span
                                          className={cn(
                                            "text-[12px]",
                                            isDarkMode
                                              ? "text-gray-400"
                                              : "text-gray-600",
                                          )}
                                        >
                                          {item.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 pl-[10px]">
                                        <span
                                          className={cn(
                                            "text-[11px]",
                                            isDarkMode
                                              ? "text-gray-500"
                                              : "text-gray-400",
                                          )}
                                        >
                                          x{item.qty}
                                        </span>
                                        <span
                                          className={cn(
                                            "text-[12px]",
                                            isDarkMode
                                              ? "text-gray-300"
                                              : "text-gray-700",
                                          )}
                                        >
                                          {isNominalHidden
                                            ? "••••••"
                                            : `${getCurrencySymbol(data.currency)}${formatCurrency(item.price * item.qty, data.currency)}`}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-4 text-center">
                {isLoadingMore && (
                  <div className="py-4">
                    <LoadingSpinner
                      size="sm"
                      text={t.bills.loadingMore}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bill Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent
          className={isDarkMode ? "bg-[#1a1d24] border-gray-800" : ""}
        >
          <DialogHeader>
            <DialogTitle>
              {editingBillId
                ? t.form.editBill
                : editingIncomeId
                  ? t.form.editIncome
                  : formMode === "manual"
                    ? t.form.manualEntry
                    : formMode === "photo"
                      ? t.form.photoMode
                      : t.form.uploadPhoto}
            </DialogTitle>
          </DialogHeader>
          <BillEntryDialog
            mode={formMode}
            image={selectedImage}
            onSaveExpense={handleSaveExpense}
            onSaveIncome={handleSaveIncome}
            onCancel={handleCancelForm}
            initialType={editingType}
            initialData={(() => {
              if (!editingBillId) return undefined;
              const tx = transactions.find(
                (t) => t.type === "expense" && t.data.id === editingBillId,
              );
              if (!tx || tx.type !== "expense") return undefined;
              const bill = tx.data;
              return {
                amount: bill.amount.toString(),
                currency: bill.currency,
                category: bill.category,
                description: bill.description || "",
                merchant: bill.merchant || "",
                date: new Date(bill.transactionDate)
                  .toISOString()
                  .split("T")[0],
                items: bill.items?.map((item) => ({
                  name: item.name,
                  qty: item.qty.toString(),
                  price: item.price.toString(),
                })),
              };
            })()}
            initialItems={(() => {
              if (!editingBillId) return undefined;
              const tx = transactions.find(
                (t) => t.type === "expense" && t.data.id === editingBillId,
              );
              if (!tx || tx.type !== "expense") return undefined;
              const bill = tx.data;
              if (!bill.items || bill.items.length === 0) return undefined;
              return bill.items.map((item) => ({
                name: item.name,
                qty: item.qty.toString(),
                price: item.price.toString(),
              }));
            })()}
            initialIncomeData={(() => {
              if (!editingIncomeId) return undefined;
              const tx = transactions.find(
                (t) => t.type === "income" && t.data.id === editingIncomeId,
              );
              if (!tx || tx.type !== "income") return undefined;
              const income = tx.data;
              return {
                amount: income.amount.toString(),
                currency: income.currency,
                category: income.category as BillIncomeCategory,
                description: income.description || "",
                source: income.source || "",
                date: new Date(income.receivedAt).toISOString().split("T")[0],
              };
            })()}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => {
          setDeleteConfirmId(null);
          setDeleteConfirmType(null);
        }}
      >
        <DialogContent
          className={isDarkMode ? "bg-[#1a1d24] border-gray-800" : ""}
        >
          <DialogHeader>
            <DialogTitle>{t.delete.deleteBill}</DialogTitle>
          </DialogHeader>
          <p
            className={cn(
              "text-sm",
              isDarkMode ? "text-gray-400" : "text-gray-600",
            )}
          >
            {t.delete.confirmMessage}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmId(null);
                setDeleteConfirmType(null);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="outline"
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
              onClick={() =>
                deleteConfirmId && handleDeleteTransaction(deleteConfirmId)
              }
            >
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// Wrapper to handle Suspense
export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div
          className={cn(
            "min-h-screen transition-colors duration-300 font-sans flex items-center justify-center",
            "bg-[#0f1115] text-white",
          )}
        >
          <LoadingSpinner size="lg" text="Loading..." isDarkMode fullScreen />
        </div>
      }
    >
      <TransactionsPageWrapper />
    </Suspense>
  );
}
