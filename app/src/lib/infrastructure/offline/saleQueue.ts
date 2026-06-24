import { idbDelete, idbGetAll, idbPut, STORE_PENDING_SALES } from './db';

export const QUEUED_SALE_TOAST_KEY = 'cantine:queuedSaleToast';

export interface PendingSaleItem {
  barcode: string;
  name: string;
  price: number;
  quantity: number;
}

export interface PendingSale {
  clientSaleId: string;
  cardNumber: string;
  items: PendingSaleItem[];
  totalAmount: number;
  queuedAt: number;
}

export async function enqueueSale(sale: Omit<PendingSale, 'queuedAt'>): Promise<void> {
  await idbPut<PendingSale>(STORE_PENDING_SALES, { ...sale, queuedAt: Date.now() });
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const sales = await idbGetAll<PendingSale>(STORE_PENDING_SALES);
  return sales.sort((a, b) => a.queuedAt - b.queuedAt);
}

async function removeSale(clientSaleId: string): Promise<void> {
  await idbDelete(STORE_PENDING_SALES, clientSaleId);
}

let replayInFlight = false;

/**
 * Drains the queue oldest-first so multiple sales for the same employee compound
 * their tab delta in the right order. Stops at the first failure rather than
 * burning through retries against a connection that's still down.
 */
export async function replayPendingSales(): Promise<void> {
  if (replayInFlight) return;
  replayInFlight = true;

  try {
    const pending = await getPendingSales();
    for (const sale of pending) {
      try {
        const res = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientSaleId: sale.clientSaleId,
            cardNumber: sale.cardNumber,
            items: sale.items,
            totalAmount: sale.totalAmount,
          }),
        });

        if (res.ok) {
          await removeSale(sale.clientSaleId);
          continue;
        }

        if (res.status >= 400 && res.status < 500) {
          // Server reached and explicitly rejected (e.g. employee no longer exists) —
          // retrying won't help. Drop it rather than blocking every later queued sale
          // forever, but log loudly since this is a lost sale that needs manual follow-up.
          console.error('Queued sale rejected by server, dropping', sale, res.status);
          await removeSale(sale.clientSaleId);
          continue;
        }

        break; // 5xx — possibly transient, leave queued and try again later
      } catch {
        break; // network still down — stop, the next trigger will resume
      }
    }
  } finally {
    replayInFlight = false;
  }
}
