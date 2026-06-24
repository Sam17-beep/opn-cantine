import { Sale } from '../entities/sale.entity';

export type InsertPendingResult = Sale | 'duplicate';

export interface ISaleRepository {
  findByClientSaleId(clientSaleId: string): Promise<Sale | null>;
  insertPending(sale: Sale): Promise<InsertPendingResult>;
  markApplied(clientSaleId: string): Promise<void>;
  markFailed(clientSaleId: string, reason: string): Promise<void>;
}
