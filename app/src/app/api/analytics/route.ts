import { NextRequest, NextResponse } from 'next/server';
import { transactionRepository } from '@/lib/infrastructure/repositories/transaction.repository.mongo';
import { productRepository } from '@/lib/infrastructure/repositories/product.repository.mongo';
import { restockEventRepository } from '@/lib/infrastructure/repositories/restock-event.repository.mongo';
import { employeeRepository } from '@/lib/infrastructure/repositories/employee.repository.mongo';
import { announcementRepository } from '@/lib/infrastructure/repositories/announcement.repository.mongo';
import { allTicketRows } from '@/lib/infrastructure/repositories/ticket-sales.query.mongo';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/infrastructure/auth/admin-token';
import { averageRevenuePerWeek } from '@/lib/domain/revenue-stats';
import { attributeTicketRows } from '@/lib/domain/ticket-options';
import {
  averageBasket,
  dailySalesByCategory,
  inventoryHistory,
  revenueSplit,
  toDateKey,
  topProducts,
} from '@/lib/domain/sales-breakdown';

const TOP_PRODUCTS_DAYS = 30;

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();

  try {
    const [transactions, products, restockEvents, employees, ticketRows, events] =
      await Promise.all([
        transactionRepository.findAll(),
        productRepository.findAll(),
        restockEventRepository.findAll(),
        employeeRepository.findAll(),
        allTicketRows(),
        announcementRepository.getAll(),
      ]);

    const daily = dailySalesByCategory(transactions);

    const transactionsByDay = daily.map((d) => ({
      date: d.date,
      count: d.count,
      amount: d.amount,
      products: d.product,
      tickets: d.ticket,
      coffee: d.coffee,
      other: d.other,
    }));

    // Tab history — cumulative sum of employee spending, ascending
    let cumulative = 0;
    const tabHistory = daily.map((d) => {
      cumulative += d.amount;
      return { date: d.date, cumulative: parseFloat(cumulative.toFixed(2)) };
    });

    const restocksByDay = new Map<string, number>();
    for (const event of restockEvents) {
      const key = toDateKey(new Date(event.timestamp));
      restocksByDay.set(key, (restocksByDay.get(key) ?? 0) + event.valueAdded);
    }

    // Negative stock means oversold units awaiting a restock, not negative value.
    const currentValue = products.reduce(
      (sum, p) => sum + p.price * Math.max(0, p.quantity),
      0
    );

    const now = new Date();
    const history = inventoryHistory(
      new Map(daily.map((d) => [d.date, d.product])),
      restocksByDay,
      currentValue,
      toDateKey(now)
    );

    const totalUnpaidTabs = parseFloat(
      employees.reduce((sum, e) => sum + e.tab, 0).toFixed(2)
    );

    const split = revenueSplit(transactions);

    const since = new Date(now);
    since.setDate(since.getDate() - TOP_PRODUCTS_DAYS);

    const byEvent = attributeTicketRows(ticketRows, events);
    const ticketRevenueByEvent = events
      .filter((e) => e.id && byEvent[e.id])
      .map((e) => ({
        eventId: e.id as string,
        title: e.title,
        qty: byEvent[e.id as string].qty,
        revenue: byEvent[e.id as string].revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      transactionsByDay,
      tabHistory,
      inventoryHistory: history,
      totalUnpaidTabs,
      weeklyRevenue: averageRevenuePerWeek(transactions, now),
      revenueSplit: {
        products: split.product,
        tickets: split.ticket,
        coffee: split.coffee,
        other: split.other,
      },
      averageBasket: averageBasket(transactions),
      topProducts: topProducts(transactions, since),
      ticketRevenueByEvent,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
