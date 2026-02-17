
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ShoppingBag, 
  CreditCard, 
  Smartphone,
  Printer,
  ChevronRight,
  Send,
  Package,
  Receipt as ReceiptIcon,
  UserPlus,
  Loader2
} from 'lucide-react';
import Layout from './components/Layout';
import Receipt from './components/Receipt';
import { Product, Staff, Sale, BusinessConfig, AppState, SaleItem } from './types';
import { INITIAL_PRODUCTS, MOCK_STAFF, VAT_RATE, CATEGORIES } from './constants';
import { generateDailySummary } from './services/geminiService';

const App: React.FC = () => {
  // Persistence
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('veira_pos_state');
    if (saved) return JSON.parse(saved);
    return {
      onboarded: false,
      business: { name: '', whatsappNumber: '', kraPin: '', address: '', currency: 'KES' },
      staff: MOCK_STAFF,
      products: INITIAL_PRODUCTS,
      sales: [],
      currentStaff: null
    };
  });

  useEffect(() => {
    localStorage.setItem('veira_pos_state', JSON.stringify(state));
  }, [state]);

  const [activeTab, setActiveTab] = useState('sales');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [pinInput, setPinInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'M-Pesa'>('Cash');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // --- Handlers ---
  const handleOnboarding = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setState(prev => ({
      ...prev,
      onboarded: true,
      business: {
        name: formData.get('businessName') as string,
        whatsappNumber: formData.get('whatsapp') as string,
        kraPin: formData.get('kraPin') as string,
        address: formData.get('address') as string,
        currency: 'KES'
      }
    }));
  };

  const handleLogin = () => {
    const staffMember = state.staff.find(s => s.pin === pinInput);
    if (staffMember) {
      setState(prev => ({ ...prev, currentStaff: staffMember }));
      setPinInput('');
    } else {
      alert('Invalid PIN');
      setPinInput('');
    }
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return alert('Out of stock');
    
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: product.price,
        total: product.price
      }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (!state.currentStaff) return;

    const total = cart.reduce((acc, item) => acc + item.total, 0);
    const tax = total * (VAT_RATE / (1 + VAT_RATE)); 
    
    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      timestamp: Date.now(),
      items: cart,
      total,
      tax,
      paymentMethod,
      staffId: state.currentStaff.id,
      staffName: state.currentStaff.name,
      etimsControlNumber: `KRA-ETIMS-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`
    };

    setState(prev => ({
      ...prev,
      sales: [newSale, ...prev.sales],
      products: prev.products.map(p => {
        const cartItem = cart.find(ci => ci.productId === p.id);
        return cartItem ? { ...p, stock: p.stock - cartItem.quantity } : p;
      })
    }));

    setLastSale(newSale);
    setCart([]);
    setIsReceiptOpen(true);
  };

  const handleProductSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productData = {
      name: formData.get('name') as string,
      price: parseFloat(formData.get('price') as string),
      category: formData.get('category') as string,
      stock: parseInt(formData.get('stock') as string),
    };

    if (editingProduct) {
      setState(prev => ({
        ...prev,
        products: prev.products.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p)
      }));
    } else {
      setState(prev => ({
        ...prev,
        products: [...prev.products, { id: Date.now().toString(), ...productData }]
      }));
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleStaffSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const staffData = {
      name: formData.get('name') as string,
      role: formData.get('role') as 'admin' | 'cashier',
      pin: formData.get('pin') as string,
    };

    if (editingStaff) {
      setState(prev => ({
        ...prev,
        staff: prev.staff.map(s => s.id === editingStaff.id ? { ...s, ...staffData } : s)
      }));
    } else {
      setState(prev => ({
        ...prev,
        staff: [...prev.staff, { id: Date.now().toString(), ...staffData }]
      }));
    }
    setIsStaffModalOpen(false);
    setEditingStaff(null);
  };

  const deleteProduct = (id: string) => {
    if (confirm('Delete this product?')) {
      setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
    }
  };

  const deleteStaff = (id: string) => {
    if (state.staff.length <= 1) return alert('At least one staff member required');
    if (confirm('Remove this staff member?')) {
      setState(prev => ({ ...prev, staff: prev.staff.filter(s => s.id !== id) }));
    }
  };

  const handleDailySummary = async () => {
    const summaryText = await generateDailySummary(state.sales, state.products, state.business.name);
    const whatsappUrl = `https://wa.me/${state.business.whatsappNumber}?text=${encodeURIComponent(summaryText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrint = () => {
    setIsPrinting(true);
    // Focus the window to ensure the print dialog is captured
    window.focus();
    
    // Give browser a moment to render print-specific styles before showing dialog
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error("Print failed:", err);
        alert("Print failed. Please check your printer settings.");
      } finally {
        setIsPrinting(false);
      }
    }, 250);
  };

  // --- Main Render ---
  return (
    <div className="min-h-screen">
      {/* 1. APP UI CONTAINER */}
      <div className="no-print min-h-screen bg-gray-50">
        {!state.onboarded ? (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6">
            <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full animate-in fade-in zoom-in duration-300">
              <div className="text-center mb-10">
                <h1 className="text-4xl font-black text-gray-800">Veira</h1>
                <p className="text-gray-500 font-medium">Setup your retail business in seconds</p>
              </div>
              <form onSubmit={handleOnboarding} className="space-y-6">
                <input name="businessName" required className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Business Name" />
                <input name="whatsapp" required className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="WhatsApp (254...)" />
                <input name="kraPin" required className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="KRA PIN" />
                <input name="address" required className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Physical Address" />
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl flex items-center justify-center space-x-2">
                  <span>Start Selling</span>
                  <ChevronRight size={20} />
                </button>
              </form>
            </div>
          </div>
        ) : !state.currentStaff ? (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="text-center max-w-sm w-full">
              <h1 className="text-4xl font-bold text-gray-900 mb-8 uppercase tracking-tighter">Enter PIN</h1>
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 mb-6">
                <div className="flex justify-center space-x-3 mb-8">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-4 h-4 rounded-full border-2 border-indigo-200 ${pinInput.length > i ? 'bg-indigo-600 border-indigo-600' : ''}`}></div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'Enter'].map(btn => (
                    <button
                      key={btn.toString()}
                      onClick={() => {
                        if (btn === 'C') setPinInput('');
                        else if (btn === 'Enter') handleLogin();
                        else if (pinInput.length < 4) setPinInput(p => p + btn);
                      }}
                      className={`h-16 rounded-2xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 ${
                        typeof btn === 'number' ? 'bg-gray-50 text-gray-700 hover:bg-gray-100' : 
                        btn === 'Enter' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-red-50 text-red-500'
                      }`}
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Layout 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            staffName={state.currentStaff.name} 
            onLogout={() => setState(prev => ({ ...prev, currentStaff: null }))}
          >
            {/* Sales Workflow */}
            {activeTab === 'sales' && (
              <div className="grid grid-cols-12 gap-8 h-full">
                <div className="col-span-8 space-y-6">
                  <h2 className="text-2xl font-bold text-gray-800">Available Products</h2>
                  <div className="grid grid-cols-3 gap-6">
                    {state.products.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all text-left group ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:-translate-y-1'}`}
                      >
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 text-indigo-600">
                          <Package size={20} />
                        </div>
                        <h3 className="font-bold text-gray-800 truncate">{product.name}</h3>
                        <p className="text-gray-400 text-xs mb-4">{product.category}</p>
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                          <span className="text-lg font-black text-indigo-700">KES {product.price}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {product.stock <= 0 ? 'Out' : `${product.stock} pcs`}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-4 flex flex-col h-full sticky top-0">
                  <div className="bg-white rounded-3xl shadow-xl flex-1 flex flex-col border border-gray-100 h-full max-h-[calc(100vh-120px)] overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-indigo-50/30">
                      <h2 className="font-bold text-xl flex items-center gap-2">
                        <ShoppingBag className="text-indigo-600" />
                        Current Order
                      </h2>
                      <button onClick={() => setCart([])} className="text-red-500 hover:underline text-xs font-bold uppercase tracking-widest">Clear</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                      {cart.map(item => (
                        <div key={item.productId} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 group">
                          <div className="flex-1">
                            <p className="font-bold text-sm text-gray-800">{item.name}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">{item.quantity} units @ KES {item.price}</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="font-black text-indigo-600">KES {item.total}</span>
                            <button onClick={() => removeFromCart(item.productId)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {cart.length === 0 && <div className="text-center py-20 text-gray-300 font-medium">No items in cart</div>}
                    </div>

                    <div className="p-6 bg-gray-50/80 rounded-b-3xl space-y-4 border-t border-gray-100">
                      <div className="space-y-1">
                        <div className="flex justify-between text-gray-500 text-sm">
                          <span>Subtotal</span>
                          <span>KES {(cart.reduce((a,b)=>a+b.total,0) * (1-VAT_RATE)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-black text-2xl text-gray-900 pt-2 border-t border-indigo-100">
                          <span>Total</span>
                          <span>KES {cart.reduce((a,b)=>a+b.total,0).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setPaymentMethod('Cash')} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'Cash' ? 'border-indigo-600 bg-white shadow-md' : 'border-gray-200 bg-transparent opacity-60'}`}>
                          <CreditCard size={18} />
                          <span className="text-[10px] font-bold uppercase">Cash</span>
                        </button>
                        <button onClick={() => setPaymentMethod('M-Pesa')} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'M-Pesa' ? 'border-green-600 bg-white shadow-md' : 'border-gray-200 bg-transparent opacity-60'}`}>
                          <Smartphone size={18} />
                          <span className="text-[10px] font-bold uppercase">M-Pesa</span>
                        </button>
                      </div>

                      <button 
                        disabled={cart.length === 0}
                        onClick={handleCheckout}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"
                      >
                        <Printer size={20} />
                        <span>Confirm & Print Receipt</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Inventory Management */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold">Inventory</h2>
                  <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                    <Plus size={20} /> Add Product
                  </button>
                </div>
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold uppercase text-gray-400">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4">Stock</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {state.products.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 font-bold">{p.name}</td>
                          <td className="px-6 py-4 text-gray-500">{p.category}</td>
                          <td className="px-6 py-4 font-black text-indigo-600">{p.price.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${p.stock < 10 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                              {p.stock} units
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-lg transition-colors"><Edit3 size={16} /></button>
                            <button onClick={() => deleteProduct(p.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Staff Management */}
            {activeTab === 'staff' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold">Staff Directory</h2>
                  <button onClick={() => { setEditingStaff(null); setIsStaffModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                    <UserPlus size={20} /> Add Staff
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {state.staff.map(s => (
                    <div key={s.id} className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between group">
                      <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 rounded-full flex items-center justify-center font-black text-2xl">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xl font-black text-gray-800">{s.name}</p>
                          <p className="text-gray-400 uppercase text-[10px] font-black tracking-widest">{s.role}</p>
                          <p className="text-indigo-600 text-xs mt-1 font-bold">Total Sales: KES {state.sales.filter(sl => sl.staffId === s.id).reduce((a,b)=>a+b.total, 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => { setEditingStaff(s); setIsStaffModalOpen(true); }} className="p-2 text-gray-400 hover:text-indigo-600"><Edit3 size={18} /></button>
                         <button onClick={() => deleteStaff(s.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sales History */}
            {activeTab === 'receipts' && (
               <div className="space-y-6">
                 <h2 className="text-3xl font-bold">Transaction Ledger</h2>
                 <div className="space-y-4">
                   {state.sales.map(sale => (
                     <div key={sale.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                       <div className="flex items-center space-x-6">
                         <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                           <ReceiptIcon size={24} />
                         </div>
                         <div>
                           <p className="font-black text-gray-800 text-lg">KES {sale.total.toLocaleString()}</p>
                           <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">{new Date(sale.timestamp).toLocaleString()} • BY {sale.staffName}</p>
                         </div>
                       </div>
                       <button onClick={() => { setLastSale(sale); setIsReceiptOpen(true); }} className="text-indigo-600 font-black text-xs uppercase tracking-widest border-2 border-indigo-100 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-all">View Receipt</button>
                     </div>
                   ))}
                 </div>
               </div>
            )}

            {activeTab === 'reports' && (
               <div className="space-y-8">
                 <div className="flex justify-between items-center">
                   <h2 className="text-3xl font-bold">Performance</h2>
                   <button onClick={handleDailySummary} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-green-200 transition-all">
                     <Send size={20} /> WhatsApp Daily Summary
                   </button>
                 </div>
                 <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"><p className="text-gray-400 font-bold text-[10px] uppercase mb-1">Total Revenue</p><p className="text-4xl font-black text-indigo-600">KES {state.sales.reduce((a,b)=>a+b.total,0).toLocaleString()}</p></div>
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"><p className="text-gray-400 font-bold text-[10px] uppercase mb-1">Total Sales</p><p className="text-4xl font-black text-gray-800">{state.sales.length}</p></div>
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"><p className="text-gray-400 font-bold text-[10px] uppercase mb-1">Inventory Value</p><p className="text-4xl font-black text-purple-600">KES {state.products.reduce((a,b)=>a+(b.price*b.stock),0).toLocaleString()}</p></div>
                 </div>
               </div>
            )}
          </Layout>
        )}
      </div>

      {/* 2. GLOBAL PRINT CONTAINER (Targeted by media query) */}
      <div className="print-only">
        {lastSale && <Receipt sale={lastSale} business={state.business} />}
      </div>

      {/* MODALS */}
      
      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-3xl p-10 max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black mb-6 uppercase tracking-tight">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
            <form onSubmit={handleProductSubmit} className="space-y-4">
              <input name="name" defaultValue={editingProduct?.name} required className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Product Name" />
              <div className="grid grid-cols-2 gap-4">
                <input name="price" type="number" defaultValue={editingProduct?.price} required className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Price (KES)" />
                <input name="stock" type="number" defaultValue={editingProduct?.stock} required className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Stock Level" />
              </div>
              <select name="category" defaultValue={editingProduct?.category} className="w-full px-4 py-3 rounded-xl border border-gray-200 font-medium">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex space-x-3 pt-6">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-4 font-bold text-gray-400 hover:bg-gray-50 rounded-2xl">Cancel</button>
                <button type="submit" className="flex-1 py-4 font-bold bg-indigo-600 text-white rounded-2xl shadow-lg">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-3xl p-10 max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black mb-6 uppercase tracking-tight">{editingStaff ? 'Edit Staff' : 'Add Staff'}</h3>
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <input name="name" defaultValue={editingStaff?.name} required className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Full Name" />
              <select name="role" defaultValue={editingStaff?.role || 'cashier'} className="w-full px-4 py-3 rounded-xl border border-gray-200 font-medium">
                <option value="cashier">Cashier</option>
                <option value="admin">Administrator</option>
              </select>
              <input name="pin" maxLength={4} pattern="\d{4}" defaultValue={editingStaff?.pin} required className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="4-Digit PIN" />
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">PIN is required for login</p>
              <div className="flex space-x-3 pt-6">
                <button type="button" onClick={() => setIsStaffModalOpen(false)} className="flex-1 py-4 font-bold text-gray-400 hover:bg-gray-50 rounded-2xl">Cancel</button>
                <button type="submit" className="flex-1 py-4 font-bold bg-indigo-600 text-white rounded-2xl shadow-lg">Save Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {isReceiptOpen && lastSale && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[300] flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ReceiptIcon size={32} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 uppercase">Sale Complete</h3>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Transaction Registered</p>
            </div>
            
            <div className="border-2 border-dashed border-gray-200 p-4 rounded-2xl mb-6">
                <Receipt sale={lastSale} business={state.business} />
            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                disabled={isPrinting}
                onClick={handlePrint}
                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
              >
                {isPrinting ? <Loader2 className="animate-spin" size={20} /> : <Printer size={20} />}
                {isPrinting ? 'PREPARING...' : 'PRINT RECEIPT'}
              </button>
              <button 
                onClick={() => setIsReceiptOpen(false)}
                className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:text-indigo-600 transition-colors"
              >
                New Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
