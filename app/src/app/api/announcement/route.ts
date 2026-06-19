import { NextRequest, NextResponse } from 'next/server';
import { announcementRepository } from '@/lib/infrastructure/repositories/announcement.repository.mongo';
import { getDb } from '@/lib/infrastructure/db/mongo';

export async function GET(request: NextRequest) {
  const event = await announcementRepository.getCurrent();
  if (!event) return NextResponse.json(null);

  const employeeNumber = request.nextUrl.searchParams.get('employeeNumber');
  if (!employeeNumber || !event.product) {
    return NextResponse.json(event);
  }

  const db = await getDb();
  const rows = await db.collection('transactions').aggregate<{ qty: number }>([
    { $match: { employeeNumber } },
    { $unwind: '$items' },
    { $match: { 'items.barcode': '_event_', 'items.name': event.product.name } },
    { $group: { _id: null, qty: { $sum: '$items.quantity' } } },
  ]).toArray();

  return NextResponse.json({ ...event, purchasedQty: rows[0]?.qty ?? 0 });
}
