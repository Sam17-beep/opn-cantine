import type { Db } from 'mongodb';

export const COLLECTIONS = [
  'employees',
  'transactions',
  'products',
  'announcements',
  'restock_events',
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

export async function getCounts(db: Db): Promise<Record<CollectionName, number>> {
  const counts = {} as Record<CollectionName, number>;
  for (const name of COLLECTIONS) {
    counts[name] = await db.collection(name).countDocuments();
  }
  return counts;
}

export function printCounts(label: string, counts: Record<string, number>) {
  console.log(label);
  for (const name of COLLECTIONS) {
    console.log(`  ${name.padEnd(16)} ${counts[name] ?? 0}`);
  }
}
