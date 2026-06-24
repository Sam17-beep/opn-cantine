import { idbDelete, idbGet, idbPut, STORE_CART_DRAFT } from './db';

const DRAFT_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6h — old enough to survive a long outage, not so old it resurrects a stale, forgotten cart

export interface CartDraftItem {
  barcode: string;
  name: string;
  price: number;
  qty: number;
}

export interface CartDraft {
  cardNumber: string;
  scannedProducts: CartDraftItem[];
  pendingTotal: number;
  updatedAt: number;
}

export async function saveCartDraft(draft: Omit<CartDraft, 'updatedAt'>): Promise<void> {
  await idbPut<CartDraft>(STORE_CART_DRAFT, { ...draft, updatedAt: Date.now() });
}

export async function loadCartDraft(cardNumber: string): Promise<CartDraft | undefined> {
  const draft = await idbGet<CartDraft>(STORE_CART_DRAFT, cardNumber);
  if (!draft) return undefined;
  if (Date.now() - draft.updatedAt > DRAFT_MAX_AGE_MS) {
    await idbDelete(STORE_CART_DRAFT, cardNumber);
    return undefined;
  }
  return draft;
}

export async function clearCartDraft(cardNumber: string): Promise<void> {
  await idbDelete(STORE_CART_DRAFT, cardNumber);
}
