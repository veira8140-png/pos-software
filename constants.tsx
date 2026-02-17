
import React from 'react';

export const VAT_RATE = 0.16;

export const INITIAL_PRODUCTS = [
  { id: '1', name: 'Milk 500ml', price: 65, category: 'Dairy', stock: 50 },
  { id: '2', name: 'Bread 400g', price: 60, category: 'Bakery', stock: 30 },
  { id: '3', name: 'Sugar 1kg', price: 180, category: 'Groceries', stock: 20 },
  { id: '4', name: 'Cooking Oil 1L', price: 240, category: 'Groceries', stock: 15 },
];

export const MOCK_STAFF = [
  { id: 's1', name: 'Admin User', pin: '1234', role: 'admin' },
  { id: 's2', name: 'Mercy W.', pin: '0000', role: 'cashier' },
];

export const CATEGORIES = ['Dairy', 'Bakery', 'Groceries', 'Beverages', 'Electronics', 'Personal Care'];
