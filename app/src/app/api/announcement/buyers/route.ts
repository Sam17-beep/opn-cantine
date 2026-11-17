import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/infrastructure/auth/admin-token';
import { employeeRepository } from '@/lib/infrastructure/repositories/employee.repository.mongo';
import { announcementRepository } from '@/lib/infrastructure/repositories/announcement.repository.mongo';
import { eventTicketRows } from '@/lib/infrastructure/repositories/ticket-sales.query.mongo';
import { resolveTicketOption } from '@/lib/domain/ticket-options';

interface Buyer {
  employeeNumber: string;
  qty: number;
  revenue: number;
  byOption: Record<string, number>;
}

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();

  const eventId = request.nextUrl.searchParams.get('eventId');
  if (!eventId || !ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
  }

  const event = await announcementRepository.findById(eventId);
  if (!event) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const [rows, employees] = await Promise.all([eventTicketRows(event), employeeRepository.findAll()]);
  const byCardNumber = new Map(employees.map((e) => [e.cardNumber, e.employeeNumber]));

  const byCard = new Map<string, Buyer>();
  for (const row of rows) {
    const optionId = resolveTicketOption(row, event);
    if (!optionId) continue;
    const buyer = byCard.get(row.cardNumber) ?? {
      employeeNumber: byCardNumber.get(row.cardNumber) ?? row.cardNumber,
      qty: 0,
      revenue: 0,
      byOption: {},
    };
    buyer.qty += row.qty;
    buyer.revenue = Math.round((buyer.revenue + row.revenue) * 100) / 100;
    buyer.byOption[optionId] = (buyer.byOption[optionId] ?? 0) + row.qty;
    byCard.set(row.cardNumber, buyer);
  }

  const buyers = [...byCard.values()].sort(
    (a, b) => b.qty - a.qty || a.employeeNumber.localeCompare(b.employeeNumber)
  );

  return NextResponse.json({ buyers });
}
