export interface SaleItem {
  barcode: string;
  name: string;
  price: number;
  quantity: number;
}

export type SaleStatus = 'pending' | 'applied' | 'failed';

export interface Sale {
  clientSaleId: string;
  cardNumber: string;
  items: SaleItem[];
  totalAmount: number;
  status: SaleStatus;
  createdAt: Date;
  appliedAt?: Date;
  failureReason?: string;
}

export class SaleEntity implements Sale {
  constructor(
    public readonly clientSaleId: string,
    public readonly cardNumber: string,
    public readonly items: SaleItem[],
    public readonly totalAmount: number,
    public readonly status: SaleStatus,
    public readonly createdAt: Date,
    public readonly appliedAt?: Date,
    public readonly failureReason?: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.clientSaleId || this.clientSaleId.trim().length === 0) {
      throw new Error('clientSaleId is required');
    }
    if (!this.cardNumber || this.cardNumber.trim().length === 0) {
      throw new Error('Card number is required');
    }
    if (!Array.isArray(this.items)) {
      throw new Error('Items must be an array');
    }
    if (this.totalAmount < 0) {
      throw new Error('Total amount must be >= 0');
    }
  }

  static createPending(
    clientSaleId: string,
    cardNumber: string,
    items: SaleItem[],
    totalAmount: number
  ): SaleEntity {
    return new SaleEntity(
      clientSaleId.trim(),
      cardNumber.trim(),
      items,
      totalAmount,
      'pending',
      new Date()
    );
  }
}
