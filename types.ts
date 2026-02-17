
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  sku?: string;
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

export interface Sale {
  id: string;
  timestamp: number;
  items: SaleItem[];
  total: number;
  tax: number; // 16% VAT
  paymentMethod: 'Cash' | 'M-Pesa';
  staffId: string;
  staffName: string;
  etimsControlNumber: string;
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
  currentStaff: Staff | null;
}
