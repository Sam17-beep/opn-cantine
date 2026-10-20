import { Transaction, InventoryLine } from '../entities/transaction.entity';
import { SpendingTotal } from '../leaderboard';

export interface PaginatedOptions {
  page: number;
  pageSize: number;
  cardNumber?: string;
  items?: string[];
}

export interface PaginatedResult {
  data: Transaction[];
  total: number;
}

/** `created: false` means this sale id was already recorded (a retry). */
export interface InsertOnceResult {
  created: boolean;
  transaction: Transaction;
}

export interface ITransactionRepository {
  save(transaction: Transaction): Promise<Transaction>;
  /** Inserts a sale keyed by its id, or returns the already-recorded one. */
  insertOnce(transaction: Transaction): Promise<InsertOnceResult>;
  markSettlement(
    id: string,
    settlement: { tabApplied: boolean; inventory: InventoryLine[]; settled: boolean }
  ): Promise<void>;
  findById(id: string): Promise<Transaction | null>;
  findAll(): Promise<Transaction[]>;
  findByCardNumber(cardNumber: string): Promise<Transaction[]>;
  findPaginated(options: PaginatedOptions): Promise<PaginatedResult>;
  findDistinctItems(): Promise<string[]>;
  /** Total spent per card since `since`, ignoring the given cards. */
  sumSpendingByCard(since: Date, excludeCardNumbers: string[]): Promise<SpendingTotal[]>;
}
