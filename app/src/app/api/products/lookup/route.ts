import { NextRequest, NextResponse } from 'next/server';
import { ProductApplicationService } from '@/lib/application/services/product.application.service';
import { productRepository } from '@/lib/infrastructure/repositories/product.repository.mongo';
import { specialRepository } from '@/lib/infrastructure/repositories/special.repository.mongo';

const service = new ProductApplicationService(productRepository);

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get('barcode');

  if (!barcode) {
    return NextResponse.json(
      { error: 'barcode is required' },
      { status: 400 }
    );
  }

  const product = await service.lookupByBarcode(barcode);

  if (!product) {
    return NextResponse.json({ found: false });
  }

  const today = new Date().toISOString().split('T')[0];
  const activeSpecials = await specialRepository.getActive(today);

  let finalPrice = product.price;
  let discounted = false;

  outer: for (const special of activeSpecials) {
    for (const override of special.overrides) {
      if (override.barcode === barcode) {
        finalPrice = override.overridePrice;
        discounted = true;
        break outer;
      }
    }
  }

  return NextResponse.json({
    found: true,
    product: { ...product, price: finalPrice },
    discounted,
  });
}
