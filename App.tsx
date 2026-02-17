
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ShoppingBag, 
  CreditCard, 
  Smartphone,
  Banknote,
  Printer,
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
  ArrowRight,
  ImageIcon,
  AlertCircle,
  FileDown,
  Percent,
  RotateCcw,
  ClipboardList,
  AlertTriangle,
  Upload,
  Minus,
  Download,
  Delete,
  Bot,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import Layout from './components/Layout';
import Receipt from './components/Receipt';
import { Product, Staff, Sale, BusinessConfig, AppState, SaleItem, ActivityLog, DiscountType, StaffRole } from './types';
import { INITIAL_PRODUCTS, MOCK_STAFF, VAT_RATE, CATEGORIES, MOCK_SALES } from './constants';
import { generateDailySummary, veiraChat } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('veira_pos_v4');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      onboarded: false,
      business: { name: '', whatsappNumber: '', kraPin: '', address: '', currency: 'KES' },
      staff: MOCK_STAFF,
      products: INITIAL_PRODUCTS,
      sales: MOCK_SALES,
      logs: [],
      currentStaff: null
    };
  });

  useEffect(() => {
    localStorage.setItem('veira_pos_v4', JSON.stringify(state));
  }, [state]);

  const [activeTab, setActiveTab] = useState('sales');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('Fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'M-Pesa' | 'Card'>('Cash');
  
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  // Assistant State
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping]);

  const addLog = (action: string, details: string) => {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      staffName: state.currentStaff?.name || 'System',
      action,
      details
    };
    setState(prev => ({ ...prev, logs: [newLog, ...prev.logs].slice(0, 100) }));
  };

  const [pinInput, setPinInput] = useState('');

  // Auto-login logic
  useEffect(() => {
    if (pinInput.length === 4) {
      const user = state.staff.find(s => s.pin === pinInput);
      if (user) {
        setState(prev => ({ ...prev, currentStaff: user }));
        setPinInput('');
        addLog('Login', `User ${user.name} logged in.`);
        
        const roles: Record<StaffRole, string[]> = {
          owner: ['sales', 'products', 'staff', 'receipts', 'reports'],
          manager: ['sales', 'products', 'staff', 'receipts', 'reports'],
          accountant: ['products', 'receipts', 'reports'],
          auditor: ['products', 'receipts', 'reports'],
          cashier: ['sales', 'receipts'],
        };
        const allowedTabs = roles[user.role];
        if (!allowedTabs.includes(activeTab)) {
          setActiveTab(allowedTabs[0]);
        }
      } else {
        const timer = setTimeout(() => {
          setPinInput('');
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [pinInput, state.staff, activeTab]);

  const handleSendMessage = async (msg?: string) => {
    const text = msg || chatInput;
    if (!text.trim()) return;

    const newHistory = [...chatHistory, { role: 'user', text } as const];
    setChatHistory(newHistory);
    setChatInput('');
    setIsTyping(true);

    const response = await veiraChat(text, chatHistory, {
      sales: state.sales,
      products: state.products,
      logs: state.logs,
      staff: state.staff,
      businessName: state.business.name
    });

    setChatHistory([...newHistory, { role: 'model', text: response || '' }]);
    setIsTyping(false);
  };

  const handleDailySummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const summary = await generateDailySummary(
        state.sales.filter(s => s.status === 'active'),
        state.products,
        state.business.name
      );
      
      const whatsappUrl = `https://wa.me/${state.business.whatsappNumber}?text=${encodeURIComponent(summary || '')}`;
      window.open(whatsappUrl, '_blank');
      addLog('AI Report', 'Generated and shared daily summary report.');
    } catch (error) {
      console.error("Error generating summary:", error);
      alert('Failed to generate report via Gemini. Check connection.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const addToCart = (product: Product) => {
    if (['accountant', 'auditor'].includes(state.currentStaff?.role || '')) return;
    const inCart = cart.find(i => i.productId === product.id)?.quantity || 0;
    if (product.stock <= inCart) return alert('Out of stock!');
    
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

  const updateCartQuantity = (productId: string, delta: number) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        if (delta > 0 && product.stock < newQty) {
          alert(`Only ${product.stock} items in stock.`);
          return item;
        }
        return { ...item, quantity: newQty, total: newQty * item.price };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const calculatedDiscount = discountType === 'Percentage' 
    ? (cartSubtotal * (discountValue / 100)) 
    : discountValue;
  
  const cartTotal = Math.max(0, cartSubtotal - calculatedDiscount);

  const handleCheckout = () => {
    if (cart.length === 0 || !state.currentStaff) return;

    const tax = cartTotal * (VAT_RATE / (1 + VAT_RATE)); 
    
    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      timestamp: Date.now(),
      items: [...cart],
      total: cartTotal,
      subtotal: cartSubtotal,
      discount: calculatedDiscount,
      discountConfig: { type: discountType, value: discountValue },
      tax,
      paymentMethod,
      staffId: state.currentStaff.id,
      staffName: state.currentStaff.name,
      etimsControlNumber: `KRA-${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
      status: 'active'
    };

    setState(prev => ({
      ...prev,
      sales: [newSale, ...prev.sales],
      products: prev.products.map(p => {
        const item = cart.find(ci => ci.productId === p.id);
        return item ? { ...p, stock: p.stock - item.quantity } : p;
      })
    }));

    addLog('Sale', `Completed sale #${newSale.id} for KES ${cartTotal.toLocaleString()}`);
    setLastSale(newSale);
    setCart([]);
    setDiscountValue(0);
    setDiscountType('Fixed');
    setPaymentMethod('Cash');
    setIsReceiptOpen(true);
  };

  const handleVoidSale = (saleId: string) => {
    if (!state.currentStaff || !['owner', 'manager'].includes(state.currentStaff.role)) {
      alert('Only owners or managers can void transactions.');
      return;
    }

    if (!confirm('Void this transaction? Items will return to inventory.')) return;

    const sale = state.sales.find(s => s.id === saleId);
    if (!sale || sale.status === 'voided') return;

    setState(prev => ({
      ...prev,
      sales: prev.sales.map(s => s.id === saleId ? { ...s, status: 'voided' } : s),
      products: prev.products.map(p => {
        const item = sale.items.find(si => si.productId === p.id);
        return item ? { ...p, stock: p.stock + item.quantity } : p;
      })
    }));

    addLog('Void', `Voided sale #${saleId} by ${state.currentStaff.name}`);
  };

  const canManageInventory = ['owner', 'manager'].includes(state.currentStaff?.role || '');
  const filteredProducts = state.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen">
      <div id="print-section">
        {lastSale && <Receipt sale={lastSale} business={state.business} />}
      </div>

      <div className="no-print">
        {!state.onboarded ? (
          <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
             <div className="bg-white rounded-[40px] md:rounded-[48px] p-8 md:p-12 w-full max-w-md shadow-2xl border border-slate-100 text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-[28px] md:rounded-[32px] flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-indigo-100">
                    <ShoppingBag size={32} strokeWidth={2.5}/>
                </div>
                <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tighter">Veira</h1>
                <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mb-8">Setup your shop</p>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    setState(p => ({...p, onboarded: true, business: {
                        name: fd.get('name') as string,
                        whatsappNumber: fd.get('whatsapp') as string,
                        kraPin: fd.get('kraPin') as string,
                        address: fd.get('address') as string,
                        currency: 'KES'
                    }}));
                    addLog('Setup', 'Business profile initialized.');
                }} className="space-y-4">
                    <input name="name" required className="w-full px-6 py-4 md:px-7 md:py-5 rounded-3xl bg-slate-50 border-none font-bold" placeholder="Shop Name" />
                    <input name="whatsapp" required className="w-full px-6 py-4 md:px-7 md:py-5 rounded-3xl bg-slate-50 border-none font-bold" placeholder="WhatsApp (e.g. 254...)" />
                    <input name="kraPin" required className="w-full px-6 py-4 md:px-7 md:py-5 rounded-3xl bg-slate-50 border-none font-bold" placeholder="KRA PIN" />
                    <input name="address" required className="w-full px-6 py-4 md:px-7 md:py-5 rounded-3xl bg-slate-50 border-none font-bold" placeholder="Address / Location" />
                    <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 md:py-6 rounded-3xl shadow-xl flex items-center justify-center gap-3 mt-4 active:scale-95 transition-all text-lg">
                      <span>Launch Shop</span>
                      <ArrowRight size={22} />
                    </button>
                </form>
             </div>
          </div>
        ) : !state.currentStaff ? (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F8FAFC]">
            <h1 className="text-4xl md:text-5xl font-black mb-8 md:mb-12 tracking-tighter text-slate-900">VEIRA</h1>
            <div className="bg-white p-8 md:p-10 rounded-[40px] md:rounded-[56px] shadow-2xl w-full max-w-xs border border-slate-100">
              <div className="flex justify-center gap-4 md:gap-5 mb-8 md:mb-10">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-4 border-slate-100 transition-all ${pinInput.length > i ? 'bg-indigo-600 border-indigo-200 scale-125' : ''}`}></div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 md:gap-5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, <Delete size={20} />].map((btn, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (btn === 'C') setPinInput('');
                      else if (typeof btn !== 'number') {
                        setPinInput(p => p.slice(0, -1));
                      }
                      else if (pinInput.length < 4) setPinInput(p => p + btn);
                    }}
                    className={`h-16 w-16 md:h-20 md:w-20 mx-auto rounded-2xl md:rounded-[28px] flex items-center justify-center text-xl md:text-2xl font-black transition-all active:scale-90 ${
                      typeof btn === 'number' ? 'bg-slate-50 text-slate-700' : 'bg-red-50 text-red-500'
                    }`}
                  >
                    {btn}
                  </button>
                ))}
              </div>
              <p className="mt-8 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">Enter 4-digit PIN to unlock</p>
            </div>
          </div>
        ) : (
          <Layout 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            staffName={state.currentStaff.name} 
            staffRole={state.currentStaff.role}
            onLogout={() => setState(prev => ({ ...prev, currentStaff: null }))}
          >
            {activeTab === 'sales' && (
              <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12">
                <div className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-6 md:space-y-8">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tighter">POS Terminal</h2>
                        <p className="text-slate-400 font-bold text-[9px] md:text-[10px] uppercase tracking-widest mt-1">Ready for transaction</p>
                    </div>
                    <div className="relative w-full sm:w-64 md:w-72">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search products..." 
                            className="w-full bg-white border-none shadow-sm rounded-2xl py-4 pl-12 pr-6 font-bold text-sm"
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`bg-white rounded-3xl md:rounded-[40px] border border-slate-50 shadow-sm transition-all text-left relative overflow-hidden active:scale-95 flex flex-col ${product.stock <= 0 ? 'opacity-30 grayscale' : 'hover:border-indigo-100 hover:shadow-lg'}`}
                      >
                        <div className="h-28 md:h-36 w-full overflow-hidden bg-slate-50">
                          <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                          {product.stock < 10 && product.stock > 0 && (
                            <div className="absolute top-3 right-3 bg-amber-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase shadow-sm">Low</div>
                          )}
                        </div>
                        <div className="p-4 md:p-6 flex-1 flex flex-col">
                          <h3 className="font-black text-slate-900 text-xs md:text-sm leading-tight mb-1 md:mb-2 line-clamp-2 min-h-[2.5rem] md:min-h-[3rem]">{product.name}</h3>
                          <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-3 md:pt-4">
                              <p className="font-black text-slate-900 text-sm md:text-lg tracking-tighter">KES {product.price}</p>
                              <span className={`text-[7px] md:text-[8px] font-black px-1.5 py-0.5 rounded-lg uppercase ${product.stock < 10 ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-500'}`}>{product.stock}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="hidden lg:block lg:col-span-5 xl:col-span-4 no-print">
                  <div className="bg-white rounded-[48px] shadow-2xl flex flex-col h-[calc(100vh-160px)] sticky top-10 border border-slate-50 overflow-hidden">
                    <div className="p-7 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <h2 className="font-black text-xl tracking-tighter">Basket</h2>
                        <button onClick={() => { if(confirm('Clear cart?')) setCart([]); }} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-7 space-y-3 no-scrollbar">
                        {cart.map(item => (
                            <div key={item.productId} className="flex items-center justify-between p-4 rounded-[28px] bg-slate-50/50 border border-slate-100/30 group">
                                <div className="min-w-0 pr-2">
                                    <p className="font-black text-sm text-slate-800 leading-tight mb-1 truncate">{item.name}</p>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">KES {item.price}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                        <button onClick={() => updateCartQuantity(item.productId, -1)} className="p-2 hover:bg-slate-50 text-slate-400 transition-colors"><Minus size={14}/></button>
                                        <span className="w-8 text-center font-black text-xs">{item.quantity}</span>
                                        <button onClick={() => updateCartQuantity(item.productId, 1)} className="p-2 hover:bg-slate-50 text-slate-400 transition-colors"><Plus size={14}/></button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.productId)} className="text-slate-200 hover:text-red-500 transition-colors p-1"><X size={16}/></button>
                                </div>
                            </div>
                        ))}
                        {cart.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 text-center">
                                <ShoppingBag size={48} className="mb-4 mx-auto" />
                                <p className="font-black uppercase tracking-widest text-[10px]">Empty Basket</p>
                            </div>
                        )}
                    </div>

                    <div className="p-7 bg-slate-50 border-t border-slate-100 space-y-5 shrink-0">
                        <div className="space-y-1.5 px-1">
                             <div className="flex justify-between items-center">
                                <span className="text-slate-400 font-black text-[9px] uppercase tracking-widest">Subtotal</span>
                                <span className="font-bold text-sm">KES {cartSubtotal.toLocaleString()}</span>
                             </div>
                             <div className="flex justify-between items-center text-indigo-600">
                                <button onClick={() => setIsDiscountModalOpen(true)} className="font-black text-[9px] uppercase tracking-widest hover:underline flex items-center gap-1.5">
                                    <Percent size={12} />
                                    <span>Discount</span>
                                </button>
                                <span className="font-black text-sm">- KES {calculatedDiscount.toLocaleString()}</span>
                             </div>
                             <div className="flex justify-between items-end pt-3 border-t border-slate-200 mt-2">
                                <span className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-1">Total Payable</span>
                                <span className="text-4xl font-black tracking-tighter">KES {cartTotal.toLocaleString()}</span>
                             </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setPaymentMethod('Cash')} className={`py-3 rounded-xl border-2 font-black text-[7px] uppercase tracking-widest flex flex-col items-center gap-1 transition-all ${paymentMethod === 'Cash' ? 'border-indigo-600 bg-white shadow-lg text-indigo-600' : 'border-slate-200 text-slate-300'}`}>
                                <Banknote size={16}/>
                                <span>Cash</span>
                            </button>
                            <button onClick={() => setPaymentMethod('M-Pesa')} className={`py-3 rounded-xl border-2 font-black text-[7px] uppercase tracking-widest flex flex-col items-center gap-1 transition-all ${paymentMethod === 'M-Pesa' ? 'border-green-600 bg-white shadow-lg text-green-600' : 'border-slate-200 text-slate-300'}`}>
                                <Smartphone size={16}/>
                                <span>M-Pesa</span>
                            </button>
                            <button onClick={() => setPaymentMethod('Card')} className={`py-3 rounded-xl border-2 font-black text-[7px] uppercase tracking-widest flex flex-col items-center gap-1 transition-all ${paymentMethod === 'Card' ? 'border-blue-600 bg-white shadow-lg text-blue-600' : 'border-slate-200 text-slate-300'}`}>
                                <CreditCard size={16}/>
                                <span>Card</span>
                            </button>
                        </div>

                        <button disabled={cart.length === 0} onClick={handleCheckout} className="w-full bg-slate-900 text-white font-black py-5 rounded-[28px] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-20 text-lg">
                            <Printer size={22} strokeWidth={2.5} />
                            <span>Finish Order</span>
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-8 md:space-y-10">
                <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
                   <div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tighter">Inventory</h2>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Managed stock items</p>
                    </div>
                   {canManageInventory && (
                     <div className="flex gap-3">
                        <button onClick={() => setIsBulkImportOpen(true)} className="bg-white border border-slate-100 text-slate-900 px-5 py-4 rounded-2xl font-black flex items-center gap-2 shadow-sm active:scale-90 transition-all text-[10px] uppercase tracking-widest shrink-0"><Upload size={16}/> Bulk Import</button>
                        <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-indigo-600 text-white w-14 h-14 md:w-16 md:h-16 rounded-[20px] md:rounded-3xl shadow-xl flex items-center justify-center active:scale-90 transition-all shrink-0"><Plus size={28} strokeWidth={3}/></button>
                     </div>
                   )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {state.products.map(p => (
                    <div key={p.id} className="bg-white rounded-3xl md:rounded-[40px] border border-slate-100 flex flex-col shadow-sm hover:shadow-lg transition-all group overflow-hidden">
                      <div className="h-40 w-full overflow-hidden bg-slate-50 relative">
                        <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                        {p.stock <= 0 && (
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                                <span className="bg-red-500 text-white px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg">Out of Stock</span>
                            </div>
                        )}
                      </div>
                      <div className="p-6 md:p-8 flex flex-col flex-1">
                        <div className="flex-1">
                            <h3 className="font-black text-xl leading-tight text-slate-900 mb-2 truncate">{p.name}</h3>
                            <span className="text-[9px] text-indigo-500 font-black uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-lg">{p.category}</span>
                        </div>
                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-50">
                            <div>
                                <p className="text-[8px] text-slate-400 font-black uppercase mb-1">Unit Price</p>
                                <p className="font-black text-xl tracking-tighter text-slate-900">KES {p.price.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[8px] text-slate-400 font-black uppercase mb-1">Available</p>
                                    <p className={`font-black text-lg ${p.stock < 10 ? 'text-amber-500' : 'text-slate-900'}`}>{p.stock}</p>
                                </div>
                                {canManageInventory && (
                                  <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="p-3 text-indigo-500 bg-indigo-50 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Edit3 size={18}/></button>
                                )}
                            </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'receipts' && (
                <div className="space-y-8 md:space-y-10">
                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter">Transaction Log</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {state.sales.map(sale => (
                            <div key={sale.id} className={`bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border flex items-center justify-between shadow-sm hover:scale-[1.01] transition-all relative overflow-hidden ${sale.status === 'voided' ? 'border-red-100 opacity-60' : 'border-slate-100'}`}>
                                <div className="flex items-center gap-4 md:gap-6 min-w-0">
                                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-[24px] flex items-center justify-center shadow-lg shrink-0 ${sale.status === 'voided' ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
                                        {sale.status === 'voided' ? <RotateCcw size={28}/> : <History size={28}/>}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 md:gap-3 mb-1 min-w-0">
                                            <p className="font-black text-xl md:text-2xl tracking-tighter text-slate-900 truncate">KES {sale.total.toLocaleString()}</p>
                                            {sale.status === 'voided' && <span className="bg-red-50 text-red-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-md shrink-0">Void</span>}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest truncate">#{sale.id} • {new Date(sale.timestamp).toLocaleDateString()}</p>
                                        <p className="text-[9px] font-bold text-slate-300 mt-1 uppercase tracking-tight">{sale.staffName} • {sale.paymentMethod}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                                    {sale.status === 'active' && canManageInventory && (
                                        <button onClick={() => handleVoidSale(sale.id)} className="w-10 h-10 md:w-12 md:h-12 text-red-400 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all" title="Void Sale"><RotateCcw size={18}/></button>
                                    )}
                                    <button onClick={() => { setLastSale(sale); setIsReceiptOpen(true); }} className="w-12 h-12 md:w-14 md:h-14 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-indigo-50 hover:bg-indigo-600 hover:text-white transition-all"><ReceiptIcon size={22}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'staff' && (
                <div className="space-y-10 md:space-y-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 md:gap-12">
                        <div className="lg:col-span-2 space-y-6 md:space-y-8">
                             <div className="flex justify-between items-center">
                                <h2 className="text-3xl md:text-4xl font-black tracking-tighter">Activity</h2>
                                <button onClick={() => { if(confirm('Clear history?')) setState(prev => ({...prev, logs: []})); }} className="text-[9px] font-black uppercase text-slate-400 hover:text-red-500 tracking-widest transition-colors">Clear Logs</button>
                             </div>
                             <div className="bg-white rounded-[40px] md:rounded-[48px] border border-slate-100 overflow-hidden shadow-sm">
                                 <div className="divide-y divide-slate-50">
                                     {state.logs.length === 0 ? (
                                         <div className="p-20 text-center opacity-20">
                                             <ClipboardList size={48} className="mx-auto mb-4" />
                                             <p className="font-black uppercase tracking-widest text-[10px]">No recent activity</p>
                                         </div>
                                     ) : state.logs.map(log => (
                                         <div key={log.id} className="p-6 flex items-start gap-4 md:gap-6 hover:bg-slate-50 transition-colors">
                                             <div className="bg-slate-100 p-2.5 rounded-xl text-[8px] font-black uppercase whitespace-nowrap text-slate-500">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                             <div className="min-w-0">
                                                 <p className="font-black text-slate-900 leading-tight mb-1 text-sm">{log.staffName}: <span className="text-indigo-600 uppercase text-[9px] tracking-widest ml-2 bg-indigo-50 px-2 py-0.5 rounded-md">{log.action}</span></p>
                                                 <p className="text-slate-400 text-xs">{log.details}</p>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                        </div>

                        <div className="space-y-8">
                            <div className="flex justify-between items-center">
                                <h2 className="text-3xl md:text-4xl font-black tracking-tighter">Team</h2>
                                <button onClick={() => setIsStaffModalOpen(true)} className="w-12 h-12 bg-indigo-600 text-white rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-all shrink-0"><UserPlus size={22}/></button>
                            </div>
                            <div className="space-y-4">
                                {state.staff.map(s => (
                                    <div key={s.id} className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center justify-between group shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black shadow-inner">{s.name.charAt(0)}</div>
                                            <div>
                                                <h3 className="font-black text-slate-900 text-sm leading-none mb-1.5">{s.name}</h3>
                                                <span className="text-[8px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md">{s.role}</span>
                                            </div>
                                        </div>
                                        {state.currentStaff?.role === 'owner' && s.role !== 'owner' && (
                                          <button onClick={() => { if(confirm('Remove team member?')) setState(prev => ({...prev, staff: prev.staff.filter(st => st.id !== s.id)})) }} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"><Trash2 size={16}/></button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="space-y-10 md:space-y-12 pb-10">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black tracking-tighter">Performance</h2>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Business insights</p>
                        </div>
                        <button 
                          onClick={handleDailySummary}
                          disabled={isGeneratingSummary}
                          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                          {isGeneratingSummary ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                          <span>Share Daily Report</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Today's Sales</p>
                            <p className="text-3xl font-black tracking-tighter">KES {state.sales.filter(s => s.status === 'active' && new Date(s.timestamp).toDateString() === new Date().toDateString()).reduce((acc, s) => acc + s.total, 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Transactions</p>
                            <p className="text-3xl font-black tracking-tighter">{state.sales.filter(s => s.status === 'active').length}</p>
                        </div>
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Items in Stock</p>
                            <p className="text-3xl font-black tracking-tighter">{state.products.reduce((acc, p) => acc + p.stock, 0)}</p>
                        </div>
                    </div>
                </div>
            )}
          </Layout>
        )}
      </div>

      {/* Veira Assistant Floating Button */}
      {state.currentStaff && (
        <button 
          onClick={() => setIsAssistantOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl z-[500] flex items-center justify-center hover:scale-110 active:scale-95 transition-all no-print ring-4 ring-white"
        >
          <Bot size={28} strokeWidth={2.5} />
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            <Sparkles size={10} />
          </div>
        </button>
      )}

      {/* Veira Assistant Side Panel */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.15)] z-[600] transform transition-all duration-500 ease-in-out flex flex-col no-print ${isAssistantOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-[18px] flex items-center justify-center shadow-xl">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="font-black text-xl tracking-tighter">Veira Assistant</h3>
              <p className="text-[9px] font-black uppercase text-indigo-500 tracking-widest">Always Online • AI Powered</p>
            </div>
          </div>
          <button onClick={() => setIsAssistantOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-colors border border-transparent hover:border-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-white">
          {chatHistory.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10 px-6">
              <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6">
                <Sparkles size={40} className="text-indigo-400" />
              </div>
              <h4 className="font-black text-lg mb-2">Hello, I'm Veira</h4>
              <p className="text-xs font-bold text-slate-400 leading-relaxed max-w-[200px]">Ask me about today's sales, stock levels, or ETIMS compliance.</p>
              
              <div className="grid grid-cols-1 gap-3 mt-10 w-full max-w-[280px]">
                <button onClick={() => handleSendMessage("Show me today's sales summary.")} className="px-5 py-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-between group">
                  <span>Sales Summary</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => handleSendMessage("What needs restocking?")} className="px-5 py-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-between group">
                  <span>Stock Alerts</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => handleSendMessage("Did all receipts today go to KRA?")} className="px-5 py-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-between group">
                  <span>Sync Status</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {chatHistory.map((chat, idx) => (
            <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-5 rounded-[28px] text-sm leading-relaxed shadow-sm ${
                chat.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-100 font-bold' 
                : 'bg-slate-50 text-slate-800 rounded-bl-none border border-slate-100'
              }`}>
                {chat.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-50 p-5 rounded-[28px] rounded-bl-none border border-slate-100">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-8 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="relative"
          >
            <input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type your question..."
              className="w-full bg-white border border-slate-200 rounded-[32px] py-6 pl-8 pr-20 font-bold text-sm shadow-xl focus:ring-4 focus:ring-indigo-100 transition-all"
            />
            <button 
              type="submit"
              disabled={isTyping || !chatInput.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-30"
            >
              <Send size={20} strokeWidth={3} />
            </button>
          </form>
          <p className="text-[8px] text-center font-black uppercase text-slate-300 mt-4 tracking-widest">Veira AI may provide inaccurate data. Always double-check.</p>
        </div>
      </div>

      {/* Receipt Modal Overlay */}
      {isReceiptOpen && lastSale && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-[40px] p-8 max-w-sm w-full max-h-[90vh] overflow-y-auto no-scrollbar relative shadow-2xl">
            <button 
              onClick={() => setIsReceiptOpen(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
            <div className="mt-4">
              <Receipt sale={lastSale} business={state.business} />
            </div>
            <button 
              onClick={() => { window.print(); }}
              className="w-full mt-8 bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
            >
              <Printer size={20} />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
