export interface LineItem {
  sku?: string;
  description?: string;
  qty: number;
  unitPrice: number;
  discountRate?: number;
  taxRate?: number;
}

export interface NormalizedLine {
  sku: string;
  description: string;
  qty: number;
  unit: number;
  gross: number;
  discount: number;
  net: number;
  tax: number;
  total: number;
}
