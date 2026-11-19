import type { TransactionItem } from './entities/transaction.entity';
import { isInventoryTracked } from './inventory-rules';
import { EVENT_BARCODE } from './ticket-options';
import { COFFEE_BARCODE } from './constants';

/**
 * What a sale line is. Only `product` lines move stock: tickets, coffee and any
 * other synthetic `_` barcode are billed but never leave the inventory.
 */
export type LineCategory = 'product' | 'ticket' | 'coffee' | 'other';

export type CategoryAmounts = Record<LineCategory, number>;

export interface BreakdownSale {
  timestamp: Date | string;
  totalAmount: number;
  items: Pick<TransactionItem, 'barcode' | 'name' | 'price' | 'quantity' | 'productId'>[];
}

export interface DailySales extends CategoryAmounts {
  date: string;
  count: number;
  amount: number;
}

export interface InventoryPoint {
  date: string;
  value: number;
}

export interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

export function lineCategory(barcode: string): LineCategory {
  const code = typeof barcode === 'string' ? barcode.trim() : '';
  if (isInventoryTracked(code)) return 'product';
  if (code === EVENT_BARCODE) return 'ticket';
  if (code === COFFEE_BARCODE) return 'coffee';
  return 'other';
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function round2(value: number): number {
  return parseFloat(value.toFixed(2));
}

function lineAmount(item: Pick<TransactionItem, 'price' | 'quantity'>): number {
  const amount = Number(item.price) * Number(item.quantity);
  return Number.isFinite(amount) ? amount : 0;
}

function emptyAmounts(): CategoryAmounts {
  return { product: 0, ticket: 0, coffee: 0, other: 0 };
}

function addLines(target: CategoryAmounts, items: BreakdownSale['items']): void {
  for (const item of items ?? []) {
    target[lineCategory(item.barcode)] += lineAmount(item);
  }
}

function roundAmounts<T extends CategoryAmounts>(amounts: T): T {
  return {
    ...amounts,
    product: round2(amounts.product),
    ticket: round2(amounts.ticket),
    coffee: round2(amounts.coffee),
    other: round2(amounts.other),
  };
}

/** Per-day count, billed total and per-category amounts, ascending by date. */
export function dailySalesByCategory(sales: BreakdownSale[]): DailySales[] {
  const byDay = new Map<string, DailySales>();
  for (const sale of sales) {
    const at = new Date(sale.timestamp);
    if (Number.isNaN(at.getTime())) continue;
    const date = toDateKey(at);
    const day = byDay.get(date) ?? { date, count: 0, amount: 0, ...emptyAmounts() };
    day.count += 1;
    day.amount += sale.totalAmount;
    addLines(day, sale.items);
    byDay.set(date, day);
  }
  return [...byDay.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => roundAmounts({ ...day, amount: round2(day.amount) }));
}

/** All-time revenue per category. */
export function revenueSplit(sales: BreakdownSale[]): CategoryAmounts {
  const totals = emptyAmounts();
  for (const sale of sales) addLines(totals, sale.items);
  return roundAmounts(totals);
}

/**
 * Inventory value per day, rebuilt backward from today's value.
 *
 * Going back one day undoes that day: its stock sales are added back and its
 * restocks removed. Only `product` sales count — ticket and coffee lines never
 * left the shelves, so adding them back would inflate past inventory.
 */
export function inventoryHistory(
  productSalesByDay: Map<string, number>,
  restocksByDay: Map<string, number>,
  currentValue: number,
  today: string
): InventoryPoint[] {
  const days = [...new Set([...productSalesByDay.keys(), ...restocksByDay.keys()])]
    .filter((day) => day <= today)
    .sort();
  if (days[days.length - 1] !== today) days.push(today);

  const values: number[] = new Array(days.length);
  values[days.length - 1] = currentValue;
  for (let i = days.length - 2; i >= 0; i--) {
    const next = days[i + 1];
    values[i] =
      values[i + 1] + (productSalesByDay.get(next) ?? 0) - (restocksByDay.get(next) ?? 0);
  }

  return days.map((date, i) => ({ date, value: round2(values[i]) }));
}

/** Best sellers among stocked products since `since`, by units sold. */
export function topProducts(sales: BreakdownSale[], since: Date, limit = 5): TopProduct[] {
  const byProduct = new Map<string, TopProduct>();
  for (const sale of sales) {
    const at = new Date(sale.timestamp);
    if (Number.isNaN(at.getTime()) || at < since) continue;
    for (const item of sale.items ?? []) {
      if (lineCategory(item.barcode) !== 'product') continue;
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const key = item.productId || item.barcode.trim();
      const entry = byProduct.get(key) ?? { name: item.name, qty: 0, revenue: 0 };
      entry.name = item.name || entry.name;
      entry.qty += qty;
      entry.revenue += lineAmount(item);
      byProduct.set(key, entry);
    }
  }
  return [...byProduct.values()]
    .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
    .slice(0, limit)
    .map((p) => ({ ...p, revenue: round2(p.revenue) }));
}

/** Mean billed total per sale, ignoring empty (zero) sales. */
export function averageBasket(sales: Pick<BreakdownSale, 'totalAmount'>[]): number {
  const paid = sales.filter((s) => s.totalAmount > 0);
  if (paid.length === 0) return 0;
  return round2(paid.reduce((sum, s) => sum + s.totalAmount, 0) / paid.length);
}
