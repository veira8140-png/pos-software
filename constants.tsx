
import { Product, Staff, Branch, Customer, Supplier, Expense, Sale } from './types';

export const VAT_RATE = 0.16;

export const INITIAL_BRANCHES: Branch[] = [
  { id: 'b1', name: 'Nairobi CBD Branch', location: 'Kimathi Street' },
  { id: 'b2', name: 'Westlands Hub', location: 'Sarit Centre' },
  { id: 'b3', name: 'Mombasa Road Outlet', location: 'NextGen Mall' }
];

export const INITIAL_PRODUCTS: Product[] = [
  { 
    id: 'p1', name: 'Premium Wholemeal Bread 400g', price: 65, costPrice: 48, category: 'Bakery', stock: 45, minStock: 15,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400', barcode: '6161100002', supplierId: 's1'
  },
  { 
    id: 'p2', name: 'Pure Vegetable Oil 2L', price: 680, costPrice: 590, category: 'Groceries', stock: 12, minStock: 10,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400', barcode: '6161100004', supplierId: 's2'
  },
  { 
    id: 'p3', name: 'Refreshing Cola 500ml', price: 75, costPrice: 55, category: 'Beverages', stock: 150, minStock: 50,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400', barcode: '6161100005', supplierId: 's1'
  },
  { 
    id: 'p4', name: 'Organic Milk 1L', price: 120, costPrice: 95, category: 'Dairy', stock: 8, minStock: 20,
    image: 'https://images.unsplash.com/photo-1550583726-2248277c63b2?auto=format&fit=crop&q=80&w=400', barcode: '6161100006', supplierId: 's3'
  },
  { 
    id: 'p5', name: 'Basmati Rice 5kg', price: 1250, costPrice: 980, category: 'Groceries', stock: 25, minStock: 5,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400', barcode: '6161100007', supplierId: 's2'
  }
];

export const MOCK_STAFF: Staff[] = [
  { id: 'st1', name: 'Kamau Maina', pin: '1234', role: 'owner', branchId: 'b1' },
  { id: 'st2', name: 'Mary Njoki', pin: '0000', role: 'cashier', branchId: 'b1' },
  { id: 'st3', name: 'Alice Atieno', pin: '1111', role: 'manager', branchId: 'b2' },
  { id: 'st4', name: 'John Omondi', pin: '2222', role: 'cashier', branchId: 'b3' }
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'James Kariuki', phone: '254712345678', loyaltyPoints: 450, totalSpent: 25400, lastVisit: Date.now() - 86400000, creditLimit: 5000, currentDebt: 0 },
  { id: 'c2', name: 'Sarah Hassan', phone: '254788776655', loyaltyPoints: 120, totalSpent: 8900, lastVisit: Date.now() - 172800000, creditLimit: 2000, currentDebt: 450 },
  { id: 'c3', name: 'Business Client X', phone: '254700000000', loyaltyPoints: 2400, totalSpent: 156000, lastVisit: Date.now() - 3600000, creditLimit: 50000, currentDebt: 12400 }
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Brookside Dairy', contact: '020-123456', category: 'Dairy & Beverages', outstandingBalance: 15400 },
  { id: 's2', name: 'Pwani Life Ltd', contact: '041-987654', category: 'Groceries', outstandingBalance: 89000 },
  { id: 's3', name: 'Tuskys Wholesale', contact: '0711-223344', category: 'General Goods', outstandingBalance: 0 }
];

export const MOCK_EXPENSES: Expense[] = [
  { id: 'e1', amount: 45000, category: 'Rent', description: 'Main branch monthly rent', timestamp: Date.now() - 604800000, staffId: 'st1', branchId: 'b1' },
  { id: 'e2', amount: 1200, category: 'Transport', description: 'Stock delivery fuel', timestamp: Date.now() - 86400000, staffId: 'st2', branchId: 'b1' },
  { id: 'e3', amount: 8500, category: 'Electricity', description: 'KPLC Postpaid Bill', timestamp: Date.now() - 432000000, staffId: 'st3', branchId: 'b2' }
];

export const MOCK_SALES: Sale[] = [
  {
    id: 'TXN-ABC123', timestamp: Date.now() - 3600000, total: 1450, subtotal: 1450, discount: 0, tax: 200, 
    paymentMethod: 'M-Pesa', staffId: 'st2', staffName: 'Mary Njoki', branchId: 'b1', etimsControlNumber: 'KRA-XPQZ123', status: 'active',
    items: [{ productId: 'p1', name: 'Premium Wholemeal Bread 400g', quantity: 2, price: 65, costPrice: 48, total: 130 }]
  },
  {
    id: 'TXN-DEF456', timestamp: Date.now() - 7200000, total: 680, subtotal: 680, discount: 0, tax: 93, 
    paymentMethod: 'Cash', staffId: 'st2', staffName: 'Mary Njoki', branchId: 'b1', etimsControlNumber: 'KRA-LMN987', status: 'active',
    items: [{ productId: 'p2', name: 'Pure Vegetable Oil 2L', quantity: 1, price: 680, costPrice: 590, total: 680 }]
  }
];

export const CATEGORIES = ['Dairy', 'Bakery', 'Groceries', 'Beverages', 'Electronics', 'Personal Care', 'Hardware'];
