
export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  category: string;
  stock: number;
  minStock: number;
  sku?: string;
  image: string;
  barcode?: string;
  supplierId?: string;
}

export type StaffRole = 'owner' | 'manager' | 'accountant' | 'auditor' | 'cashier';

export interface Staff {
  id: string;
  name: string;
  pin: string;
  role: StaffRole;
  branchId: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  code?: string;
  quantity: number;
  price: number;
  costPrice: number;
  total: number;
}

export type DiscountType = 'Fixed' | 'Percentage';

export interface Sale {
  id: string;
  timestamp: number;
  items: SaleItem[];
  total: number;
  subtotal: number;
  discount: number;
  discountConfig?: {
    type: DiscountType;
    value: number;
  };
  tax: number;
  paymentMethod: 'Cash' | 'M-Pesa' | 'Card' | 'Credit';
  staffId: string;
  staffName: string;
  branchId: string;
  customerId?: string;
  etimsControlNumber: string;
  status: 'active' | 'voided';
}

export interface Expense {
  id: string;
  amount: number;
  category: 'Rent' | 'Electricity' | 'Water' | 'Transport' | 'Salaries' | 'Supplies' | 'Other';
  description: string;
  timestamp: number;
  staffId: string;
  branchId: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  loyaltyPoints: number;
  totalSpent: number;
  lastVisit: number;
  creditLimit: number;
  currentDebt: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  category: string;
  outstandingBalance: number;
}

export interface Debt {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  timestamp: number;
  saleId: string;
  status: 'pending' | 'paid';
}

export interface Branch {
  id: string;
  name: string;
  location: string;
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
  email?: string;
  kraPin: string;
  address: string;
  currency: string;
}

export interface AppState {
  onboarded: boolean;
  business: BusinessConfig;
  branches: Branch[];
  staff: Staff[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  customers: Customer[];
  suppliers: Supplier[];
  debts: Debt[];
  logs: ActivityLog[];
  currentStaff: Staff | null;
  currentBranchId: string;
  integrations: {
    google: { connected: boolean; lastSync: number | null };
    zoho: { connected: boolean; lastSync: number | null };
    qbo: { connected: boolean; lastSync: number | null };
  };
}
