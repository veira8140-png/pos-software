
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
  CheckCircle2,
  ChevronUp,
  X
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
      alert('Security Alert: Invalid PIN entered.');
      setPinInput('');
    }
  }, [pinInput, state.staff]);

  const addToCart = (product: Product) => {
    const inCart = cart.find(i => i.productId === product.id)?.quantity || 0;
    if (product.stock <= inCart) return alert('Inventory Limit: Out of stock.');
    
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
    setIsMobileCartOpen(false);
  };

  const handlePrint = () => {
    if (!lastSale) return;
    setIsPrinting(true);
    window.focus();
    setTimeout(() => {
      try {
        window.print();
      } catch (error) {
        console.error("Print Failed", error);
        alert("Unable to open print dialog.");
      } finally {
        setIsPrinting(false);
      }
    }, 500);
  };

  const handleDailySummary = async () => {
    if (state.sales.length === 0) return alert('No sales available.');
    setIsGeneratingSummary(true);
    try {
        const summaryText = await generateDailySummary(state.sales, state.products, state.business.name);
        const whatsappUrl = `https://wa.me/${state.business.whatsappNumber}?text=${encodeURIComponent(summaryText || '')}`;
        window.open(whatsappUrl, '_blank');
    } catch (e) {
        alert('AI Summary failed.');
    } finally {
        setIsGeneratingSummary(false);
    }
  };

  const deleteProduct = (id: string) => {
    if (confirm('Delete this product?')) {
      setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
    }
  };

  const deleteStaff = (id: string) => {
    if (state.staff.length <= 1) return alert('At least one staff member required.');
    if (confirm('Remove this staff member?')) {
      setState(prev => ({ ...prev, staff: prev.staff.filter(s => s.id !== id) }));
    }
  };

  const filteredProducts = state.products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen select-none overflow-x-hidden">
      <div id="print-section">
        {lastSale && <Receipt sale={lastSale} business={state.business} />}
      </div>

      <div className="no-print min-h-screen">
        {!state.onboarded ? (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-4 md:p-6">
            <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-3d p-8 md:p-12 max-w-lg w-full">
              <div className="text-center mb-8">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-50 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
                    <ShoppingBag size={32} />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Setup Veira</h1>
                <p className="text-slate-400 font-medium mt-2">Professional retail for Kenya</p>
              </div>
              <form onSubmit={handleOnboarding} className="space-y-4">
                <input name="businessName" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500" placeholder="Business Name" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="whatsapp" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500" placeholder="WhatsApp (254...)" />
                    <input name="kraPin" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500" placeholder="KRA PIN" />
                </div>
                <input name="address" required className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500" placeholder="Address" />
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-5 rounded-2xl shadow-xl flex items-center justify-center space-x-3 mt-6">
                  <span>Initialize Terminal</span>
                  <ChevronRight size={20} />
                </button>
              </form>
            </div>
          </div>
        ) : !state.currentStaff ? (
          <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC] p-4">
            <div className="text-center max-w-sm w-full">
              <div className="mb-8 md:mb-12">
                 <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter">VEIRA</h1>
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Security Portal</p>
              </div>
              <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] shadow-3d border border-slate-100 mb-8">
                <div className="flex justify-center space-x-3 md:space-x-4 mb-8 md:mb-10">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-4 border-slate-100 transition-all ${pinInput.length > i ? 'bg-indigo-600 border-indigo-200' : ''}`}></div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4 md:gap-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✓'].map(btn => (
                    <button
                      key={btn.toString()}
                      onClick={() => {
                        if (btn === 'C') setPinInput('');
                        else if (btn === '✓') handleLogin();
                        else if (pinInput.length < 4) setPinInput(p => p + btn);
                      }}
                      className={`h-14 w-14 md:h-16 md:w-16 mx-auto rounded-2xl md:rounded-3xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 ${
                        typeof btn === 'number' ? 'bg-slate-50 text-slate-700' : 
                        btn === '✓' ? 'bg-indigo-600 text-white' : 'bg-red-50 text-red-500'
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
            {activeTab === 'sales' && (
              <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-10">
                <div className="col-span-12 lg:col-span-8 space-y-6 md:space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Marketplace</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Point of Sale</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..." 
                            className="bg-white border-none shadow-sm rounded-xl py-3 pl-12 pr-6 w-full md:w-64 lg:w-80 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`bg-white p-5 md:p-6 rounded-[24px] md:rounded-[32px] border border-slate-50 shadow-sm transition-all text-left relative overflow-hidden group ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-3d-hover hover:-translate-y-1 active:scale-95'}`}
                      >
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 text-indigo-600">
                          <Package size={20} />
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-base md:text-lg truncate">{product.name}</h3>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">{product.category}</p>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                          <span className="font-black text-indigo-700">KES {product.price.toLocaleString()}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter bg-slate-50">
                            {product.stock} left
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Cart Toggle */}
                <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40 no-print">
                   <button 
                    onClick={() => setIsMobileCartOpen(true)}
                    className="w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between font-bold"
                   >
                     <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg"><ShoppingBag size={20} /></div>
                        <span>Cart ({cart.length})</span>
                     </div>
                     <span>KES {cart.reduce((a,b)=>a+b.total,0).toLocaleString()}</span>
                   </button>
                </div>

                {/* Checkout Panel (Desktop shown, Mobile conditional) */}
                <div className={`fixed inset-0 lg:static lg:col-span-4 z-[60] lg:z-10 transition-transform duration-300 lg:translate-y-0 ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>
                  {/* Backdrop for mobile */}
                  <div className="lg:hidden absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileCartOpen(false)}></div>
                  
                  <div className="absolute bottom-0 left-0 right-0 lg:static bg-white rounded-t-[32px] lg:rounded-[40px] shadow-3d flex flex-col border border-slate-50 h-[85vh] lg:h-auto lg:min-h-[700px] overflow-hidden">
                    <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between bg-indigo-50/20">
                      <h2 className="font-black text-slate-900 text-lg">Checkout</h2>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCart([])} className="text-red-500 p-2 rounded-xl hover:bg-red-50">
                            <Trash2 size={20} />
                        </button>
                        <button onClick={() => setIsMobileCartOpen(false)} className="lg:hidden text-slate-400 p-2">
                            <X size={24} />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4">
                      {cart.map(item => (
                        <div key={item.productId} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="flex-1">
                            <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-black">{item.quantity} × {item.price}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="font-black text-indigo-600">KES {item.total.toLocaleString()}</span>
                            <button onClick={() => removeFromCart(item.productId)} className="text-slate-300">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {cart.length === 0 && <p className="text-center py-12 text-slate-400 text-sm">Empty cart</p>}
                    </div>

                    <div className="p-6 md:p-8 bg-[#F8F9FC] border-t border-slate-100 space-y-6 pb-12 lg:pb-8">
                      <div className="flex justify-between items-end">
                           <span className="text-slate-400 font-black text-xs uppercase tracking-widest">Total</span>
                           <span className="text-3xl font-black text-slate-900 tracking-tighter">KES {cart.reduce((a,b)=>a+b.total,0).toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setPaymentMethod('Cash')} className={`py-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'Cash' ? 'border-indigo-600 bg-white shadow-md' : 'border-slate-100 opacity-60'}`}>
                          <CreditCard size={18} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Cash</span>
                        </button>
                        <button onClick={() => setPaymentMethod('M-Pesa')} className={`py-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'M-Pesa' ? 'border-green-600 bg-white shadow-md' : 'border-slate-100 opacity-60'}`}>
                          <Smartphone size={18} />
                          <span className="text-[10px] font-black uppercase tracking-widest">M-Pesa</span>
                        </button>
                      </div>

                      <button disabled={cart.length === 0} onClick={handleCheckout} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-2xl flex items-center justify-center space-x-3 text-lg active:scale-95 transition-all">
                        <Printer size={20} />
                        <span>PROCESS SALE</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Optimized Inventory Table */}
            {activeTab === 'products' && (
              <div className="space-y-6 md:space-y-10">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                   <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Inventory</h2>
                  <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg">
                    <Plus size={18} /> Add Stock
                  </button>
                </div>
                <div className="bg-white rounded-[24px] md:rounded-[40px] shadow-sm border border-slate-50 overflow-hidden">
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-50/50 border-b border-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        <tr>
                            <th className="px-6 md:px-10 py-5">Product</th>
                            <th className="px-6 py-5 text-center">Price</th>
                            <th className="px-6 py-5 text-center">Stock</th>
                            <th className="px-6 md:px-10 py-5 text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                        {state.products.map(p => (
                            <tr key={p.id} className="group hover:bg-slate-50/30">
                            <td className="px-6 md:px-10 py-5 font-bold text-slate-800">{p.name}</td>
                            <td className="px-6 py-5 text-center text-slate-600 font-bold">KES {p.price}</td>
                            <td className={`px-6 py-5 text-center font-black ${p.stock < 10 ? 'text-red-500' : 'text-slate-800'}`}>{p.stock}</td>
                            <td className="px-6 md:px-10 py-5 text-right space-x-2">
                                <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="p-2 text-indigo-500"><Edit3 size={18} /></button>
                                <button onClick={() => deleteProduct(p.id)} className="p-2 text-red-500"><Trash2 size={18} /></button>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Journal Module Responsive */}
            {activeTab === 'receipts' && (
                <div className="space-y-6 md:space-y-10">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Journal</h2>
                    <div className="grid grid-cols-1 gap-4">
                        {state.sales.map(sale => (
                            <div key={sale.id} className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="shrink-0 w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                        <ReceiptIcon size={24} />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 text-xl tracking-tighter">KES {sale.total.toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400 font-black uppercase mt-1">#{sale.id} • {new Date(sale.timestamp).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <button onClick={() => { setLastSale(sale); setIsReceiptOpen(true); }} className="w-full md:w-auto px-6 py-4 bg-slate-50 text-indigo-600 rounded-xl font-black text-sm uppercase">Open Receipt</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Reports Module Responsive */}
            {activeTab === 'reports' && (
                <div className="space-y-6 md:space-y-10">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Stats</h2>
                        <button onClick={handleDailySummary} disabled={isGeneratingSummary} className="bg-green-600 text-white px-6 py-4 rounded-xl font-black flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all w-full md:w-auto">
                            {isGeneratingSummary ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />}
                            WHATSAPP SUMMARY
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        <div className="bg-white p-8 md:p-10 rounded-[32px] md:rounded-[48px] border border-slate-50 shadow-sm">
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Total Revenue</p>
                            <p className="text-4xl md:text-5xl font-black text-indigo-600 tracking-tighter">KES {state.sales.reduce((a,b)=>a+b.total,0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-8 md:p-10 rounded-[32px] md:rounded-[48px] border border-slate-50 shadow-sm">
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Transactions</p>
                            <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{state.sales.length}</p>
                        </div>
                    </div>
                </div>
            )}
          </Layout>
        )}
      </div>

      {/* Responsive Success Dialog */}
      {isReceiptOpen && lastSale && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[600] flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[32px] md:rounded-[50px] p-6 md:p-10 max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="text-center mb-6">
              <CheckCircle2 size={40} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">SUCCESS</h3>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-100 mb-6 overflow-hidden">
                <Receipt sale={lastSale} business={state.business} />
            </div>
            
            <div className="flex flex-col gap-3">
              <button disabled={isPrinting} onClick={handlePrint} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95">
                {isPrinting ? <Loader2 className="animate-spin" size={20} /> : <Printer size={20} />}
                {isPrinting ? 'PREPARING...' : 'PRINT RECEIPT'}
              </button>
              <button onClick={() => setIsReceiptOpen(false)} className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] text-center">
                BACK TO REGISTER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Management Responsive */}
      {activeTab === 'staff' && (
        <div className="space-y-6 md:space-y-10">
          <div className="flex justify-between items-center">
             <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Personnel</h2>
             <button onClick={() => setIsStaffModalOpen(true)} className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg shadow-indigo-100"><Plus size={24}/></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            {state.staff.map(s => (
              <div key={s.id} className="bg-white p-6 md:p-10 rounded-[24px] md:rounded-[48px] border border-slate-50 shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900">{s.name}</h3>
                    <p className="text-slate-400 uppercase text-[10px] font-black tracking-widest">{s.role}</p>
                  </div>
                  <button onClick={() => deleteStaff(s.id)} className="p-3 bg-red-50 text-red-500 rounded-xl"><Trash2 size={20} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal containers responsive */}
      {(isProductModalOpen || isStaffModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-4 no-print">
           <div className="bg-white rounded-[32px] p-8 md:p-12 max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black">Entry Form</h3>
                <button onClick={() => { setIsProductModalOpen(false); setIsStaffModalOpen(false); }} className="text-slate-400"><X size={24}/></button>
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
                }} className="space-y-4">
                  <input name="name" defaultValue={editingProduct?.name} required className="w-full p-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Product Name" />
                  <div className="grid grid-cols-2 gap-4">
                     <input name="price" type="number" defaultValue={editingProduct?.price} required className="w-full p-4 bg-slate-50 rounded-xl" placeholder="Price" />
                     <input name="stock" type="number" defaultValue={editingProduct?.stock} required className="w-full p-4 bg-slate-50 rounded-xl" placeholder="Stock" />
                  </div>
                  <select name="category" defaultValue={editingProduct?.category} className="w-full p-4 bg-slate-50 rounded-xl border-none">
                     {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100">Save Item</button>
                </form>
              )}
              {isStaffModalOpen && (
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    setState(prev => ({ ...prev, staff: [...prev.staff, { id: Date.now().toString(), name: fd.get('name') as string, role: fd.get('role') as any, pin: fd.get('pin') as string }] }));
                    setIsStaffModalOpen(false);
                }} className="space-y-4">
                  <input name="name" required className="w-full p-4 bg-slate-50 rounded-xl" placeholder="Full Name" />
                  <input name="pin" maxLength={4} pattern="\d{4}" required className="w-full p-4 bg-slate-50 rounded-xl text-center text-2xl tracking-[0.5em]" placeholder="4 PIN" />
                  <select name="role" className="w-full p-4 bg-slate-50 rounded-xl">
                      <option value="cashier">Cashier</option>
                      <option value="admin">Admin</option>
                  </select>
                  <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold">Register</button>
                </form>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
