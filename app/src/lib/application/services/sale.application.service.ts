import { SaleEntity, SaleItem } from '@/lib/domain/entities/sale.entity';
import { TransactionEntity } from '@/lib/domain/entities/transaction.entity';
import { ISaleRepository } from '@/lib/domain/ports/sale.repository.port';
import { IEmployeeRepository } from '@/lib/domain/ports/employee.repository.port';
import { IProductRepository } from '@/lib/domain/ports/product.repository.port';
import { ITransactionRepository } from '@/lib/domain/ports/transaction.repository.port';

export interface CommitSaleResult {
  alreadyProcessed: boolean;
  status: 'applied' | 'failed';
}

export class SaleApplicationService {
  constructor(
    private readonly saleRepository: ISaleRepository,
    private readonly employeeRepository: IEmployeeRepository,
    private readonly productRepository: IProductRepository,
    private readonly transactionRepository: ITransactionRepository
  ) {}

  async commitSale(
    clientSaleId: string,
    cardNumber: string,
    items: SaleItem[],
    totalAmount: number
  ): Promise<CommitSaleResult> {
    const existing = await this.saleRepository.findByClientSaleId(clientSaleId);
    if (existing) {
      // Already received before — most commonly because the original request succeeded
      // server-side but its response was lost over a flaky connection. Never reapply.
      return { alreadyProcessed: true, status: existing.status === 'applied' ? 'applied' : 'failed' };
    }

    const pending = SaleEntity.createPending(clientSaleId, cardNumber, items, totalAmount);
    const inserted = await this.saleRepository.insertPending(pending);
    if (inserted === 'duplicate') {
      // Race: a concurrent retry of the same clientSaleId got there first.
      const raced = await this.saleRepository.findByClientSaleId(clientSaleId);
      return { alreadyProcessed: true, status: raced?.status === 'applied' ? 'applied' : 'failed' };
    }

    const employee = await this.employeeRepository.findByCardNumber(cardNumber);
    if (!employee) {
      await this.saleRepository.markFailed(clientSaleId, 'Employee not found');
      throw new Error('Employee not found');
    }

    await this.employeeRepository.updateTab(cardNumber, employee.tab + totalAmount);

    for (const item of items) {
      const product = await this.productRepository.findByBarcode(item.barcode);
      if (!product) continue;
      // A stale offline stock count may have let the cashier add an item that's since
      // sold out — don't fail the whole sale over it, the decrement just becomes a no-op.
      await this.productRepository.decrementQuantity(product.id, item.quantity);
    }

    await this.transactionRepository.save(
      TransactionEntity.create(cardNumber, items, totalAmount)
    );

    await this.saleRepository.markApplied(clientSaleId);

    return { alreadyProcessed: false, status: 'applied' };
  }
}
