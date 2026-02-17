
import React from 'react';
import { Sale } from './types';

export const VAT_RATE = 0.16;

export const INITIAL_PRODUCTS = [
  { 
    id: '2', 
    name: 'Wholemeal Bread 400g', 
    price: 60, 
    category: 'Bakery', 
    stock: 30,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400'
  },
  { 
    id: '4', 
    name: 'Vegetable Oil 1L', 
    price: 320, 
    category: 'Groceries', 
    stock: 15,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400'
  },
  { 
    id: '5', 
    name: 'Classic Cola 500ml', 
    price: 70, 
    category: 'Beverages', 
    stock: 100,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400'
  },
  { 
    id: '8', 
    name: 'Antibacterial Bar Soap', 
    price: 150, 
    category: 'Personal Care', 
    stock: 25,
    image: 'https://images.unsplash.com/photo-1600857062241-98e5dba7f214?auto=format&fit=crop&q=80&w=400'
  },
  { 
    id: '9', 
    name: 'Long Grain Rice 2kg', 
    price: 340, 
    category: 'Groceries', 
    stock: 40,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400'
  },
  { 
    id: '10', 
    name: 'Instant Coffee 200g', 
    price: 650, 
    category: 'Beverages', 
    stock: 18,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=400'
  },
];

export const MOCK_STAFF = [
  { id: 's1', name: 'Admin User', pin: '1234', role: 'admin' },
  { id: 's2', name: 'Mercy W.', pin: '0000', role: 'cashier' },
];

export const CATEGORIES = ['Dairy', 'Bakery', 'Groceries', 'Beverages', 'Electronics', 'Personal Care'];

// Fix: Added missing subtotal, discount, and status properties to each sale object to satisfy the Sale interface.
export const MOCK_SALES: Sale[] = [
  {
    id: 'TXN891',
    timestamp: Date.now() - 3600000, // 1 hour ago
    items: [
      { productId: '2', name: 'Wholemeal Bread 400g', quantity: 2, price: 60, total: 120 },
      { productId: '5', name: 'Classic Cola 500ml', quantity: 1, price: 70, total: 70 }
    ],
    total: 190,
    subtotal: 190,
    discount: 0,
    tax: 190 * (0.16 / 1.16),
    paymentMethod: 'Cash',
    staffId: 's2',
    staffName: 'Mercy W.',
    etimsControlNumber: 'KRA-TXN891-992',
    status: 'active'
  },
  {
    id: 'TXN892',
    timestamp: Date.now() - 7200000, // 2 hours ago
    items: [
      { productId: '4', name: 'Vegetable Oil 1L', quantity: 1, price: 320, total: 320 },
      { productId: '9', name: 'Long Grain Rice 2kg', quantity: 1, price: 340, total: 340 }
    ],
    total: 660,
    subtotal: 660,
    discount: 0,
    tax: 660 * (0.16 / 1.16),
    paymentMethod: 'M-Pesa',
    staffId: 's1',
    staffName: 'Admin User',
    etimsControlNumber: 'KRA-TXN892-105',
    status: 'active'
  },
  {
    id: 'TXN893',
    timestamp: Date.now() - 86400000, // 24 hours ago
    items: [
      { productId: '10', name: 'Instant Coffee 200g', quantity: 1, price: 650, total: 650 }
    ],
    total: 650,
    subtotal: 650,
    discount: 0,
    tax: 650 * (0.16 / 1.16),
    paymentMethod: 'M-Pesa',
    staffId: 's2',
    staffName: 'Mercy W.',
    etimsControlNumber: 'KRA-TXN893-441',
    status: 'active'
  }
];
