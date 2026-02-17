
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  sku?: string;
  image: string;
}

export interface Staff {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'cashier';
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export type DiscountType = 'Fixed' | 'Percentage';

export interface Sale {
  id: string;
  timestamp: number;
  items: SaleItem[];
  total: number;
  subtotal: number;
  discount: number; // Final calculated discount value in KES
  discountConfig?: {
    type: DiscountType;
    value: number;
  };
  tax: number; // 16% VAT on discounted total
  paymentMethod: 'Cash' | 'M-Pesa' | 'Split';
  paymentDetails?: {
    cash: number;
    mpesa: number;
  };
  staffId: string;
  staffName: string;
  etimsControlNumber: string;
  status: 'active' | 'voided';
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  staffName: string;
  action: string;
  details: string;
}

export interface BusinessConfig {
  name: string;
  whatsappNumber: string;
  kraPin: string;
  address: string;
  currency: string;
}

export interface AppState {
  onboarded: boolean;
  business: BusinessConfig;
  staff: Staff[];
  products: Product[];
  sales: Sale[];
  logs: ActivityLog[];
  currentStaff: Staff | null;
}
