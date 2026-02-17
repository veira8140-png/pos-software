
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
  Search,
  CheckCircle2,
  X,
  History,
  TrendingUp,
  Box,
  ArrowRight
} from 'lucide-react';
import Layout from './components/Layout';
import Receipt from './components/Receipt';
import { Product, Staff, Sale, BusinessConfig, AppState, SaleItem } from './types';
import { INITIAL_PRODUCTS, MOCK_STAFF, VAT_RATE, CATEGORIES } from './constants';
import { generateDailySummary } from './services/geminiService';

const App: React.FC = () => {
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

  const [activeTab, setActiveTab] = useState('sales');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [pinInput, setPinInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'M-Pesa'>('Cash');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

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
      alert('Wrong PIN!');
      setPinInput('');
    }
  }, [pinInput, state.staff]);

  const addToCart = (product: Product) => {
    const inCart = cart.find(i => i.productId === product.id)?.quantity || 0;
    if (product.stock <= inCart) return alert('No more stock!');
    
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
      etimsControlNumber: `KRA-${Date.now().toString().slice(-8)}`
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
    setIsMobileCartOpen(false);
  };

  const handlePrint = () => {
    if (!lastSale) return;
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const handleDailySummary = async () => {
    if (state.sales.length === 0) return alert('No sales today!');
    setIsGeneratingSummary(true);
    try {
        const summaryText = await generateDailySummary(state.sales, state.products, state.business.name);
        window.open(`https://wa.me/${state.business.whatsappNumber}?text=${encodeURIComponent(summaryText || '')}`, '_blank');
    } catch (e) {
        alert('Failed to send!');
    } finally {
        setIsGeneratingSummary(false);
    }
  };

  const filteredProducts = state.products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <div id="print-section">
        {lastSale && <Receipt sale={lastSale} business={state.business} />}
      </div>

      <div className="no-print">
        {!state.onboarded ? (
          <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
            <div className="bg-white rounded-[40px] p-8 md:p-12 w-full max-w-md shadow-2xl border border-slate-100">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-white">
                    <ShoppingBag size={32} />
                </div>
                <h1 className="text-3xl font-extrabold mb-2">Welcome</h1>
                <p className="text-slate-400 text-sm">Tell us about your shop</p>
              </div>
              <form onSubmit={handleOnboarding} className="space-y-4">
                <input name="businessName" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold" placeholder="Shop Name" />
                <input name="whatsapp" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold" placeholder="WhatsApp (254...)" />
                <input name="kraPin" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold" placeholder="KRA PIN" />
                <input name="address" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold" placeholder="Location" />
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-5 rounded-2xl shadow-lg flex items-center justify-center gap-2 mt-4 active:scale-95 transition-all">
                  <span>Start Shop</span>
                  <ArrowRight size={20} />
                </button>
              </form>
            </div>
          </div>
        ) : !state.currentStaff ? (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
            <h1 className="text-4xl font-extrabold mb-10 tracking-tighter">VEIRA</h1>
            <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl w-full max-w-xs border border-slate-100">
              <div className="flex justify-center gap-4 mb-8">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`w-4 h-4 rounded-full border-2 border-slate-100 transition-all ${pinInput.length > i ? 'bg-indigo-600 border-indigo-200' : ''}`}></div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✓'].map(btn => (
                  <button
                    key={btn.toString()}
                    onClick={() => {
                      if (btn === 'C') setPinInput('');
                      else if (btn === '✓') handleLogin();
                      else if (pinInput.length < 4) setPinInput(p => p + btn);
                    }}
                    className={`h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 ${
                      typeof btn === 'number' ? 'bg-slate-50 text-slate-700' : btn === '✓' ? 'bg-indigo-600 text-white' : 'bg-red-50 text-red-500'
                    }`}
                  >
                    {btn}
                  </button>
                ))}
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
            {/* Sell View */}
            {activeTab === 'sales' && (
              <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-10">
                <div className="col-span-12 lg:col-span-8 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h2 className="text-3xl font-extrabold tracking-tight">Sell Items</h2>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Find item..." 
                            className="w-full bg-white border-none shadow-sm rounded-2xl py-3 pl-12 pr-6 font-semibold text-sm"
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-5">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`bg-white p-4 md:p-6 rounded-3xl border border-slate-50 shadow-sm transition-all text-left relative overflow-hidden active:scale-95 ${product.stock <= 0 ? 'opacity-40 grayscale pointer-events-none' : 'hover:border-indigo-100'}`}
                      >
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                          <Package size={20} />
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm md:text-base leading-tight mb-1">{product.name}</h3>
                        <p className="text-slate-400 text-[10px] font-bold uppercase mb-4">{product.category}</p>
                        <p className="font-extrabold text-indigo-700 text-sm md:text-lg">KES {product.price}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Floating Pay Button (Mobile) */}
                {cart.length > 0 && !isMobileCartOpen && (
                    <div className="lg:hidden fixed bottom-28 left-6 right-6 z-[90]">
                        <button onClick={() => setIsMobileCartOpen(true)} className="w-full bg-slate-900 text-white p-5 rounded-3xl shadow-xl flex items-center justify-between font-bold ring-4 ring-white">
                            <span>Order ({cart.length})</span>
                            <span className="text-lg">KES {cart.reduce((a,b)=>a+b.total,0)}</span>
                        </button>
                    </div>
                )}

                {/* Cart View */}
                <div className={`fixed inset-0 lg:static lg:col-span-4 z-[150] lg:z-10 transition-all ${isMobileCartOpen ? 'visible opacity-100' : 'invisible opacity-0 lg:visible lg:opacity-100'}`}>
                  <div className="lg:hidden absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileCartOpen(false)}></div>
                  <div className={`absolute bottom-0 left-0 right-0 lg:static bg-white rounded-t-[40px] lg:rounded-[40px] shadow-2xl flex flex-col h-[85vh] lg:h-auto lg:min-h-[700px] transition-transform ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h2 className="font-extrabold text-xl">Order</h2>
                      <button onClick={() => setIsMobileCartOpen(false)} className="lg:hidden p-2 bg-slate-100 rounded-xl"><X size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                      {cart.map(item => (
                        <div key={item.productId} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                          <div>
                            <p className="font-bold text-sm">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{item.quantity} x {item.price}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-extrabold text-sm">KES {item.total}</span>
                            <button onClick={() => removeFromCart(item.productId)} className="text-slate-300 hover:text-red-500"><X size={16}/></button>
                          </div>
                        </div>
                      ))}
                      {cart.length === 0 && <p className="text-center py-20 text-slate-300 font-bold uppercase text-xs tracking-widest">Nothing selected</p>}
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-6 pb-12 lg:pb-6">
                      <div className="flex justify-between items-end">
                           <span className="text-slate-400 font-bold text-xs uppercase">Total</span>
                           <span className="text-4xl font-extrabold tracking-tighter">KES {cart.reduce((a,b)=>a+b.total,0)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setPaymentMethod('Cash')} className={`py-4 rounded-2xl border-2 font-bold text-xs uppercase ${paymentMethod === 'Cash' ? 'border-indigo-600 bg-white shadow-md text-indigo-600' : 'border-slate-200 text-slate-300'}`}>Cash</button>
                        <button onClick={() => setPaymentMethod('M-Pesa')} className={`py-4 rounded-2xl border-2 font-bold text-xs uppercase ${paymentMethod === 'M-Pesa' ? 'border-green-600 bg-white shadow-md text-green-600' : 'border-slate-200 text-slate-300'}`}>M-Pesa</button>
                      </div>

                      <button disabled={cart.length === 0} onClick={handleCheckout} className="w-full bg-slate-900 text-white font-extrabold py-5 rounded-3xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30">
                        <Printer size={20} />
                        <span>Done</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other views (Stock, History, Stats, Team) with simplified labels */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <h2 className="text-3xl font-extrabold tracking-tight">Items</h2>
                   <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg active:scale-90 transition-all"><Plus size={24}/></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {state.products.map(p => (
                    <div key={p.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><Box size={24}/></div>
                        <div>
                          <p className="font-bold">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{p.category} • KES {p.price}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[8px] text-slate-300 font-bold">Stock</p>
                          <p className={`font-extrabold ${p.stock < 10 ? 'text-red-500' : 'text-slate-700'}`}>{p.stock}</p>
                        </div>
                        <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg"><Edit3 size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'receipts' && (
                <div className="space-y-6">
                    <h2 className="text-3xl font-extrabold tracking-tight">History</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {state.sales.map(sale => (
                            <div key={sale.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><History size={24}/></div>
                                    <div>
                                        <p className="font-extrabold text-lg">KES {sale.total}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(sale.timestamp).toLocaleDateString()} • {sale.paymentMethod}</p>
                                    </div>
                                </div>
                                <button onClick={() => { setLastSale(sale); setIsReceiptOpen(true); }} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><ReceiptIcon size={20}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6">
                        <h2 className="text-3xl font-extrabold tracking-tight">Stats</h2>
                        <button onClick={handleDailySummary} disabled={isGeneratingSummary} className="bg-green-600 text-white px-8 py-5 rounded-3xl font-bold flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 w-full sm:w-auto">
                            {isGeneratingSummary ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                            <span>Send Summary</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-indigo-600 p-8 rounded-[40px] text-white">
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60">Total Money</p>
                            <p className="text-5xl font-extrabold tracking-tighter">KES {state.sales.reduce((a,b)=>a+b.total,0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Sales</p>
                            <p className="text-5xl font-extrabold tracking-tighter">{state.sales.length}</p>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'staff' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-extrabold tracking-tight">Team</h2>
                        <button onClick={() => setIsStaffModalOpen(true)} className="w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-lg flex items-center justify-center"><UserPlus size={24}/></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {state.staff.map(s => (
                            <div key={s.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl">{s.name.charAt(0)}</div>
                                    <div>
                                        <h3 className="font-bold">{s.name}</h3>
                                        <span className="text-[9px] font-bold uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg">{s.role}</span>
                                    </div>
                                </div>
                                <button onClick={() => { if(confirm('Remove?')) setState(prev => ({...prev, staff: prev.staff.filter(st => st.id !== s.id)})) }} className="p-3 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={18}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </Layout>
        )}
      </div>

      {/* Success Modal */}
      {isReceiptOpen && lastSale && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-[48px] p-8 md:p-10 w-full max-w-md shadow-2xl animate-in zoom-in-90 duration-300">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100">
                <CheckCircle2 size={40} strokeWidth={3} />
              </div>
              <h3 className="text-3xl font-extrabold mb-1">Paid!</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Sale complete</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 max-h-[300px] overflow-y-auto no-scrollbar shadow-inner">
                <Receipt sale={lastSale} business={state.business} />
            </div>
            <button disabled={isPrinting} onClick={handlePrint} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-extrabold flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                <Printer size={22} />
                <span>Print Receipt</span>
            </button>
            <button onClick={() => setIsReceiptOpen(false)} className="w-full py-4 mt-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Back</button>
          </div>
        </div>
      )}

      {/* Simple Modals */}
      {(isProductModalOpen || isStaffModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-6 no-print">
           <div className="bg-white rounded-[40px] p-8 md:p-12 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-extrabold">{isProductModalOpen ? 'Add Item' : 'New User'}</h3>
                <button onClick={() => { setIsProductModalOpen(false); setIsStaffModalOpen(false); }} className="p-2 bg-slate-100 rounded-xl"><X size={24}/></button>
              </div>
              
              {isProductModalOpen && (
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
                }} className="space-y-6">
                  <input name="name" defaultValue={editingProduct?.name} required className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold" placeholder="Item Name" />
                  <div className="grid grid-cols-2 gap-4">
                     <input name="price" type="number" defaultValue={editingProduct?.price} required className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold" placeholder="Price" />
                     <input name="stock" type="number" defaultValue={editingProduct?.stock} required className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold" placeholder="Stock" />
                  </div>
                  <select name="category" defaultValue={editingProduct?.category} className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold border-none">
                     {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-extrabold shadow-lg active:scale-95 transition-all">Save</button>
                </form>
              )}

              {isStaffModalOpen && (
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    setState(prev => ({ ...prev, staff: [...prev.staff, { id: Date.now().toString(), name: fd.get('name') as string, role: fd.get('role') as any, pin: fd.get('pin') as string }] }));
                    setIsStaffModalOpen(false);
                }} className="space-y-6">
                  <input name="name" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold" placeholder="Full Name" />
                  <input name="pin" maxLength={4} pattern="\d{4}" required className="w-full px-6 py-5 rounded-2xl bg-slate-50 font-black text-center text-4xl tracking-[0.6em]" placeholder="0000" />
                  <select name="role" className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold border-none">
                      <option value="cashier">Cashier</option>
                      <option value="admin">Admin</option>
                  </select>
                  <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-extrabold shadow-lg">Add User</button>
                </form>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
