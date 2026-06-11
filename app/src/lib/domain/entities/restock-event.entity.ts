export interface RestockEvent {
  id?: string;
  productId: string;
  productName: string;
  quantityAdded: number;
  unitPrice: number;
  valueAdded: number;
  timestamp: Date;
}
