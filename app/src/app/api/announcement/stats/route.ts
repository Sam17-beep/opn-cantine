import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/infrastructure/auth/admin-token';
import { getDb } from '@/lib/infrastructure/db/mongo';

interface StatsByName {
  [name: string]: { qty: number; revenue: number };
}

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();

  const db = await getDb();
  const rows = await db.collection('transactions').aggregate<{ _id: string; qty: number; revenue: number }>([
    { $unwind: '$items' },
    { $match: { 'items.barcode': '_event_' } },
    {
      $group: {
        _id: '$items.name',
        qty: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
  ]).toArray();

  const byName: StatsByName = {};
  let totalQty = 0;
  let totalRevenue = 0;

  for (const row of rows) {
    byName[row._id] = { qty: row.qty, revenue: row.revenue };
    totalQty += row.qty;
    totalRevenue += row.revenue;
  }

  return NextResponse.json({ byName, total: { qty: totalQty, revenue: totalRevenue } });
}
