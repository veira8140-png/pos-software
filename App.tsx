
import React, { useState, useEffect, useCallback } from 'react';
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
  Loader2,
  AlertCircle,
  Search,
  CheckCircle2
} from 'lucide-react';
import Layout from './components/Layout';
import Receipt from './components/Receipt';
import { Product, Staff, Sale, BusinessConfig, AppState, SaleItem } from './types';
import { INITIAL_PRODUCTS, MOCK_STAFF, VAT_RATE, CATEGORIES } from './constants';
import { generateDailySummary } from './services/geminiService';

const App: React.FC = () => {
  // Persistence with LocalStorage
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('veira_pos_v1');
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
    localStorage.setItem('veira_pos_v1', JSON.stringify(state));
  }, [state]);

  // UI State
  const [activeTab, setActiveTab] = useState('sales');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [pinInput, setPinInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'M-Pesa'>('Cash');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // --- Core Handlers ---
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

  const handleLogin = useCallback(() => {
    const staffMember = state.staff.find(s => s.pin === pinInput);
    if (staffMember) {
      setState(prev => ({ ...prev, currentStaff: staffMember }));
      setPinInput('');
    } else {
      alert('Security Alert: Invalid PIN entered.');
      setPinInput('');
    }
  }, [pinInput, state.staff]);

  const addToCart = (product: Product) => {
    const inCart = cart.find(i => i.productId === product.id)?.quantity || 0;
    if (product.stock <= inCart) return alert('Inventory Limit: Product is currently out of stock.');
    
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

  const handlePrint = () => {
    setIsPrinting(true);
    // Focus explicitly ensures the print dialog is captured by the main window
    window.focus();
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleDailySummary = async () => {
    if (state.sales.length === 0) return alert('No sales data available for today.');
    setIsGeneratingSummary(true);
    try {
        const summaryText = await generateDailySummary(state.sales, state.products, state.business.name);
        const whatsappUrl = `https://wa.me/${state.business.whatsappNumber}?text=${encodeURIComponent(summaryText || '')}`;
        window.open(whatsappUrl, '_blank');
    } catch (e) {
        alert('AI Summary failed. Please check connection.');
    } finally {
        setIsGeneratingSummary(false);
    }
  };

  const deleteProduct = (id: string) => {
    if (confirm('Critical Action: Are you sure you want to delete this product?')) {
      setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
    }
  };

  // Add the missing deleteStaff handler to fix the compilation error
  const deleteStaff = (id: string) => {
    if (state.staff.length <= 1) return alert('Security Requirement: At least one staff member must remain in the system.');
    if (confirm('Critical Action: Are you sure you want to remove this staff member?')) {
      setState(prev => ({ ...prev, staff: prev.staff.filter(s => s.id !== id) }));
    }
  };

  const filteredProducts = state.products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Main Render ---
  return (
    <div className="min-h-screen select-none">
      {/* 1. APP UI */}
      <div className="no-print min-h-screen">
        {!state.onboarded ? (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-6">
            <div className="bg-white rounded-[40px] shadow-3d p-12 max-w-lg w-full animate-in fade-in zoom-in duration-500">
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-inner">
                    <ShoppingBag size={40} />
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Setup Veira</h1>
                <p className="text-slate-400 font-medium mt-2">Professional retail management for Kenya</p>
              </div>
              <form onSubmit={handleOnboarding} className="space-y-5">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Business Name</label>
                    <input name="businessName" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="e.g. Uzuri Boutique" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">WhatsApp Number</label>
                        <input name="whatsapp" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500" placeholder="254..." />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">KRA PIN</label>
                        <input name="kraPin" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500" placeholder="A00..." />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Location / Physical Address</label>
                    <input name="address" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Kimathi Street, Nairobi" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-[24px] shadow-xl shadow-indigo-100 flex items-center justify-center space-x-3 transition-all active:scale-[0.98] mt-6">
                  <span className="text-lg">Initialize Terminal</span>
                  <ChevronRight size={24} />
                </button>
              </form>
            </div>
          </div>
        ) : !state.currentStaff ? (
          <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC] p-6">
            <div className="text-center max-w-sm w-full">
              <div className="mb-12">
                 <h1 className="text-6xl font-black text-slate-900 tracking-tighter">VEIRA</h1>
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Security Portal</p>
              </div>
              <div className="bg-white p-10 rounded-[48px] shadow-3d border border-slate-100 mb-8">
                <div className="flex justify-center space-x-4 mb-10">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-5 h-5 rounded-full border-4 border-slate-100 transition-all duration-300 ${pinInput.length > i ? 'bg-indigo-600 border-indigo-200 scale-125' : ''}`}></div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✓'].map(btn => (
                    <button
                      key={btn.toString()}
                      onClick={() => {
                        if (btn === 'C') setPinInput('');
                        else if (btn === '✓') handleLogin();
                        else if (pinInput.length < 4) setPinInput(p => p + btn);
                      }}
                      className={`h-16 w-16 mx-auto rounded-3xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 ${
                        typeof btn === 'number' ? 'bg-slate-50 text-slate-700 hover:bg-slate-100' : 
                        btn === '✓' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700' : 'bg-red-50 text-red-500 hover:bg-red-100'
                      }`}
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-slate-400 text-xs font-medium">Locked Terminal • v1.0.2 Stable</p>
            </div>
          </div>
        ) : (
          <Layout 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            staffName={state.currentStaff.name} 
            onLogout={() => setState(prev => ({ ...prev, currentStaff: null }))}
          >
            {/* 1. SALES MODULE */}
            {activeTab === 'sales' && (
              <div className="grid grid-cols-12 gap-10">
                <div className="col-span-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Marketplace</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Point of Sale</p>
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search inventory..." 
                            className="bg-white border-none shadow-sm rounded-2xl py-4 pl-12 pr-6 w-80 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm shadow-slate-100 transition-all text-left relative overflow-hidden group ${product.stock <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:shadow-3d-hover hover:-translate-y-2'}`}
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={24} className="text-indigo-600" />
                        </div>
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 transition-transform group-hover:scale-110">
                          <Package size={24} />
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-lg mb-1 truncate">{product.name}</h3>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-6">{product.category}</p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <span className="text-xl font-black text-indigo-700">KES {product.price.toLocaleString()}</span>
                          <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-tighter ${product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {product.stock <= 0 ? 'Out' : `${product.stock} left`}
                          </span>
                        </div>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-3 py-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <AlertCircle size={40} />
                            </div>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No products matched your search</p>
                        </div>
                    )}
                  </div>
                </div>

                {/* Checkout Panel */}
                <div className="col-span-4 h-fit sticky top-10">
                  <div className="bg-white rounded-[40px] shadow-3d flex flex-col border border-slate-50 overflow-hidden min-h-[700px]">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-indigo-50/20">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600">
                           <ShoppingBag size={24} />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-900 text-lg">Checkout</h2>
                            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">{cart.length} items selected</p>
                        </div>
                      </div>
                      <button onClick={() => setCart([])} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-4 max-h-[400px]">
                      {cart.map(item => (
                        <div key={item.productId} className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100 group">
                          <div className="flex-1">
                            <p className="font-bold text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-black">{item.quantity} × {item.price}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="font-black text-indigo-600 text-lg">KES {item.total.toLocaleString()}</span>
                            <button onClick={() => removeFromCart(item.productId)} className="text-slate-200 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {cart.length === 0 && (
                        <div className="text-center py-24 opacity-30 flex flex-col items-center gap-4">
                           <div className="p-6 bg-slate-100 rounded-full">
                                <ShoppingBag size={48} />
                           </div>
                           <p className="font-bold text-sm">Cart is waiting for items</p>
                        </div>
                      )}
                    </div>

                    <div className="p-8 bg-[#F8F9FC] rounded-b-[40px] space-y-6 border-t border-slate-100">
                      <div className="space-y-2">
                        <div className="flex justify-between text-slate-400 font-bold text-xs uppercase tracking-widest px-1">
                          <span>E-TIMS VAT (16%)</span>
                          <span>KES {(cart.reduce((a,b)=>a+b.total,0) * (VAT_RATE / (1 + VAT_RATE))).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-end px-1 pt-2">
                           <span className="text-slate-400 font-black text-xs uppercase tracking-widest pb-1">Total Payable</span>
                           <span className="text-4xl font-black text-slate-900 tracking-tighter">KES {cart.reduce((a,b)=>a+b.total,0).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setPaymentMethod('Cash')} 
                            className={`py-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 group ${paymentMethod === 'Cash' ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-100' : 'border-slate-100 opacity-60 hover:opacity-100'}`}
                        >
                          <CreditCard size={20} className={paymentMethod === 'Cash' ? 'text-indigo-600' : ''} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Cash</span>
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('M-Pesa')} 
                            className={`py-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 group ${paymentMethod === 'M-Pesa' ? 'border-green-600 bg-white shadow-xl shadow-green-100' : 'border-slate-100 opacity-60 hover:opacity-100'}`}
                        >
                          <Smartphone size={20} className={paymentMethod === 'M-Pesa' ? 'text-green-600' : ''} />
                          <span className="text-[10px] font-black uppercase tracking-widest">M-Pesa</span>
                        </button>
                      </div>

                      <button 
                        disabled={cart.length === 0}
                        onClick={handleCheckout}
                        className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-6 rounded-[30px] shadow-2xl transition-all active:scale-[0.97] flex items-center justify-center space-x-4 text-lg"
                      >
                        <Printer size={24} />
                        <span>PROCESS TRANSACTION</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other modules (Inventory, Staff, Receipts, Reports) */}
            {activeTab === 'products' && (
              <div className="space-y-10">
                <div className="flex justify-between items-center">
                   <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Inventory</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Stock Control Center</p>
                    </div>
                  <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-[24px] font-bold flex items-center gap-3 shadow-xl shadow-indigo-100 transition-all active:scale-95">
                    <Plus size={20} /> Add to Stock
                  </button>
                </div>
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-50 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                      <tr>
                        <th className="px-10 py-6">Product Information</th>
                        <th className="px-6 py-6 text-center">Price</th>
                        <th className="px-6 py-6 text-center">Availability</th>
                        <th className="px-10 py-6 text-right">Management</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {state.products.map(p => (
                        <tr key={p.id} className="group hover:bg-slate-50/30 transition-colors">
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black">
                                    {p.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-extrabold text-slate-800 text-lg">{p.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.category}</p>
                                </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <span className="font-black text-slate-900 text-lg">KES {p.price.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <div className="flex flex-col items-center">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${p.stock < 10 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {p.stock} Units
                                </span>
                            </div>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="p-3 text-indigo-500 hover:bg-indigo-50 rounded-2xl transition-all"><Edit3 size={18} /></button>
                                <button onClick={() => deleteProduct(p.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'staff' && (
              <div className="space-y-10">
                <div className="flex justify-between items-center">
                   <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Personnel</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Authorized Staff</p>
                    </div>
                  <button onClick={() => setIsStaffModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-[24px] font-bold flex items-center gap-3 shadow-xl shadow-indigo-100 transition-all active:scale-95">
                    <UserPlus size={20} /> Register Staff
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  {state.staff.map(s => (
                    <div key={s.id} className="bg-white p-10 rounded-[48px] border border-slate-50 shadow-sm flex items-center justify-between group relative overflow-hidden">
                      <div className="flex items-center space-x-8 relative z-10">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 rounded-[32px] flex items-center justify-center font-black text-3xl shadow-inner">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-900">{s.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-slate-400 uppercase text-[10px] font-black tracking-[0.2em]">{s.role}</span>
                             <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                             <span className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]">PIN: ****</span>
                          </div>
                          <p className="text-slate-400 text-xs mt-6 font-bold">LIFETIME SALES: <span className="text-slate-900">KES {state.sales.filter(sl => sl.staffId === s.id).reduce((a,b)=>a+b.total, 0).toLocaleString()}</span></p>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-all flex gap-2 relative z-10">
                         <button onClick={() => deleteStaff(s.id)} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors">
                            <Trash2 size={20} />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'receipts' && (
                <div className="space-y-10">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Journal</h2>
                    <div className="grid grid-cols-1 gap-4">
                        {state.sales.map(sale => (
                            <div key={sale.id} className="bg-white p-8 rounded-[32px] border border-slate-50 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
                                <div className="flex items-center space-x-8">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner">
                                        <ReceiptIcon size={28} />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 text-2xl tracking-tighter">KES {sale.total.toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                            #{sale.id} • {new Date(sale.timestamp).toLocaleString('en-KE')} • CASHIER: {sale.staffName}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${sale.paymentMethod === 'M-Pesa' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                        <div className={`w-2 h-2 rounded-full ${sale.paymentMethod === 'M-Pesa' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                        {sale.paymentMethod}
                                    </div>
                                    <button onClick={() => { setLastSale(sale); setIsReceiptOpen(true); }} className="px-6 py-4 bg-slate-50 hover:bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                                        Open Receipt
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="space-y-10">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Intelligence</h2>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Business Performance</p>
                        </div>
                        <button 
                            onClick={handleDailySummary} 
                            disabled={isGeneratingSummary}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-5 rounded-[24px] font-black flex items-center gap-4 shadow-2xl shadow-green-100 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isGeneratingSummary ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                            AI WHATSAPP SUMMARY
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-8">
                        <div className="bg-white p-10 rounded-[48px] border border-slate-50 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 text-slate-50 group-hover:text-indigo-50 transition-colors">
                                <CreditCard size={80} strokeWidth={4} />
                            </div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Total Revenue (KES)</p>
                            <p className="text-5xl font-black text-indigo-600 tracking-tighter">
                                {state.sales.reduce((a,b)=>a+b.total,0).toLocaleString()}
                            </p>
                            <div className="mt-8 flex items-center gap-2 text-green-500 font-bold text-xs">
                                <CheckCircle2 size={14} /> Systems fully operational
                            </div>
                        </div>
                        <div className="bg-white p-10 rounded-[48px] border border-slate-50 shadow-sm">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Transaction Volume</p>
                            <p className="text-5xl font-black text-slate-900 tracking-tighter">{state.sales.length}</p>
                            <p className="text-slate-300 text-xs mt-8 font-medium italic">Unique audit trails generated</p>
                        </div>
                        <div className="bg-white p-10 rounded-[48px] border border-slate-50 shadow-sm">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Stock Asset Value</p>
                            <p className="text-5xl font-black text-orange-500 tracking-tighter">
                                {state.products.reduce((a,b)=>a+(b.price*b.stock),0).toLocaleString()}
                            </p>
                            <p className="text-slate-300 text-xs mt-8 font-medium">Estimated KES on shelves</p>
                        </div>
                    </div>
                </div>
            )}
          </Layout>
        )}
      </div>

      {/* 2. GLOBAL PRINT CONTAINER */}
      <div className="print-only">
        {lastSale && <Receipt sale={lastSale} business={state.business} />}
      </div>

      {/* MODALS */}
      
      {/* Product Management Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-[40px] p-12 max-w-lg w-full shadow-3d animate-in zoom-in-95 duration-300">
            <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">{editingProduct ? 'Update Stock' : 'New Product Entry'}</h3>
            <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const data = {
                    name: fd.get('name') as string,
                    price: parseFloat(fd.get('price') as string),
                    category: fd.get('category') as string,
                    stock: parseInt(fd.get('stock') as string),
                };
                if (editingProduct) {
                    setState(prev => ({ ...prev, products: prev.products.map(p => p.id === editingProduct.id ? { ...p, ...data } : p) }));
                } else {
                    setState(prev => ({ ...prev, products: [...prev.products, { id: Date.now().toString(), ...data }] }));
                }
                setIsProductModalOpen(false);
            }} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Product Name</label>
                <input name="name" defaultValue={editingProduct?.name} required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold" placeholder="e.g. Fresh Milk" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Selling Price</label>
                    <input name="price" type="number" defaultValue={editingProduct?.price} required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Starting Stock</label>
                    <input name="stock" type="number" defaultValue={editingProduct?.stock} required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Department / Category</label>
                <select name="category" defaultValue={editingProduct?.category} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold appearance-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex space-x-4 pt-8">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-5 font-bold text-slate-400 hover:text-slate-600 transition-colors">Abort</button>
                <button type="submit" className="flex-1 py-5 font-black bg-indigo-600 text-white rounded-[24px] shadow-xl shadow-indigo-100 transition-all active:scale-95">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Management Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-[40px] p-12 max-w-lg w-full shadow-3d animate-in zoom-in-95 duration-300">
            <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Staff Registration</h3>
            <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const data = {
                    name: fd.get('name') as string,
                    role: fd.get('role') as 'admin' | 'cashier',
                    pin: fd.get('pin') as string,
                };
                setState(prev => ({ ...prev, staff: [...prev.staff, { id: Date.now().toString(), ...data }] }));
                setIsStaffModalOpen(false);
            }} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Full Name</label>
                <input name="name" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold" placeholder="e.g. Jane Doe" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Terminal PIN (4 Digits)</label>
                <input name="pin" maxLength={4} pattern="\d{4}" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold text-center text-3xl tracking-[1em]" placeholder="****" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Access Level</label>
                <select name="role" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold">
                    <option value="cashier">Standard Cashier</option>
                    <option value="admin">System Administrator</option>
                </select>
              </div>
              <div className="flex space-x-4 pt-8">
                <button type="button" onClick={() => setIsStaffModalOpen(false)} className="flex-1 py-5 font-bold text-slate-400">Abort</button>
                <button type="submit" className="flex-1 py-5 font-black bg-indigo-600 text-white rounded-[24px] shadow-xl">Confirm Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Success & Receipt Preview */}
      {isReceiptOpen && lastSale && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[600] flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-[50px] p-10 max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-12 duration-500">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-green-50 text-green-500 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter">SUCCESS</h3>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Audit Trail Registered</p>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 mb-8 shadow-inner">
                <Receipt sale={lastSale} business={state.business} />
            </div>
            
            <div className="flex flex-col gap-4">
              <button 
                disabled={isPrinting}
                onClick={handlePrint}
                className="w-full bg-indigo-600 text-white py-6 rounded-[30px] font-black shadow-2xl shadow-indigo-100 flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 text-lg"
              >
                {isPrinting ? <Loader2 className="animate-spin" size={24} /> : <Printer size={24} />}
                {isPrinting ? 'INITIALIZING PRINTER...' : 'PRINT OFFICIAL RECEIPT'}
              </button>
              <button 
                onClick={() => setIsReceiptOpen(false)}
                className="w-full py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] hover:text-slate-900 transition-colors"
              >
                CLOSE & NEW TRANSACTION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
