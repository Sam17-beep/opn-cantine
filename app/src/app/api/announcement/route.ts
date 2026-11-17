import { NextRequest, NextResponse } from 'next/server';
import { announcementRepository } from '@/lib/infrastructure/repositories/announcement.repository.mongo';
import { eventTicketRows } from '@/lib/infrastructure/repositories/ticket-sales.query.mongo';
import { attributeTicketRows } from '@/lib/domain/ticket-options';

export async function GET(request: NextRequest) {
  const event = await announcementRepository.getCurrent();
  if (!event) return NextResponse.json(null);

  const cardNumber = request.nextUrl.searchParams.get('cardNumber');
  if (!cardNumber || !event.id || event.options.length === 0) {
    return NextResponse.json(event);
  }

  const rows = await eventTicketRows(event, cardNumber);
  const stats = attributeTicketRows(rows, [event])[event.id];
  const byOption = Object.fromEntries(
    Object.entries(stats?.byOption ?? {}).map(([optionId, s]) => [optionId, s.qty])
  );
  const total = stats?.qty ?? 0;

  return NextResponse.json({ ...event, purchased: { total, byOption }, purchasedQty: total });
}
