import { NextRequest, NextResponse } from 'next/server';
import { transactionRepository } from '@/lib/infrastructure/repositories/transaction.repository.mongo';
import { productRepository } from '@/lib/infrastructure/repositories/product.repository.mongo';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/infrastructure/auth/admin-token';

const WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WORK_DAYS_PER_WEEK = 5;

type Urgency = 'critical' | 'warning' | 'ok' | 'unknown';

function urgencyOrder(u: Urgency): number {
  return { critical: 0, warning: 1, ok: 2, unknown: 3 }[u];
}

// Count operating days (Mon-Fri) in [startMs, endMs], inclusive by calendar day.
function countWeekdays(startMs: number, endMs: number): number {
  const cur = new Date(startMs);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(endMs);
  end.setHours(0, 0, 0, 0);

  let count = 0;
  while (cur.getTime() <= end.getTime()) {
    const dow = cur.getDay();
    if (dow >= 1 && dow <= 5) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) return unauthorizedResponse();

  try {
    const [transactions, products] = await Promise.all([
      transactionRepository.findAll(),
      productRepository.findAll(),
    ]);

    const now = Date.now();
    const windowStart = now - WINDOW_DAYS * MS_PER_DAY;

    // Build per-barcode maps: units sold in window, and date of first ever sale
    const unitsSoldInWindow = new Map<string, number>();
    const firstSaleDate = new Map<string, number>(); // barcode → timestamp ms

    for (const tx of transactions) {
      const ts = new Date(tx.timestamp).getTime();
      for (const item of tx.items) {
        const bc = item.barcode;

        // Track first sale ever (for windowDays clamping)
        const existing = firstSaleDate.get(bc);
        if (existing === undefined || ts < existing) {
          firstSaleDate.set(bc, ts);
        }

        // Accumulate units sold within the 30-day window
        if (ts >= windowStart) {
          unitsSoldInWindow.set(bc, (unitsSoldInWindow.get(bc) ?? 0) + item.quantity);
        }
      }
    }

    const productData = products.map((p) => {
      // Find any barcode of this product that has sales data
      const totalUnitsSold = p.barcodes.reduce(
        (sum, bc) => sum + (unitsSoldInWindow.get(bc) ?? 0),
        0
      );

      const firstTs = p.barcodes.reduce<number | undefined>((earliest, bc) => {
        const ts = firstSaleDate.get(bc);
        if (ts === undefined) return earliest;
        return earliest === undefined ? ts : Math.min(earliest, ts);
      }, undefined);

      const hasSalesInWindow = totalUnitsSold > 0;

      let avgUnitsPerWeek = 0;
      let weeksRemaining: number | null = null;

      if (hasSalesInWindow && firstTs !== undefined) {
        // Effective measurement start: 30-day window start, or first sale if more recent.
        const effectiveStart = Math.max(now - WINDOW_DAYS * MS_PER_DAY, firstTs);
        // Only weekdays count as operating days (weekends have no sales).
        const weekdaysElapsed = Math.max(1, countWeekdays(effectiveStart, now));
        const avgUnitsPerWeekday = totalUnitsSold / weekdaysElapsed;
        avgUnitsPerWeek = avgUnitsPerWeekday * WORK_DAYS_PER_WEEK;
        weeksRemaining =
          avgUnitsPerWeek > 0 ? p.quantity / avgUnitsPerWeek : null;
      }

      let urgency: Urgency;
      if (p.quantity === 0 || (weeksRemaining !== null && weeksRemaining <= 1)) {
        urgency = 'critical';
      } else if (weeksRemaining !== null && weeksRemaining <= 2) {
        urgency = 'warning';
      } else if (weeksRemaining !== null) {
        urgency = 'ok';
      } else {
        urgency = 'unknown';
      }

      return {
        productId: p.id,
        name: p.name,
        currentQty: p.quantity,
        price: p.price,
        totalUnitsSold,
        avgUnitsPerWeek: Math.round(avgUnitsPerWeek * 10) / 10,
        weeksRemaining: weeksRemaining !== null ? Math.floor(weeksRemaining) : null,
        urgency,
      };
    });

    // Sort by urgency group, then by weeksRemaining ascending (most urgent first)
    productData.sort((a, b) => {
      const urgencyDiff = urgencyOrder(a.urgency) - urgencyOrder(b.urgency);
      if (urgencyDiff !== 0) return urgencyDiff;
      if (a.weeksRemaining === null && b.weeksRemaining === null) return a.name.localeCompare(b.name);
      if (a.weeksRemaining === null) return 1;
      if (b.weeksRemaining === null) return -1;
      return a.weeksRemaining - b.weeksRemaining;
    });

    const summary = {
      critical: productData.filter((p) => p.urgency === 'critical').length,
      warning: productData.filter((p) => p.urgency === 'warning').length,
      ok: productData.filter((p) => p.urgency === 'ok').length,
      unknown: productData.filter((p) => p.urgency === 'unknown').length,
    };

    return NextResponse.json({ products: productData, summary });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
