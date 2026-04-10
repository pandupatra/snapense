"use server";

import { eq, desc, sql, and, or, like } from "drizzle-orm";
import { db } from "@/db";
import { bills, incomes } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import type { Transaction } from "@/types/bill";

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export interface DailyFinance {
  day: string;
  income: number;
  expense: number;
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
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
    console.error("Error fetching financial summary:", error);
    return { totalIncome: 0, totalExpenses: 0, balance: 0 };
  }
}

export async function getChartData(): Promise<DailyFinance[]> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Last 30 days
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
    const startTs = Math.floor(startDate.getTime() / 1000);
    const endTs = Math.floor(now.getTime() / 1000);

    const [expenseDays, incomeDays] = await Promise.all([
      db
        .select({
          date: sql<string>`date(${bills.transactionDate}, 'unixepoch')`,
          total: sql<number>`coalesce(sum(${bills.amount}), 0)`,
        })
        .from(bills)
        .where(
          and(
            eq(bills.userId, userId),
            sql`${bills.transactionDate} >= ${startTs}`,
            sql`${bills.transactionDate} <= ${endTs}`,
          ),
        )
        .groupBy(sql`date(${bills.transactionDate}, 'unixepoch')`)
        .orderBy(sql`date(${bills.transactionDate}, 'unixepoch')`),
      db
        .select({
          date: sql<string>`date(${incomes.receivedAt}, 'unixepoch')`,
          total: sql<number>`coalesce(sum(${incomes.amount}), 0)`,
        })
        .from(incomes)
        .where(
          and(
            eq(incomes.userId, userId),
            sql`${incomes.receivedAt} >= ${startTs}`,
            sql`${incomes.receivedAt} <= ${endTs}`,
          ),
        )
        .groupBy(sql`date(${incomes.receivedAt}, 'unixepoch')`)
        .orderBy(sql`date(${incomes.receivedAt}, 'unixepoch')`),
    ]);

    // Merge into unified daily data
    const dayMap = new Map<string, DailyFinance>();

    for (const e of expenseDays) {
      const day = e.date;
      if (!dayMap.has(day)) dayMap.set(day, { day, income: 0, expense: 0 });
      dayMap.get(day)!.expense = Number(e.total);
    }

    for (const i of incomeDays) {
      const day = i.date;
      if (!dayMap.has(day)) dayMap.set(day, { day, income: 0, expense: 0 });
      dayMap.get(day)!.income = Number(i.total);
    }

    return Array.from(dayMap.values()).sort((a, b) =>
      a.day.localeCompare(b.day),
    );
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return [];
  }
}

export async function getRecentTransactions(
  page: number = 1,
  limit: number = 20,
): Promise<{
  transactions: Transaction[];
  hasMore: boolean;
}> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const offset = (page - 1) * limit;

    // Fetch one extra from each to determine hasMore correctly
    const fetchLimit = limit + 1;

    const [expenseBills, incomeRecords] = await Promise.all([
      db
        .select()
        .from(bills)
        .where(eq(bills.userId, userId))
        .orderBy(desc(bills.transactionDate))
        .limit(fetchLimit)
        .offset(offset),
      db
        .select()
        .from(incomes)
        .where(eq(incomes.userId, userId))
        .orderBy(desc(incomes.receivedAt))
        .limit(fetchLimit)
        .offset(offset),
    ]);

    // Merge and sort by date
    const merged = [
      ...expenseBills.map((b) => ({
        type: "expense" as const,
        data: b,
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
    console.error("Error fetching recent transactions:", error);
    return { transactions: [], hasMore: false };
  }
}

export async function searchTransactions(
  query: string,
  page: number = 1,
  limit: number = 20,
): Promise<{
  transactions: Transaction[];
  hasMore: boolean;
}> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const offset = (page - 1) * limit;

    if (!query.trim()) {
      return getRecentTransactions(page, limit);
    }

    const searchTerm = `%${query.trim()}%`;
    const fetchLimit = limit + 1;

    const [expenseBills, incomeRecords] = await Promise.all([
      db
        .select()
        .from(bills)
        .where(
          and(
            eq(bills.userId, userId),
            or(
              like(bills.merchant, searchTerm),
              like(bills.description, searchTerm),
              like(bills.category, searchTerm),
            ),
          ),
        )
        .orderBy(desc(bills.transactionDate))
        .limit(fetchLimit)
        .offset(offset),
      db
        .select()
        .from(incomes)
        .where(
          and(
            eq(incomes.userId, userId),
            or(
              like(incomes.source, searchTerm),
              like(incomes.description, searchTerm),
              like(incomes.category, searchTerm),
            ),
          ),
        )
        .orderBy(desc(incomes.receivedAt))
        .limit(fetchLimit)
        .offset(offset),
    ]);

    const merged = [
      ...expenseBills.map((b) => ({
        type: "expense" as const,
        data: b,
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
    console.error("Error searching transactions:", error);
    return { transactions: [], hasMore: false };
  }
}
