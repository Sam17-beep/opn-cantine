import { describe, it, expect } from 'vitest';
import {
  averageBasket,
  dailySalesByCategory,
  inventoryHistory,
  lineCategory,
  revenueSplit,
  topProducts,
  type BreakdownSale,
} from './sales-breakdown';

const chips = { barcode: '123', name: 'Chips', price: 2, quantity: 1, productId: 'p1' };
const coffee = { barcode: '_cafe_', name: 'Café', price: 1, quantity: 1 };
const ticket = { barcode: '_event_', name: 'Party', price: 25, quantity: 2 };

function sale(day: string, items: BreakdownSale['items']): BreakdownSale {
  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);
  return { timestamp: new Date(`${day}T12:00:00`), totalAmount, items };
}

function productSalesByDay(sales: BreakdownSale[]): Map<string, number> {
  return new Map(dailySalesByCategory(sales).map((d) => [d.date, d.product]));
}

describe('lineCategory', () => {
  it('classifies stocked, ticket, coffee and other synthetic lines', () => {
    expect(lineCategory('123')).toBe('product');
    expect(lineCategory('_event_')).toBe('ticket');
    expect(lineCategory('_cafe_')).toBe('coffee');
    expect(lineCategory('_misc_')).toBe('other');
  });
});

describe('inventoryHistory', () => {
  const today = '2026-01-03';

  it.each([
    ['coffee only', [coffee]],
    ['tickets only', [ticket]],
    ['coffee and tickets', [coffee, ticket]],
  ])('stays flat across a day of %s', (_label, items) => {
    const sales = [sale('2026-01-02', items)];
    const history = inventoryHistory(productSalesByDay(sales), new Map(), 100, today);

    expect(history.map((p) => p.value)).toEqual([100, 100]);
  });

  it('adds back only the stocked part of a mixed sale', () => {
    const sales = [sale('2026-01-02', [chips, coffee, ticket]), sale(today, [chips])];
    const history = inventoryHistory(productSalesByDay(sales), new Map(), 100, today);

    expect(history).toEqual([
      { date: '2026-01-02', value: 102 },
      { date: today, value: 100 },
    ]);
  });

  it('removes restocks going backward', () => {
    const history = inventoryHistory(new Map(), new Map([[today, 30]]), 100, today);
    expect(history).toEqual([{ date: today, value: 100 }]);

    const earlier = inventoryHistory(
      new Map([['2026-01-01', 0]]),
      new Map([[today, 30]]),
      100,
      today
    );
    expect(earlier[0]).toEqual({ date: '2026-01-01', value: 70 });
  });
});

describe('dailySalesByCategory and revenueSplit', () => {
  it('splits amounts per category while keeping the billed total', () => {
    const sales = [sale('2026-01-02', [chips, coffee, ticket])];

    expect(dailySalesByCategory(sales)).toEqual([
      { date: '2026-01-02', count: 1, amount: 53, product: 2, ticket: 50, coffee: 1, other: 0 },
    ]);
    expect(revenueSplit(sales)).toEqual({ product: 2, ticket: 50, coffee: 1, other: 0 });
  });
});

describe('topProducts', () => {
  it('ranks stocked products by units since the cutoff, ignoring synthetic lines', () => {
    const sales = [
      sale('2025-12-01', [{ ...chips, quantity: 50 }]),
      sale('2026-01-02', [{ ...chips, quantity: 3 }, coffee, ticket]),
      sale('2026-01-02', [{ barcode: '456', name: 'Soda', price: 1.5, quantity: 4 }]),
    ];

    expect(topProducts(sales, new Date('2026-01-01T00:00:00'))).toEqual([
      { name: 'Soda', qty: 4, revenue: 6 },
      { name: 'Chips', qty: 3, revenue: 6 },
    ]);
  });
});

describe('averageBasket', () => {
  it('averages paid sales and is zero without any', () => {
    expect(averageBasket([])).toBe(0);
    expect(averageBasket([{ totalAmount: 0 }, { totalAmount: 3 }, { totalAmount: 5 }])).toBe(4);
  });
});
