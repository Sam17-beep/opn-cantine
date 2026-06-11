import { NextRequest, NextResponse } from 'next/server';
import { ProductApplicationService } from '@/lib/application/services/product.application.service';
import { productRepository } from '@/lib/infrastructure/repositories/product.repository.mongo';
import { restockEventRepository } from '@/lib/infrastructure/repositories/restock-event.repository.mongo';
import {
  verifyAdminRequest,
  unauthorizedResponse,
} from '@/lib/infrastructure/auth/admin-token';

const service = new ProductApplicationService(productRepository);

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();

  const body = await request.json();
  const { updates } = body;

  if (!updates || !Array.isArray(updates)) {
    return NextResponse.json(
      { error: 'updates array is required' },
      { status: 400 }
    );
  }

  // Snapshot current quantities before applying updates
  const productsBeforeUpdate = await Promise.all(
    updates.map((u: { id: string }) => productRepository.findById(u.id))
  );

  const results = await service.bulkRestock(updates);

  // Log a restock event for each product whose quantity increased
  const now = new Date();
  await Promise.all(
    updates.map(async (u: { id: string; quantity: number }, i: number) => {
      const before = productsBeforeUpdate[i];
      if (!before) return;
      const quantityAdded = u.quantity - before.quantity;
      if (quantityAdded <= 0) return;
      await restockEventRepository.save({
        productId: before.id,
        productName: before.name,
        quantityAdded,
        unitPrice: before.price,
        valueAdded: parseFloat((quantityAdded * before.price).toFixed(2)),
        timestamp: now,
      });
    })
  );

  return NextResponse.json({ results });
}
