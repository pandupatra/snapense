"use server";

import { eq, desc, or, like, and } from "drizzle-orm";
import { db } from "@/db";
import { incomes, type IncomeSelect, type IncomeCategory } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";

export interface IncomeFormData {
  amount: string;
  currency: string;
  category: IncomeCategory;
  description: string;
  source: string;
  date: string;
}

export async function getIncomes(
  page: number = 1,
  limit: number = 20,
): Promise<{
  incomes: IncomeSelect[];
  hasMore: boolean;
}> {
  try {
    const session = await requireAuth();
    const offset = (page - 1) * limit;

    const fetchedIncomes = await db
      .select()
      .from(incomes)
      .where(eq(incomes.userId, session.user.id))
      .orderBy(desc(incomes.receivedAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = fetchedIncomes.length > limit;
    const resultIncomes = hasMore
      ? fetchedIncomes.slice(0, limit)
      : fetchedIncomes;

    return { incomes: resultIncomes, hasMore };
  } catch (error) {
    console.error("[getIncomes] Error:", error);
    return { incomes: [], hasMore: false };
  }
}

export async function createIncome(
  data: IncomeFormData,
): Promise<IncomeSelect | null> {
  try {
    const session = await requireAuth();

    const newIncome = {
      id: crypto.randomUUID(),
      userId: session.user.id,
      amount: parseFloat(data.amount),
      currency: data.currency || "IDR",
      category: data.category,
      description: data.description || null,
      source: data.source || null,
      receivedAt: new Date(data.date),
    };

    await db.insert(incomes).values(newIncome);
    return newIncome as IncomeSelect;
  } catch (error) {
    console.error("Error creating income:", error);
    return null;
  }
}

export async function updateIncome(
  id: string,
  data: IncomeFormData,
): Promise<IncomeSelect | null> {
  try {
    const session = await requireAuth();

    const income = await db
      .select()
      .from(incomes)
      .where(eq(incomes.id, id))
      .limit(1);

    if (!income[0] || income[0].userId !== session.user.id) {
      return null;
    }

    const updatedIncome = {
      amount: parseFloat(data.amount),
      currency: data.currency || "IDR",
      category: data.category,
      description: data.description || null,
      source: data.source || null,
      receivedAt: new Date(data.date),
    };

    await db.update(incomes).set(updatedIncome).where(eq(incomes.id, id));

    return { ...income[0], ...updatedIncome } as IncomeSelect;
  } catch (error) {
    console.error("Error updating income:", error);
    return null;
  }
}

export async function deleteIncome(id: string): Promise<boolean> {
  try {
    const session = await requireAuth();

    const income = await db
      .select()
      .from(incomes)
      .where(eq(incomes.id, id))
      .limit(1);

    if (!income[0] || income[0].userId !== session.user.id) {
      return false;
    }

    await db.delete(incomes).where(eq(incomes.id, id));
    return true;
  } catch (error) {
    console.error("Error deleting income:", error);
    return false;
  }
}

export async function searchIncomes(
  query: string,
  page: number = 1,
  limit: number = 20,
): Promise<{
  incomes: IncomeSelect[];
  hasMore: boolean;
}> {
  try {
    const session = await requireAuth();
    const offset = (page - 1) * limit;

    if (!query.trim()) {
      return getIncomes(page, limit);
    }

    const searchTerm = `%${query.trim()}%`;

    const fetchedIncomes = await db
      .select()
      .from(incomes)
      .where(
        and(
          eq(incomes.userId, session.user.id),
          or(
            like(incomes.source, searchTerm),
            like(incomes.description, searchTerm),
            like(incomes.category, searchTerm),
          ),
        ),
      )
      .orderBy(desc(incomes.receivedAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = fetchedIncomes.length > limit;
    const resultIncomes = hasMore
      ? fetchedIncomes.slice(0, limit)
      : fetchedIncomes;

    return { incomes: resultIncomes, hasMore };
  } catch (error) {
    console.error("[searchIncomes] Error:", error);
    return { incomes: [], hasMore: false };
  }
}

export async function getTotalIncome(): Promise<number> {
  try {
    const session = await requireAuth();
    const result = await db
      .select({ amount: incomes.amount })
      .from(incomes)
      .where(eq(incomes.userId, session.user.id));

    return result.reduce((sum, income) => sum + income.amount, 0);
  } catch (error) {
    console.error("Error fetching total income:", error);
    return 0;
  }
}
