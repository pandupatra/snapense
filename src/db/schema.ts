import { pgTable, text, integer, doublePrecision, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

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

export const bills = pgTable("bill", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull().default("IDR"),
  category: text("category", {
    enum: [
      "Food",
      "Transport",
      "Shopping",
      "Utilities",
      "Health",
      "Entertainment",
      "Household",
      "Bills",
      "Other",
    ],
  }).notNull(),
  description: text("description"),
  merchant: text("merchant"),
  transactionDate: timestamp("transaction_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const items = pgTable("item", {
  id: text("id").primaryKey(),
  billId: text("bill_id")
    .notNull()
    .references(() => bills.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  qty: integer("qty").notNull().default(1),
  price: doublePrecision("price").notNull(),
});

export type IncomeCategory =
  | "Salary"
  | "Freelance"
  | "Investment"
  | "Gift"
  | "Refund"
  | "Other";

export const incomes = pgTable("income", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull().default("IDR"),
  category: text("category", {
    enum: ["Salary", "Freelance", "Investment", "Gift", "Refund", "Other"],
  }).notNull(),
  description: text("description"),
  source: text("source"),
  receivedAt: timestamp("received_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BillInsert = typeof bills.$inferInsert;
export type BillSelect = typeof bills.$inferSelect;
export type ItemInsert = typeof items.$inferInsert;
export type ItemSelect = typeof items.$inferSelect;
export type IncomeInsert = typeof incomes.$inferInsert;
export type IncomeSelect = typeof incomes.$inferSelect;
