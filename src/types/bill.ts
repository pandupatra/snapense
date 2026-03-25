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
