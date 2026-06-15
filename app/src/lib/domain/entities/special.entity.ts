export interface SpecialOverride {
  barcode: string;
  productName: string;
  originalPrice: number;
  overridePrice: number;
}

export interface Special {
  id?: string;
  name: string;
  start?: string | null;
  end?: string | null;
  overrides: SpecialOverride[];
  createdAt?: Date;
  updatedAt?: Date;
}
