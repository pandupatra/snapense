export type Category =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Utilities"
  | "Health"
  | "Entertainment"
  | "Household"
  | "Bills"
  | "Other";

export type IncomeCategory =
  | "Salary"
  | "Freelance"
  | "Investment"
  | "Gift"
  | "Refund"
  | "Other";

export interface Bill {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  category: Category;
  description: string | null;
  merchant: string | null;
  transactionDate: Date;
  createdAt: Date | null;
}

export interface BillFormData {
  amount: string;
  currency: string;
  category: Category;
  description: string;
  merchant: string;
  date: string;
}

export const CATEGORIES: Category[] = [
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

export const CATEGORY_NAMES_ID: Record<Category, string> = {
  Food: "Makanan",
  Transport: "Transportasi",
  Shopping: "Belanja",
  Utilities: "Utilitas",
  Health: "Kesehatan",
  Entertainment: "Hiburan",
  Household: "Rumah Tangga",
  Bills: "Tagihan",
  Other: "Lainnya",
};

export const COMMON_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
];

// Income types
export interface Income {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  category: IncomeCategory;
  description: string | null;
  source: string | null;
  receivedAt: Date;
  createdAt: Date | null;
}

export interface IncomeFormData {
  amount: string;
  currency: string;
  category: IncomeCategory;
  description: string;
  source: string;
  date: string;
}

export const INCOME_CATEGORIES: IncomeCategory[] = [
  "Salary",
  "Freelance",
  "Investment",
  "Gift",
  "Refund",
  "Other",
];

export const INCOME_CATEGORY_NAMES_ID: Record<IncomeCategory, string> = {
  Salary: "Gaji",
  Freelance: "Freelance",
  Investment: "Investasi",
  Gift: "Hadiah",
  Refund: "Pengembalian",
  Other: "Lainnya",
};

// Unified transaction type for dashboard
export type Transaction =
  | { type: "expense"; data: Bill }
  | { type: "income"; data: Income };
