export interface TransactionItem {
  barcode: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Transaction {
  id?: string;
  cardNumber: string;
  items: TransactionItem[];
  totalAmount: number;
  timestamp: Date;
}

export class TransactionEntity implements Transaction {
  constructor(
    public readonly cardNumber: string,
    public readonly items: TransactionItem[],
    public readonly totalAmount: number,
    public readonly timestamp: Date,
    public readonly id?: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.cardNumber || this.cardNumber.trim().length === 0) {
      throw new Error('Card number is required');
    }

    if (this.totalAmount < 0) {
      throw new Error('Total amount must be >= 0');
    }

    if (!Array.isArray(this.items)) {
      throw new Error('Items must be an array');
    }
  }

  static create(
    cardNumber: string,
    items: TransactionItem[],
    totalAmount: number
  ): TransactionEntity {
    return new TransactionEntity(
      cardNumber.trim(),
      items,
      totalAmount,
      new Date()
    );
  }
}
