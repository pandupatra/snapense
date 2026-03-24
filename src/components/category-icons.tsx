import {
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  HeartPulse,
  Film,
  Home,
  ReceiptText,
  MoreHorizontal,
  LucideIcon
} from "lucide-react";

export type Category = 'Food' | 'Transport' | 'Shopping' | 'Utilities' | 'Health' | 'Entertainment' | 'Household' | 'Bills' | 'Other';

export interface CategoryIconConfig {
  icon: LucideIcon;
  label: string;
  colorClass: string;
}

export const CATEGORY_ICONS: Record<Category, CategoryIconConfig> = {
  Food: {
    icon: Utensils,
    label: 'Food',
    colorClass: 'text-cyan-400'
  },
  Transport: {
    icon: Car,
    label: 'Transport',
    colorClass: 'text-cyan-400'
  },
  Shopping: {
    icon: ShoppingBag,
    label: 'Shopping',
    colorClass: 'text-cyan-400'
  },
  Utilities: {
    icon: Zap,
    label: 'Utilities',
    colorClass: 'text-cyan-400'
  },
  Health: {
    icon: HeartPulse,
    label: 'Health',
    colorClass: 'text-cyan-400'
  },
  Entertainment: {
    icon: Film,
    label: 'Entertainment',
    colorClass: 'text-cyan-400'
  },
  Household: {
    icon: Home,
    label: 'Household',
    colorClass: 'text-cyan-400'
  },
  Bills: {
    icon: ReceiptText,
    label: 'Bills',
    colorClass: 'text-cyan-400'
  },
  Other: {
    icon: MoreHorizontal,
    label: 'Other',
    colorClass: 'text-cyan-400'
  }
};

export function getCategoryIcon(category: Category) {
  const config = CATEGORY_ICONS[category] || CATEGORY_ICONS.Other;
  const Icon = config.icon;
  return <Icon className={`w-4 h-4 ${config.colorClass}`} />;
}

export const ALL_CATEGORIES: Category[] = [
  'Food',
  'Transport',
  'Shopping',
  'Utilities',
  'Health',
  'Entertainment',
  'Household',
  'Bills',
  'Other'
];
