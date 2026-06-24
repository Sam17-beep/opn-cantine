import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/infrastructure/auth/admin-token';
import { getDb } from '@/lib/infrastructure/db/mongo';
import { employeeRepository } from '@/lib/infrastructure/repositories/employee.repository.mongo';

interface Buyer {
  employeeNumber: string;
  qty: number;
  revenue: number;
}

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();

  const name = request.nextUrl.searchParams.get('name');
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const db = await getDb();
  const rows = await db.collection('transactions').aggregate<{ _id: string; qty: number; revenue: number }>([
    { $unwind: '$items' },
    { $match: { 'items.barcode': '_event_', 'items.name': name } },
    {
      $group: {
        _id: '$cardNumber',
        qty: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
  ]).toArray();

  const employees = await employeeRepository.findAll();
  const byCardNumber = new Map(employees.map((e) => [e.cardNumber, e.employeeNumber]));

  const buyers: Buyer[] = rows
    .map((row) => ({
      employeeNumber: byCardNumber.get(row._id) ?? row._id,
      qty: row.qty,
      revenue: row.revenue,
    }))
    .sort((a, b) => b.qty - a.qty || a.employeeNumber.localeCompare(b.employeeNumber));

  return NextResponse.json({ buyers });
}
