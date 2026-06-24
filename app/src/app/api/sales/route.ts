import { NextRequest, NextResponse } from 'next/server';
import { SaleApplicationService } from '@/lib/application/services/sale.application.service';
import { saleRepository } from '@/lib/infrastructure/repositories/sale.repository.mongo';
import { employeeRepository } from '@/lib/infrastructure/repositories/employee.repository.mongo';
import { productRepository } from '@/lib/infrastructure/repositories/product.repository.mongo';
import { transactionRepository } from '@/lib/infrastructure/repositories/transaction.repository.mongo';

const service = new SaleApplicationService(
  saleRepository,
  employeeRepository,
  productRepository,
  transactionRepository
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { clientSaleId, cardNumber, items, totalAmount } = body;

  if (
    !clientSaleId ||
    typeof clientSaleId !== 'string' ||
    !cardNumber ||
    typeof cardNumber !== 'string' ||
    !Array.isArray(items) ||
    typeof totalAmount !== 'number'
  ) {
    return NextResponse.json(
      { error: 'clientSaleId, cardNumber, items and totalAmount are required' },
      { status: 400 }
    );
  }

  try {
    const result = await service.commitSale(clientSaleId, cardNumber, items, totalAmount);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
