"use server";

import { eq, desc, sql, and, or, like, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bills, incomes, items } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import type { Transaction } from "@/types/bill";

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export async function getAllTimeSummary(): Promise<FinancialSummary> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const [expenseResult, incomeResult] = await Promise.all([
      db
        .select({ total: sql<number>`coalesce(sum(${bills.amount}), 0)` })
        .from(bills)
        .where(eq(bills.userId, userId)),
      db
        .select({ total: sql<number>`coalesce(sum(${incomes.amount}), 0)` })
        .from(incomes)
        .where(eq(incomes.userId, userId)),
    ]);

    const totalExpenses = Number(expenseResult[0]?.total ?? 0);
    const totalIncome = Number(incomeResult[0]?.total ?? 0);

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
    };
  } catch (error) {
    console.error("Error fetching all-time summary:", error);
    return { totalIncome: 0, totalExpenses: 0, balance: 0 };
  }
}

export async function getFilteredTransactions(
  page: number = 1,
  limit: number = 20,
  month?: number,
  year?: number,
  type?: "all" | "income" | "expense",
  search?: string,
): Promise<{
  transactions: Transaction[];
  hasMore: boolean;
}> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const offset = (page - 1) * limit;
    const fetchLimit = limit + 1;

    // Build date range filter
    let dateFilter;
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      const startTs = Math.floor(startDate.getTime() / 1000);
      const endTs = Math.floor(endDate.getTime() / 1000);
      dateFilter = { startTs, endTs };
    }

    const searchTerm = search?.trim() ? `%${search.trim()}%` : null;

    let expenseBills: typeof bills.$inferSelect[] = [];
    let incomeRecords: typeof incomes.$inferSelect[] = [];

    // Fetch expenses if type is "all" or "expense"
    if (type !== "income") {
      let expenseWhere = eq(bills.userId, userId);

      if (dateFilter) {
        expenseWhere = and(
          expenseWhere,
          sql`${bills.transactionDate} >= ${dateFilter.startTs}`,
          sql`${bills.transactionDate} <= ${dateFilter.endTs}`,
        )!;
      }

      if (searchTerm) {
        expenseWhere = and(
          expenseWhere,
          or(
            like(bills.merchant, searchTerm),
            like(bills.description, searchTerm),
            like(bills.category, searchTerm),
          ),
        )!;
      }

      expenseBills = await db
        .select()
        .from(bills)
        .where(expenseWhere)
        .orderBy(desc(bills.transactionDate))
        .limit(fetchLimit)
        .offset(offset);
    }

    // Fetch incomes if type is "all" or "income"
    if (type !== "expense") {
      let incomeWhere = eq(incomes.userId, userId);

      if (dateFilter) {
        incomeWhere = and(
          incomeWhere,
          sql`${incomes.receivedAt} >= ${dateFilter.startTs}`,
          sql`${incomes.receivedAt} <= ${dateFilter.endTs}`,
        )!;
      }

      if (searchTerm) {
        incomeWhere = and(
          incomeWhere,
          or(
            like(incomes.source, searchTerm),
            like(incomes.description, searchTerm),
            like(incomes.category, searchTerm),
          ),
        )!;
      }

      incomeRecords = await db
        .select()
        .from(incomes)
        .where(incomeWhere)
        .orderBy(desc(incomes.receivedAt))
        .limit(fetchLimit)
        .offset(offset);
    }

    // Fetch items for expense bills
    const billIds = expenseBills.map((b) => b.id);
    const allItems =
      billIds.length > 0
        ? await db.select().from(items).where(inArray(items.billId, billIds))
        : [];

    // Merge and sort by date
    const merged = [
      ...expenseBills.map((b) => ({
        type: "expense" as const,
        data: { ...b, items: allItems.filter((i) => i.billId === b.id) },
        sortDate: b.transactionDate?.getTime() ?? 0,
      })),
      ...incomeRecords.map((i) => ({
        type: "income" as const,
        data: i,
        sortDate: i.receivedAt?.getTime() ?? 0,
      })),
    ];

    merged.sort((a, b) => b.sortDate - a.sortDate);

    const hasMore = merged.length > limit;
    const transactions = hasMore ? merged.slice(0, limit) : merged;

    return {
      transactions: transactions.map((t) => ({
        type: t.type,
        data: t.data,
      })) as Transaction[],
      hasMore,
    };
  } catch (error) {
    console.error("Error fetching filtered transactions:", error);
    return { transactions: [], hasMore: false };
  }
}
