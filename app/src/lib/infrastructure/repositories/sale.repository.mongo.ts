import { Sale } from '@/lib/domain/entities/sale.entity';
import { ISaleRepository, InsertPendingResult } from '@/lib/domain/ports/sale.repository.port';
import { getDb } from '../db/mongo';

interface MongoServerError extends Error {
  code?: number;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as MongoServerError).code === 11000;
}

export class MongoSaleRepository implements ISaleRepository {
  private readonly collectionName = 'sales';
  private indexesEnsured: Promise<void> | null = null;

  private async collection() {
    const db = await getDb();
    const col = db.collection<Sale>(this.collectionName);
    if (!this.indexesEnsured) {
      this.indexesEnsured = col
        .createIndex({ clientSaleId: 1 }, { unique: true })
        .then(() => undefined);
    }
    await this.indexesEnsured;
    return col;
  }

  async findByClientSaleId(clientSaleId: string): Promise<Sale | null> {
    const col = await this.collection();
    return col.findOne({ clientSaleId });
  }

  async insertPending(sale: Sale): Promise<InsertPendingResult> {
    const col = await this.collection();
    try {
      await col.insertOne({ ...sale });
      return sale;
    } catch (error) {
      if (isDuplicateKeyError(error)) return 'duplicate';
      throw error;
    }
  }

  async markApplied(clientSaleId: string): Promise<void> {
    const col = await this.collection();
    await col.updateOne(
      { clientSaleId },
      { $set: { status: 'applied', appliedAt: new Date() } }
    );
  }

  async markFailed(clientSaleId: string, reason: string): Promise<void> {
    const col = await this.collection();
    await col.updateOne(
      { clientSaleId },
      { $set: { status: 'failed', failureReason: reason } }
    );
  }
}

export const saleRepository = new MongoSaleRepository();
