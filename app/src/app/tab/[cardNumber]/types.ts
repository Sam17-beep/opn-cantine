export interface Employee {
  cardNumber: string;
  employeeNumber: string;
  tab: number;
}

export interface ScannedProduct {
  /**
   * Identifies this cart line. Barcode is not enough: two different events
   * share the `_event_` barcode while carrying their own name and price.
   */
  lineId: string;
  barcode: string;
  name: string;
  price: number;
  qty: number;
  /** Product id resolved at scan time; absent for quick-add pseudo items. */
  productId?: string | null;
  /** Set on event ticket lines so sales are attributed to the right option. */
  eventId?: string | null;
  optionId?: string | null;
}
