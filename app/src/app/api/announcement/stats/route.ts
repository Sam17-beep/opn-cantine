import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/infrastructure/auth/admin-token';
import { announcementRepository } from '@/lib/infrastructure/repositories/announcement.repository.mongo';
import { allTicketRows } from '@/lib/infrastructure/repositories/ticket-sales.query.mongo';
import { attributeTicketRows } from '@/lib/domain/ticket-options';

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();

  const [rows, events] = await Promise.all([allTicketRows(), announcementRepository.getAll()]);
  const byEvent = attributeTicketRows(rows, events);

  let qty = 0;
  let revenue = 0;
  for (const row of rows) {
    qty += row.qty;
    revenue += row.revenue;
  }

  return NextResponse.json({ byEvent, total: { qty, revenue: Math.round(revenue * 100) / 100 } });
}
