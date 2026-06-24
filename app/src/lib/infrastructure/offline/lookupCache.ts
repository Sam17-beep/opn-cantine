import { idbGet, idbGetAll, idbPut, STORE_EMPLOYEES, STORE_PRODUCTS } from './db';

export interface CachedEmployee {
  cardNumber: string;
  employeeNumber: string;
}

export interface CachedProduct {
  barcode: string;
  name: string;
  price: number;
  quantity: number;
}

export async function getCachedEmployee(cardNumber: string): Promise<CachedEmployee | undefined> {
  return idbGet<CachedEmployee>(STORE_EMPLOYEES, cardNumber);
}

export async function putCachedEmployee(employee: { cardNumber: string; employeeNumber: string }): Promise<void> {
  await idbPut<CachedEmployee>(STORE_EMPLOYEES, {
    cardNumber: employee.cardNumber,
    employeeNumber: employee.employeeNumber,
  });
}

export async function searchCachedEmployees(query: string): Promise<CachedEmployee[]> {
  const all = await idbGetAll<CachedEmployee>(STORE_EMPLOYEES);
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return all.filter((e) => e.employeeNumber.toLowerCase().includes(q));
}

export async function getCachedProduct(barcode: string): Promise<CachedProduct | undefined> {
  return idbGet<CachedProduct>(STORE_PRODUCTS, barcode);
}

export async function putCachedProduct(product: { barcode: string; name: string; price: number; quantity?: number }): Promise<void> {
  await idbPut<CachedProduct>(STORE_PRODUCTS, {
    barcode: product.barcode,
    name: product.name,
    price: product.price,
    quantity: product.quantity ?? 0,
  });
}
