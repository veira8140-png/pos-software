
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Edit3, ShoppingBag, CreditCard, Smartphone, Banknote, Printer, 
  Send, Package, Receipt as ReceiptIcon, UserPlus, Loader2, Search, X, 
  History, ArrowRight, Percent, RotateCcw, ClipboardList, Upload, Minus, 
  Delete, Bot, Sparkles, ChevronRight, ShoppingCart, Mic, MicOff, Volume2,
  DollarSign, TrendingUp, TrendingDown, Users as UsersIcon, Building2, Wallet, 
  AlertCircle, BarChart, Download, Save, Info, UserCheck, ShieldAlert,
  ArrowDownLeft, ArrowUpRight, Truck, Briefcase
} from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import Layout from './components/Layout';
import Receipt from './components/Receipt';
import { 
  Product, Staff, Sale, BusinessConfig, AppState, SaleItem, 
  ActivityLog, DiscountType, StaffRole, Expense, Customer, Debt, Branch, Supplier 
} from './types';
import { 
  INITIAL_PRODUCTS, MOCK_STAFF, VAT_RATE, INITIAL_BRANCHES, 
  MOCK_CUSTOMERS, MOCK_SUPPLIERS, MOCK_EXPENSES, MOCK_SALES 
} from './constants';
import { generateDailySummary, veiraChat, getBusinessInsights } from './services/geminiService';

// --- Utils ---
const formatKES = (val: number) => `KES ${val.toLocaleString()}`;

function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('veira_pos_v6');
    if (saved) return JSON.parse(saved);
    return {
      onboarded: false,
      business: { name: '', whatsappNumber: '', kraPin: '', address: '', currency: 'KES' },
      branches: INITIAL_BRANCHES,
      staff: MOCK_STAFF,
      products: INITIAL_PRODUCTS,
      sales: MOCK_SALES,
      expenses: MOCK_EXPENSES,
      customers: MOCK_CUSTOMERS,
      suppliers: MOCK_SUPPLIERS,
      debts: [],
      logs: [],
      currentStaff: null,
      currentBranchId: 'b1',
      integrations: {
        google: { connected: false, lastSync: null },
        zoho: { connected: false, lastSync: null },
        qbo: { connected: false, lastSync: null }
      }
    };
  });

  useEffect(() => {
    localStorage.setItem('veira_pos_v6', JSON.stringify(state));
  }, [state]);

  const [activeTab, setActiveTab] = useState('sales');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('Fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('Cash');
  const [searchQuery, setSearchQuery] = useState('');
  const [pinInput, setPinInput] = useState('');
  
  // Modals
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

  // AI & Voice
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [aiInsights, setAiInsights] = useState('Checking your shop...');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Performance Data
  const currentBranchSales = state.sales.filter(s => s.branchId === state.currentBranchId && s.status === 'active');
  const todaySales = currentBranchSales.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString());
  const todayTotal = todaySales.reduce((a, s) => a + s.total, 0);
  const todayProfit = todaySales.reduce((a, s) => {
    const cost = s.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    return a + (s.total - cost);
  }, 0);
  const totalStockValue = state.products.reduce((a, p) => a + (p.stock * p.costPrice), 0);
  const totalReceivables = state.customers.reduce((a, c) => a + c.currentDebt, 0);

  useEffect(() => {
    if (activeTab === 'reports' && state.onboarded) {
      getBusinessInsights({
        sales: state.sales,
        products: state.products,
        expenses: state.expenses,
        businessName: state.business.name
      }).then(setAiInsights);
    }
  }, [activeTab]);

  useEffect(() => {
    if (pinInput.length === 4) {
      const staff = state.staff.find(s => s.pin === pinInput);
      if (staff) {
        setState(p => ({ ...p, currentStaff: staff }));
        setPinInput('');
        addLog('Login', `${staff.name} signed in`);
      } else {
        setTimeout(() => setPinInput(''), 300);
      }
    }
  }, [pinInput]);

  const addLog = (action: string, details: string) => {
    const log: ActivityLog = { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), staffName: state.currentStaff?.name || 'System', action, details };
    setState(p => ({ ...p, logs: [log, ...p.logs].slice(0, 200) }));
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get auth URL');
      }
      window.open(data.url, 'google_auth', 'width=600,height=700');
    } catch (err: any) {
      console.error("Failed to get Google Auth URL", err);
      alert(`Connection Error: ${err.message}`);
    }
  };

  const handleManualSync = async (provider: string) => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, data: state })
      });
      const result = await res.json();
      if (result.success) {
        setState(p => ({
          ...p,
          integrations: {
            ...p.integrations,
            [provider]: { ...p.integrations[provider as keyof typeof p.integrations], lastSync: Date.now() }
          }
        }));
        addLog('Sync', `Manual sync to ${provider} successful`);
        alert(`Sync to ${provider} successful!`);
      } else {
        alert(`Sync failed: ${result.error}`);
      }
    } catch (err) {
      console.error("Sync failed", err);
      alert("Sync failed. Check console for details.");
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_SUCCESS') {
        const provider = event.data.provider;
        setState(p => ({
          ...p,
          integrations: {
            ...p.integrations,
            [provider]: { connected: true, lastSync: null }
          }
        }));
        addLog('Integration', `Connected to ${provider}`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const addToCart = (p: Product) => {
    if (p.stock <= 0) {
      addLog('Stock Alert', `No stock left for: ${p.name}`);
      return alert('No items left in stock!');
    }
    setCart(prev => {
      const ex = prev.find(i => i.productId === p.id);
      if (ex) return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i);
      return [...prev, { 
        productId: p.id, 
        name: p.name, 
        code: p.sku || p.barcode || 'KE-ITEM',
        quantity: 1, 
        price: p.price, 
        costPrice: p.costPrice, 
        total: p.price 
      }];
    });
  };

  const handleCheckout = () => {
    if (!state.currentStaff) return;
    const subtotal = cart.reduce((a, b) => a + b.total, 0);
    const disc = discountType === 'Percentage' ? (subtotal * discountValue / 100) : discountValue;
    const total = Math.max(0, subtotal - disc);
    const tax = total * (VAT_RATE / (1 + VAT_RATE));

    const sale: Sale = {
      id: `TXN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      timestamp: Date.now(),
      items: [...cart],
      subtotal,
      discount: disc,
      total,
      tax,
      paymentMethod,
      staffId: state.currentStaff.id,
      staffName: state.currentStaff.name,
      branchId: state.currentBranchId,
      customerId: selectedCustomerId || undefined,
      etimsControlNumber: `KRA-${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
      status: 'active'
    };

    setState(prev => ({
      ...prev,
      sales: [sale, ...prev.sales],
      products: prev.products.map(p => {
        const item = cart.find(i => i.productId === p.id);
        return item ? { ...p, stock: p.stock - item.quantity } : p;
      })
    }));

    addLog('Sale', `Sale done: ${sale.id}`);
    setLastSale(sale);
    setCart([]);
    setSelectedCustomerId(null);
    setIsReceiptOpen(true);
    setIsMobileCartOpen(false);
  };

  const handleVoidSale = (saleId: string) => {
    if (state.currentStaff?.role !== 'owner' && state.currentStaff?.role !== 'manager') {
      return alert('Sorry, only the boss can cancel a sale.');
    }
    
    if (!confirm('Cancel this sale? Stock will be returned.')) return;

    const sale = state.sales.find(s => s.id === saleId);
    if (!sale) return;

    setState(prev => ({
      ...prev,
      sales: prev.sales.map(s => s.id === saleId ? { ...s, status: 'voided' } : s),
      products: prev.products.map(p => {
        const item = sale.items.find(si => si.productId === p.id);
        return item ? { ...p, stock: p.stock + item.quantity } : p;
      })
    }));
    addLog('Cancel', `Sale ${saleId} was cancelled`);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isTyping) return;
    const msg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setIsTyping(true);

    try {
      const response = await veiraChat(msg, chatHistory, { 
        businessName: state.business.name,
        sales: state.sales,
        products: state.products,
        expenses: state.expenses
      });
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Sorry, I can't reach the brain right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const startVoice = async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    setIsVoiceActive(true);
    audioContextInRef.current = new AudioContext({ sampleRate: 16000 });
    audioContextOutRef.current = new AudioContext({ sampleRate: 24000 });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          const source = audioContextInRef.current!.createMediaStreamSource(stream);
          const proc = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
          proc.onaudioprocess = (e) => {
            const data = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(data.length);
            for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
            sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encodeBase64(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
          };
          source.connect(proc);
          proc.connect(audioContextInRef.current!.destination);
        },
        onmessage: async (msg) => {
          const base64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64) {
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextOutRef.current!.currentTime);
            const buf = await decodeAudioData(decodeBase64(base64), audioContextOutRef.current!, 24000, 1);
            const node = audioContextOutRef.current!.createBufferSource();
            node.buffer = buf;
            node.connect(audioContextOutRef.current!.destination);
            node.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buf.duration;
          }
        }
      }
    });
    liveSessionRef.current = await sessionPromise;
  };

  const stopVoice = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
    setIsVoiceActive(false);
  };

  const filteredProducts = state.products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode === searchQuery);

  return (
    <div className="min-h-screen text-slate-900 bg-slate-50">
      <div id="print-section">
        {lastSale && (
          <Receipt 
            sale={lastSale} 
            business={state.business} 
            customerName={state.customers.find(c => c.id === lastSale.customerId)?.name}
            customerPin={state.customers.find(c => c.id === lastSale.customerId)?.phone} // Using phone as placeholder for PIN if not available
          />
        )}
      </div>
      
      {!state.onboarded ? (
        <Onboarding onComplete={(config:any) => setState(p => ({ ...p, onboarded: true, business: config }))} />
      ) : !state.currentStaff ? (
        <Login 
          pin={pinInput} 
          setPin={setPinInput} 
          branchName={state.branches.find(b => b.id === state.currentBranchId)?.name || 'Choose Shop'} 
          onSwitchBranch={(id:string) => setState(p => ({...p, currentBranchId: id}))} 
          branches={state.branches} 
          staff={state.staff}
        />
      ) : (
        <Layout activeTab={activeTab} setActiveTab={setActiveTab} staffName={state.currentStaff.name} staffRole={state.currentStaff.role} onLogout={() => setState(p => ({ ...p, currentStaff: null }))}>
          
          {/* SALES MODULE */}
          {activeTab === 'sales' && (
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-8 space-y-8">
                <header className="flex justify-between items-end">
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter">New Sale</h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Shop: {state.branches.find(b => b.id === state.currentBranchId)?.name}</p>
                  </div>
                  <div className="relative w-80">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Find items..." className="w-full bg-white shadow-xl shadow-slate-200/50 rounded-3xl py-5 pl-14 pr-6 font-bold border-none focus:ring-4 ring-indigo-100 transition-all" />
                  </div>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map(p => (
                    <ProductCard key={p.id} product={p} onClick={() => addToCart(p)} />
                  ))}
                </div>
              </div>

              <div className="hidden lg:block lg:col-span-4">
                <CartSection 
                  cart={cart} 
                  setCart={setCart} 
                  subtotal={cart.reduce((a, b) => a + b.total, 0)}
                  discountValue={discountValue}
                  setDiscountValue={setDiscountValue}
                  discountType={discountType}
                  setDiscountType={setDiscountType}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  onCheckout={handleCheckout}
                  customers={state.customers}
                  selectedCustomerId={selectedCustomerId}
                  setSelectedCustomerId={setSelectedCustomerId}
                />
              </div>
            </div>
          )}

          {/* INTEGRATIONS MODULE */}
          {activeTab === 'integrations' && (
            <div className="space-y-12">
              <header>
                <h2 className="text-4xl font-black tracking-tighter">Integrations</h2>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Connect your accounting & reporting tools</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {/* Google Workspace */}
                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                    <Download size={32} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Google Workspace</h3>
                  <p className="text-slate-500 text-sm mb-8 leading-relaxed">Sync sales to Google Sheets and store daily backups in Google Drive.</p>
                  <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${state.integrations.google.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {state.integrations.google.connected ? 'Connected' : 'Disconnected'}
                    </span>
                    <button 
                      onClick={() => state.integrations.google.connected ? setState(p => ({ ...p, integrations: { ...p.integrations, google: { connected: false, lastSync: null } } })) : handleConnectGoogle()}
                      className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${state.integrations.google.connected ? 'bg-slate-100 text-slate-600' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'}`}
                    >
                      {state.integrations.google.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>

                {/* Zoho Books */}
                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col">
                  <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-6">
                    <Briefcase size={32} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Zoho Books</h3>
                  <p className="text-slate-500 text-sm mb-8 leading-relaxed">Automate invoicing and inventory sync directly to your Zoho account.</p>
                  <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${state.integrations.zoho.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {state.integrations.zoho.connected ? 'Connected' : 'Disconnected'}
                    </span>
                    <button 
                      onClick={() => setState(p => ({ ...p, integrations: { ...p.integrations, zoho: { ...p.integrations.zoho, connected: !p.integrations.zoho.connected } } }))}
                      className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${state.integrations.zoho.connected ? 'bg-slate-100 text-slate-600' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'}`}
                    >
                      {state.integrations.zoho.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>

                {/* QuickBooks Online */}
                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
                    <DollarSign size={32} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">QuickBooks</h3>
                  <p className="text-slate-500 text-sm mb-8 leading-relaxed">Sync transactions and reconcile payments with QuickBooks Online.</p>
                  <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${state.integrations.qbo.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {state.integrations.qbo.connected ? 'Connected' : 'Disconnected'}
                    </span>
                    <button 
                      onClick={() => setState(p => ({ ...p, integrations: { ...p.integrations, qbo: { ...p.integrations.qbo, connected: !p.integrations.qbo.connected } } }))}
                      className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${state.integrations.qbo.connected ? 'bg-slate-100 text-slate-600' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'}`}
                    >
                      {state.integrations.qbo.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[48px] p-12 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-3xl font-black mb-4">Manual Sync</h3>
                  <p className="text-slate-400 max-w-xl mb-10">Push all unsynced transactions to your connected platforms. This will resolve any gaps and ensure your books are up to date.</p>
                  <button 
                    onClick={() => handleManualSync('google')}
                    disabled={!state.integrations.google.connected}
                    className={`px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center gap-4 ${state.integrations.google.connected ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                  >
                    <RotateCcw size={20} /> Force Full Sync
                  </button>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full -mr-48 -mt-48"></div>
              </div>
            </div>
          )}

          {/* DASHBOARD & REPORTS MODULE */}
          {activeTab === 'reports' && (
            <div className="space-y-10">
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black tracking-tighter">Shop Stats</h2>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Daily Overview</p>
                </div>
                <div className="flex gap-4">
                   <button className="bg-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all border border-slate-100"><Download size={18}/> Get Data</button>
                   <button className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:scale-105 transition-all"><BarChart size={18}/> Big Audit</button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Today Sales" value={formatKES(todayTotal)} icon={<ArrowUpRight/>} color="bg-indigo-600" trend="doing well"/>
                <StatCard label="Total Profit" value={formatKES(todayProfit)} icon={<TrendingUp/>} color="bg-emerald-500" trend="good job"/>
                <StatCard label="Daily Spent" value={formatKES(state.expenses.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString()).reduce((a,b)=>a+b.amount, 0))} icon={<ArrowDownLeft/>} color="bg-red-500" trend="bills"/>
                <StatCard label="Money Owed" value={formatKES(totalReceivables)} icon={<Wallet/>} color="bg-slate-900" trend="people owing"/>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -translate-y-1/2 translate-x-1/2 -z-10 group-hover:scale-110 transition-transform duration-700"></div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Bot size={28}/></div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tighter">Shop AI Help</h3>
                      <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Veira AI • Tips for you</p>
                    </div>
                  </div>
                  <p className="text-slate-600 text-lg leading-relaxed font-medium italic">"{aiInsights}"</p>
                  <div className="mt-10 grid grid-cols-3 gap-6 pt-10 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Coming Up</p>
                      <p className="font-black text-emerald-500 flex items-center gap-1"><TrendingUp size={14}/> growing</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Check this</p>
                      <p className="font-black text-amber-500 flex items-center gap-1"><ShieldAlert size={14}/> all good</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Customers</p>
                      <p className="font-black text-indigo-500 flex items-center gap-1"><UserCheck size={14}/> happy</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm flex flex-col">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black tracking-tighter">Expenses</h3>
                    <button onClick={() => setIsExpenseModalOpen(true)} className="p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:scale-110 transition-all"><Plus size={20}/></button>
                  </div>
                  <div className="space-y-4 flex-1">
                    {state.expenses.slice(0, 4).map(e => (
                      <div key={e.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-[28px] hover:bg-slate-100 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors shadow-sm"><TrendingDown size={18}/></div>
                           <div>
                              <p className="font-black text-sm text-slate-800">{e.category}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{e.description}</p>
                           </div>
                        </div>
                        <p className="font-black text-red-500">-{formatKES(e.amount)}</p>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-6 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">See All</button>
                </div>
              </div>

              {/* Advanced Analytics Table Mockup */}
              <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-2xl font-black tracking-tighter">Stock List</h3>
                    <div className="flex gap-2">
                       <span className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Needs Stock</span>
                       <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Total Value: {formatKES(totalStockValue)}</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-50">
                          <th className="pb-4">Item Name</th>
                          <th className="pb-4">Moving</th>
                          <th className="pb-4">Profit</th>
                          <th className="pb-4">Status</th>
                          <th className="pb-4 text-right">Left</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {state.products.map(p => (
                          <tr key={p.id} className="group">
                            <td className="py-6 font-black text-sm group-hover:text-indigo-600 transition-colors">{p.name}</td>
                            <td className="py-6 text-xs font-bold text-slate-500">Fast</td>
                            <td className="py-6 font-black text-emerald-500">+{formatKES(p.price - p.costPrice)}</td>
                            <td className="py-6">
                              {p.stock <= p.minStock ? (
                                <span className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase"><AlertCircle size={14}/> Fill Soon</span>
                              ) : (
                                <span className="text-emerald-500 text-[10px] font-black uppercase">Good</span>
                              )}
                            </td>
                            <td className="py-6 text-right font-black">{p.stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              </div>
            </div>
          )}

          {/* CRM & SUPPLIER MODULE */}
          {activeTab === 'staff' && (
             <div className="space-y-12">
                <header className="flex justify-between items-end">
                   <div>
                      <h2 className="text-4xl font-black tracking-tighter">Shops & People</h2>
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Manage your team and shops</p>
                   </div>
                   <div className="flex gap-4">
                      <button onClick={() => setIsBranchModalOpen(true)} className="bg-white border border-slate-100 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center gap-2"><Building2 size={18}/> Add Shop</button>
                      <button onClick={() => setIsStaffModalOpen(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2"><UserPlus size={18}/> Add Staff</button>
                   </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   {/* Staff List */}
                   <div className="lg:col-span-2 space-y-6">
                      <h3 className="text-xl font-black tracking-tight flex items-center gap-3"><UsersIcon size={20}/> Staff Sales</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {state.staff.map(s => (
                           <div key={s.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:border-indigo-200 transition-all">
                              <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-3xl font-black text-indigo-600 mb-4 group-hover:scale-110 transition-transform shadow-inner">{s.name.charAt(0)}</div>
                              <h4 className="text-xl font-black">{s.name}</h4>
                              <p className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-3 py-1 rounded-lg mt-2">{s.role}</p>
                              <div className="mt-8 pt-6 border-t border-slate-50 w-full grid grid-cols-2 gap-4">
                                 <div>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Sold Today</p>
                                    <p className="font-black text-sm">{formatKES(state.sales.filter(sl => sl.staffId === s.id && new Date(sl.timestamp).toDateString() === new Date().toDateString()).reduce((a, b) => a + b.total, 0))}</p>
                                 </div>
                                 <div>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Success</p>
                                    <p className="font-black text-sm text-emerald-500">High</p>
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>

                   {/* Quick Actions / Suppliers */}
                   <div className="space-y-8">
                      <div className="bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl">
                         <h3 className="text-xl font-black mb-6">Suppliers</h3>
                         <div className="space-y-5">
                            {state.suppliers.map(sup => (
                              <div key={sup.id} className="flex justify-between items-center border-b border-white/10 pb-4">
                                 <div>
                                    <p className="font-bold text-sm">{sup.name}</p>
                                    <p className="text-[9px] text-white/40 uppercase font-black">{sup.category}</p>
                                 </div>
                                 <p className="font-black text-amber-400">{formatKES(sup.outstandingBalance)}</p>
                              </div>
                            ))}
                         </div>
                         <button className="w-full mt-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Pay Suppliers</button>
                      </div>

                      <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm">
                         <h3 className="text-xl font-black mb-6">Our Shops</h3>
                         <div className="space-y-4">
                            {state.branches.map(b => (
                              <div key={b.id} className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${state.currentBranchId === b.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-50 hover:border-slate-100'}`} onClick={() => setState(p => ({...p, currentBranchId: b.id}))}>
                                 <p className="font-black text-sm">{b.name}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase">{b.location}</p>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>

                {/* Customer Module Mockup */}
                <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm">
                  <header className="flex justify-between items-center mb-10">
                    <h3 className="text-2xl font-black tracking-tighter">Our Customers</h3>
                    <button onClick={() => setIsCustomerModalOpen(true)} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2"><Plus size={18}/> New Customer</button>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {state.customers.map(c => (
                      <div key={c.id} className="p-8 bg-slate-50 rounded-[40px] border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer relative group">
                        <div className="flex justify-between items-start mb-6">
                           <div>
                              <h4 className="font-black text-xl">{c.name}</h4>
                              <p className="text-slate-400 font-bold text-xs">{c.phone}</p>
                           </div>
                           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform"><UserCheck size={24}/></div>
                        </div>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Points</span>
                              <span className="font-black text-indigo-600">{c.loyaltyPoints} Pts</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Bought Total</span>
                              <span className="font-black">{formatKES(c.totalSpent)}</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Owing</span>
                              <span className={`font-black ${c.currentDebt > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{c.currentDebt > 0 ? formatKES(c.currentDebt) : 'None'}</span>
                           </div>
                        </div>
                        {c.currentDebt > 0 && <div className="absolute top-4 right-4 animate-bounce"><AlertCircle className="text-red-500" size={18}/></div>}
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          )}

          {/* HISTORY MODULE */}
          {activeTab === 'receipts' && (
              <div className="space-y-10">
                  <header className="flex justify-between items-end">
                      <div>
                        <h2 className="text-4xl font-black tracking-tighter">Sales History</h2>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">All Sales Today</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="relative w-72 no-print">
                           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                           <input placeholder="Search sales..." className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-6 font-bold text-sm shadow-sm" />
                        </div>
                      </div>
                  </header>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {state.sales.map(sale => (
                          <div key={sale.id} className={`bg-white p-8 rounded-[40px] border flex items-center justify-between shadow-sm hover:scale-[1.01] transition-all relative overflow-hidden group ${sale.status === 'voided' ? 'border-red-100 bg-red-50/10' : 'border-slate-100'}`}>
                              <div className="flex items-center gap-6 min-w-0">
                                  <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-lg shrink-0 transition-all ${sale.status === 'voided' ? 'bg-red-500 text-white' : 'bg-slate-900 text-white group-hover:bg-indigo-600'}`}>
                                      {sale.status === 'voided' ? <RotateCcw size={28}/> : <History size={28}/>}
                                  </div>
                                  <div className="min-w-0">
                                      <div className="flex items-center gap-3 mb-1">
                                         <p className="font-black text-2xl tracking-tighter text-slate-900 truncate">{formatKES(sale.total)}</p>
                                         {sale.status === 'voided' && <span className="bg-red-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md">Cancelled</span>}
                                      </div>
                                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest truncate">#{sale.id} • {new Date(sale.timestamp).toLocaleString()}</p>
                                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{sale.staffName} • {sale.paymentMethod}</p>
                                  </div>
                              </div>
                              <div className="flex gap-3 no-print">
                                  {sale.status === 'active' && (
                                     <button onClick={() => handleVoidSale(sale.id)} className="w-12 h-12 text-red-400 hover:bg-red-50 rounded-2xl flex items-center justify-center transition-all border border-transparent hover:border-red-100" title="Void Transaction"><RotateCcw size={20}/></button>
                                  )}
                                  <button onClick={() => { setLastSale(sale); setIsReceiptOpen(true); }} className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-indigo-50 hover:bg-indigo-600 hover:text-white transition-all"><ReceiptIcon size={24}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
        </Layout>
      )}

      {/* MODALS */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/70 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const expense: Expense = {
              id: Math.random().toString(36).substr(2, 9),
              amount: Number(fd.get('amount')),
              category: fd.get('category') as any,
              description: String(fd.get('description')),
              timestamp: Date.now(),
              staffId: state.currentStaff?.id || '',
              branchId: state.currentBranchId
            };
            setState(p => ({ ...p, expenses: [expense, ...p.expenses] }));
            setIsExpenseModalOpen(false);
            addLog('Expense', `Spent ${formatKES(expense.amount)} on ${expense.category}`);
          }} className="bg-white rounded-[48px] p-12 w-full max-w-md shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black tracking-tighter">New Expense</h3>
              <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl"><X/></button>
            </div>
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase ml-2">How much?</p>
                <input name="amount" type="number" required autoFocus className="w-full bg-slate-50 p-6 rounded-3xl font-black text-2xl border-none ring-indigo-100 focus:ring-4 transition-all" placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase ml-2">What for?</p>
                <select name="category" required className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none appearance-none">
                  <option value="Supplies">Items & Stock</option>
                  <option value="Salaries">Staff Pay</option>
                  <option value="Rent">Rent</option>
                  <option value="Utility">Power & Water</option>
                  <option value="Transport">Delivery</option>
                  <option value="Other">Other stuff</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase ml-2">Notes</p>
                <textarea name="description" className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none" placeholder="More details..." rows={3} />
              </div>
            </div>
            <button className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl shadow-xl hover:scale-105 active:scale-95 transition-all text-xl">Save Expense</button>
          </form>
        </div>
      )}

      {isReceiptOpen && lastSale && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-[48px] p-10 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-300 flex flex-col items-center">
            <button onClick={() => setIsReceiptOpen(false)} className="absolute top-6 right-6 p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"><X/></button>
            <div className="w-full overflow-y-auto max-h-[70vh] no-scrollbar">
              <Receipt 
                sale={lastSale} 
                business={state.business} 
                customerName={state.customers.find(c => c.id === lastSale.customerId)?.name}
                customerPin={state.customers.find(c => c.id === lastSale.customerId)?.phone}
              />
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 w-full">
               <button onClick={() => {
                 // Small delay to ensure the print-section is updated and images (QR) are ready
                 setTimeout(() => {
                   window.focus();
                   window.print();
                 }, 150);
               }} className="bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-xl flex items-center justify-center gap-2 hover:scale-105 transition-all"><Printer size={20}/> Print</button>
               <button onClick={() => setIsReceiptOpen(false)} className="bg-slate-900 text-white font-black py-5 rounded-3xl shadow-xl hover:scale-105 transition-all">Done</button>
            </div>
          </div>
        </div>
      )}

      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/70 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const customer: Customer = {
              id: Math.random().toString(36).substr(2, 9),
              name: String(fd.get('name')),
              phone: String(fd.get('phone')),
              loyaltyPoints: 0,
              totalSpent: 0,
              lastVisit: Date.now(),
              creditLimit: Number(fd.get('creditLimit')),
              currentDebt: 0
            };
            setState(p => ({ ...p, customers: [customer, ...p.customers] }));
            setIsCustomerModalOpen(false);
            addLog('Customer', `Added new customer: ${customer.name}`);
          }} className="bg-white rounded-[48px] p-12 w-full max-w-md shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black tracking-tighter">New Customer</h3>
              <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl"><X/></button>
            </div>
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase ml-2">Full Name</p>
                <input name="name" required autoFocus className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none" placeholder="Customer Name" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase ml-2">Phone Number</p>
                <input name="phone" required className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none" placeholder="254..." />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase ml-2">Credit Limit</p>
                <input name="creditLimit" type="number" defaultValue={0} className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none" />
              </div>
            </div>
            <button className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl shadow-xl hover:scale-105 active:scale-95 transition-all text-xl">Add Customer</button>
          </form>
        </div>
      )}

      {isStaffModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/70 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const newStaff: Staff = {
              id: `s-${Math.random().toString(36).substr(2, 5)}`,
              name: String(fd.get('name')),
              pin: String(fd.get('pin')),
              role: fd.get('role') as StaffRole,
              branchId: state.currentBranchId
            };
            setState(p => ({ ...p, staff: [...p.staff, newStaff] }));
            setIsStaffModalOpen(false);
            addLog('Staff', `Added new staff: ${newStaff.name}`);
          }} className="bg-white rounded-[48px] p-12 w-full max-w-md shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black tracking-tighter">New Staff</h3>
              <button type="button" onClick={() => setIsStaffModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl"><X/></button>
            </div>
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase ml-2">Full Name</p>
                <input name="name" required autoFocus className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none" placeholder="Staff Name" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase ml-2">Login PIN (4 digits)</p>
                <input name="pin" required maxLength={4} className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none" placeholder="1234" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase ml-2">Role</p>
                <select name="role" required className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none appearance-none">
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="accountant">Accountant</option>
                  <option value="auditor">Auditor</option>
                </select>
              </div>
            </div>
            <button className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl shadow-xl hover:scale-105 active:scale-95 transition-all text-xl">Add Staff</button>
          </form>
        </div>
      )}

      {isBranchModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/70 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const newBranch: Branch = {
              id: `b-${Math.random().toString(36).substr(2, 5)}`,
              name: String(fd.get('name')),
              location: String(fd.get('location'))
            };
            setState(p => ({ ...p, branches: [...p.branches, newBranch] }));
            setIsBranchModalOpen(false);
            addLog('Shop', `Added new shop: ${newBranch.name}`);
          }} className="bg-white rounded-[48px] p-12 w-full max-w-md shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black tracking-tighter">New Shop</h3>
              <button type="button" onClick={() => setIsBranchModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl"><X/></button>
            </div>
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase ml-2">Shop Name</p>
                <input name="name" required autoFocus className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none" placeholder="Branch Name" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase ml-2">Location</p>
                <input name="location" required className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none" placeholder="City, Street" />
              </div>
            </div>
            <button className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl shadow-xl hover:scale-105 active:scale-95 transition-all text-xl">Add Shop</button>
          </form>
        </div>
      )}

      {isMobileCartOpen && (
        <div className="fixed inset-0 z-[1500] bg-slate-900/70 backdrop-blur-xl lg:hidden flex flex-col animate-in slide-in-from-bottom duration-500">
           <div className="flex-1" onClick={() => setIsMobileCartOpen(false)}></div>
           <div className="bg-white rounded-t-[64px] p-10 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-3xl font-black tracking-tighter">My Basket</h3>
                 <button onClick={() => setIsMobileCartOpen(false)} className="p-4 bg-slate-50 rounded-2xl"><X/></button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                {/* Customer Selector Mobile */}
                <div className="mb-8">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-2 ml-2">Customer</p>
                  <select 
                    value={selectedCustomerId || ''} 
                    onChange={e => setSelectedCustomerId(e.target.value || null)}
                    className="w-full bg-slate-50 p-6 rounded-[32px] font-bold border-none text-sm appearance-none"
                  >
                    <option value="">Walk-in Customer</option>
                    {state.customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4 mb-10">
                  {cart.map((item:any) => (
                    <div key={item.productId} className="flex items-center justify-between p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                       <div className="min-w-0 pr-4">
                          <p className="font-black text-sm truncate text-slate-800">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{formatKES(item.price)}</span>
                            <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">x{item.quantity}</span>
                          </div>
                       </div>
                       <div className="font-black text-slate-900">{formatKES(item.total)}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-8">
                  <div className="flex justify-between items-end font-black px-2">
                    <span className="text-slate-400 text-sm uppercase">To Pay</span>
                    <span className="text-5xl tracking-tighter text-slate-900">{formatKES(cart.reduce((a,b)=>a+b.total,0) - discountValue)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['Cash', 'M-Pesa', 'Card'].map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m as any)} className={`py-5 rounded-3xl border-2 font-black text-[11px] uppercase tracking-widest transition-all ${paymentMethod === m ? 'border-indigo-600 bg-white text-indigo-600 shadow-xl' : 'border-slate-200 text-slate-400'}`}>{m}</button>
                    ))}
                  </div>
                  <button onClick={handleCheckout} className="w-full bg-slate-900 text-white font-black py-7 rounded-[32px] shadow-2xl flex items-center justify-center gap-4 text-2xl active:scale-95 transition-all">
                    <Printer size={32}/> Pay Now
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Floating Buttons */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-4 z-[500] no-print items-end">
         {activeTab === 'sales' && cart.length > 0 && (
           <button onClick={() => setIsMobileCartOpen(true)} className="lg:hidden w-20 h-20 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all ring-8 ring-white relative">
              <ShoppingCart size={32} strokeWidth={2.5}/>
              <span className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-4 border-white">{cart.reduce((a, b)=>a+b.quantity,0)}</span>
           </button>
         )}
         <button onClick={() => setIsAssistantOpen(true)} className="w-20 h-20 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all ring-8 ring-white group relative">
            <Bot size={32} strokeWidth={2.5}/>
            <div className="absolute top-0 right-0 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
              <Sparkles size={12}/>
            </div>
         </button>
      </div>

      {/* Assistant Side Panel */}
      <Assistant 
        isOpen={isAssistantOpen} 
        onClose={() => setIsAssistantOpen(false)} 
        chatInput={chatInput}
        setChatInput={setChatInput}
        history={chatHistory}
        onSend={() => handleSendMessage()}
        isTyping={isTyping}
        isVoice={isVoiceActive}
        onVoiceToggle={isVoiceActive ? stopVoice : startVoice}
      />
    </div>
  );
};

// --- Sub-components ---

const Onboarding = ({ onComplete }: any) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
    <div className="bg-white p-12 md:p-20 rounded-[64px] shadow-2xl w-full max-w-2xl border border-slate-100 text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
      <div className="w-24 h-24 bg-indigo-600 rounded-[40px] flex items-center justify-center text-white mx-auto mb-10 shadow-2xl shadow-indigo-100 animate-bounce"><ShoppingBag size={48}/></div>
      <h1 className="text-6xl font-black tracking-tighter mb-4">Veira POS</h1>
      <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mb-16">Easy sales and stock tracking</p>
      <form onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onComplete({ 
          name: fd.get('name'), 
          whatsappNumber: fd.get('wa'), 
          email: fd.get('email'),
          kraPin: fd.get('pin'), 
          address: fd.get('addr'), 
          currency: 'KES' 
        });
      }} className="space-y-5 text-left max-w-md mx-auto">
        <div className="space-y-1"><p className="text-[10px] text-slate-400 font-black uppercase ml-4">Shop Name</p><input name="name" required placeholder="My Shop" className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none" /></div>
        <div className="space-y-1"><p className="text-[10px] text-slate-400 font-black uppercase ml-4">WhatsApp Phone</p><input name="wa" required placeholder="Owner Phone (e.g. 254...)" className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none" /></div>
        <div className="space-y-1"><p className="text-[10px] text-slate-400 font-black uppercase ml-4">Email Address</p><input name="email" type="email" required placeholder="shop@example.com" className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none" /></div>
        <div className="space-y-1"><p className="text-[10px] text-slate-400 font-black uppercase ml-4">Physical Address</p><input name="addr" required placeholder="Nairobi, CBD" className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none" /></div>
        <div className="space-y-1"><p className="text-[10px] text-slate-400 font-black uppercase ml-4">KRA PIN</p><input name="pin" required placeholder="PIN Number" className="w-full bg-slate-50 p-6 rounded-3xl font-bold border-none" /></div>
        <button className="w-full bg-indigo-600 text-white font-black py-7 rounded-3xl shadow-xl mt-10 flex items-center justify-center gap-4 text-2xl hover:scale-105 active:scale-95 transition-all">Start Shop <ArrowRight size={28}/></button>
      </form>
      <p className="mt-12 text-[10px] text-slate-300 font-bold uppercase tracking-widest">KRA Ready • Cloud Sync</p>
    </div>
  </div>
);

const Login = ({ pin, setPin, branchName, onSwitchBranch, branches, staff }: any) => {
  const [showBranches, setShowBranches] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative p-6">
       <div className="mb-12 text-center">
          <h1 className="text-8xl font-black tracking-tighter text-slate-100">VEIRA</h1>
          <div className="flex gap-4 justify-center mt-4">
            <button onClick={() => setShowBranches(!showBranches)} className="px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-slate-50 transition-all">
              <Building2 size={16} className="text-indigo-600"/> {branchName} <ChevronRight size={16} className={showBranches ? 'rotate-90 transition-transform' : 'transition-transform'}/>
            </button>
            {selectedStaff && (
              <button onClick={() => { setSelectedStaff(null); setPin(''); }} className="px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-slate-50 transition-all">
                <User size={16} className="text-indigo-600"/> {selectedStaff.name} (Change)
              </button>
            )}
          </div>
       </div>
       
       {showBranches ? (
         <div className="bg-white p-10 rounded-[64px] shadow-2xl w-full max-w-sm border border-slate-100 animate-in slide-in-from-bottom-10 duration-500">
            <h3 className="text-2xl font-black mb-6 tracking-tighter">Switch Shop</h3>
            <div className="space-y-4">
               {branches.map((b:any) => (
                 <button key={b.id} onClick={() => { onSwitchBranch(b.id); setShowBranches(false); }} className={`w-full p-6 rounded-3xl border-2 text-left font-black transition-all ${branchName === b.name ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-50 hover:border-slate-100'}`}>
                    {b.name}
                    <p className="text-[9px] text-slate-400 uppercase mt-1">{b.location}</p>
                 </button>
               ))}
            </div>
         </div>
       ) : !selectedStaff ? (
         <div className="bg-white p-10 rounded-[64px] shadow-2xl w-full max-w-md border border-slate-100 animate-in zoom-in-95 duration-500">
            <h3 className="text-2xl font-black mb-8 tracking-tighter text-center">Who are you?</h3>
            <div className="grid grid-cols-2 gap-4">
               {staff.filter((s:any) => s.branchId === branches.find((br:any) => br.name === branchName)?.id || s.role === 'owner').map((s:any) => (
                 <button key={s.id} onClick={() => setSelectedStaff(s)} className="p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-indigo-600 hover:bg-white transition-all flex flex-col items-center gap-3 group">
                    <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl group-hover:scale-110 transition-transform">{s.name.charAt(0)}</div>
                    <div className="text-center">
                      <p className="font-black text-sm">{s.name}</p>
                      <p className="text-[8px] text-slate-400 uppercase font-bold">{s.role}</p>
                    </div>
                 </button>
               ))}
            </div>
         </div>
       ) : (
         <div className="bg-white p-12 rounded-[64px] shadow-2xl w-full max-w-xs border border-slate-100 animate-in zoom-in-95 duration-500">
            <div className="text-center mb-8">
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Enter PIN for</p>
               <p className="text-xl font-black">{selectedStaff.name}</p>
            </div>
            <div className="flex justify-center gap-5 mb-14">
               {[0,1,2,3].map(i => <div key={i} className={`w-6 h-6 rounded-full border-4 border-slate-100 transition-all duration-300 ${pin.length > i ? 'bg-indigo-600 border-indigo-200 scale-125 shadow-lg shadow-indigo-100' : ''}`}></div>)}
            </div>
            <div className="grid grid-cols-3 gap-6">
               {[1,2,3,4,5,6,7,8,9,'C',0,<Delete size={20}/>].map((b, i) => (
                 <button key={i} onClick={() => {
                    if (b === 'C') setPin('');
                    else if (typeof b !== 'number') setPin((p:any) => p.slice(0, -1));
                    else if (pin.length < 4) setPin((p:any) => p + b);
                 }} className={`h-20 w-20 rounded-3xl flex items-center justify-center text-3xl font-black active:scale-90 transition-all ${typeof b === 'number' ? 'bg-slate-50 text-slate-800' : 'bg-red-50 text-red-500'}`}>{b}</button>
               ))}
            </div>
         </div>
       )}
       <p className="mt-16 text-[10px] text-slate-300 font-black uppercase tracking-widest">Safe Login</p>
    </div>
  );
};

const ProductCard = ({ product, onClick }: any) => (
  <button onClick={onClick} className={`bg-white rounded-[48px] border border-slate-100 shadow-xl shadow-slate-200/40 p-6 text-left hover:shadow-2xl hover:-translate-y-2 transition-all active:scale-95 flex flex-col relative overflow-hidden group ${product.stock <= 0 ? 'opacity-40 grayscale' : ''}`}>
    <div className="h-44 w-full rounded-[40px] overflow-hidden mb-6 bg-slate-50 relative">
      <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
      {product.stock <= product.minStock && product.stock > 0 && (
        <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase shadow-lg animate-pulse">Low</div>
      )}
    </div>
    <h3 className="font-black text-lg line-clamp-2 mb-3 leading-tight text-slate-800">{product.name}</h3>
    <div className="mt-auto flex justify-between items-end border-t border-slate-50 pt-4">
      <div>
        <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Price</p>
        <p className="font-black text-2xl tracking-tighter text-indigo-600">{formatKES(product.price)}</p>
      </div>
      <div className="text-right">
        <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Left</p>
        <p className={`font-black text-lg ${product.stock <= product.minStock ? 'text-red-500' : 'text-slate-900'}`}>{product.stock}</p>
      </div>
    </div>
  </button>
);

const CartSection = ({ cart, setCart, subtotal, discountValue, setDiscountValue, discountType, setDiscountType, paymentMethod, setPaymentMethod, onCheckout, customers, selectedCustomerId, setSelectedCustomerId }: any) => (
  <div className="bg-white rounded-[56px] shadow-2xl flex flex-col h-[calc(100vh-160px)] sticky top-10 border border-slate-100 overflow-hidden">
    <div className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0">
      <div>
        <h2 className="text-3xl font-black tracking-tighter">Basket</h2>
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Items to pay</p>
      </div>
      <button onClick={() => setCart([])} className="w-14 h-14 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center shadow-inner"><Trash2 size={24}/></button>
    </div>
    <div className="flex-1 overflow-y-auto p-10 space-y-4 no-scrollbar">
      {/* Customer Selector */}
      <div className="mb-6">
        <p className="text-[10px] text-slate-400 font-black uppercase mb-2 ml-2">Select Customer (Optional)</p>
        <select 
          value={selectedCustomerId || ''} 
          onChange={e => setSelectedCustomerId(e.target.value || null)}
          className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none text-sm appearance-none"
        >
          <option value="">Walk-in Customer</option>
          {customers.map((c:any) => (
            <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
          ))}
        </select>
      </div>

      {cart.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center opacity-10 text-center py-20">
          <ShoppingBag size={80} className="mb-6"/>
          <p className="font-black uppercase tracking-widest">Empty</p>
        </div>
      ) : cart.map((item:any) => (
        <div key={item.productId} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-[32px] border border-slate-100 hover:bg-white transition-all group">
           <div className="min-w-0 pr-4">
              <p className="font-black text-sm truncate text-slate-800">{item.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">{formatKES(item.price)}</span>
                <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">x{item.quantity}</span>
              </div>
           </div>
           <div className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{formatKES(item.total)}</div>
        </div>
      ))}
    </div>
    <div className="p-10 bg-slate-50 border-t border-slate-100 space-y-8 shrink-0 shadow-inner">
       <div className="space-y-3">
          <div className="flex justify-between font-bold text-xs text-slate-400 uppercase tracking-widest px-2"><span>Before Tax</span><span>{formatKES(subtotal)}</span></div>
          <div className="flex justify-between items-end font-black px-2">
            <span className="text-slate-400 text-sm uppercase">To Pay</span>
            <span className="text-5xl tracking-tighter text-slate-900">{formatKES(subtotal - discountValue)}</span>
          </div>
       </div>
       <div className="grid grid-cols-3 gap-3">
          {['Cash', 'M-Pesa', 'Card'].map(m => (
            <button key={m} onClick={() => setPaymentMethod(m as any)} className={`py-5 rounded-3xl border-2 font-black text-[11px] uppercase tracking-widest transition-all ${paymentMethod === m ? 'border-indigo-600 bg-white text-indigo-600 shadow-xl' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>{m}</button>
          ))}
       </div>
       <button disabled={cart.length === 0} onClick={onCheckout} className="w-full bg-slate-900 text-white font-black py-7 rounded-[32px] shadow-2xl flex items-center justify-center gap-4 text-2xl active:scale-95 transition-all disabled:opacity-20 hover:bg-indigo-600">
          <Printer size={32}/> Pay Now
       </button>
    </div>
  </div>
);

const StatCard = ({ label, value, icon, color, trend }: any) => (
  <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
    <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white mb-8 shadow-xl group-hover:scale-110 transition-transform`}>{icon}</div>
    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{label}</p>
    <p className="text-4xl font-black tracking-tighter text-slate-900 mb-2">{value}</p>
    <p className={`text-[10px] font-black uppercase ${trend.includes('+') || trend === 'doing well' || trend === 'good job' ? 'text-emerald-500' : 'text-slate-300'}`}>{trend}</p>
  </div>
);

const Assistant = ({ isOpen, onClose, chatInput, setChatInput, history, onSend, isTyping, isVoice, onVoiceToggle }: any) => (
  <div className={`fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-[600] transform transition-all duration-700 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
     <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
           <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-white transition-all shadow-xl ${isVoice ? 'bg-red-500 animate-pulse' : 'bg-slate-900'}`}><Bot size={32}/></div>
           <div><h3 className="font-black text-2xl tracking-tighter">Veira AI</h3><p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Shop Helper • Online</p></div>
        </div>
        <button onClick={onClose} className="p-4 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><X size={24}/></button>
     </div>
     <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar bg-white">
        {history.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
            <Sparkles size={80} className="mb-6"/>
            <p className="font-black uppercase tracking-[0.2em] max-w-[200px]">Ask about your shop</p>
          </div>
        )}
        {history.map((c:any, i:any) => (
          <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-6 rounded-[36px] text-sm leading-relaxed font-bold shadow-sm ${c.role === 'user' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 rounded-br-none' : 'bg-slate-50 text-slate-800 rounded-bl-none border border-slate-100'}`}>{c.text}</div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-50 p-6 rounded-[36px] rounded-bl-none border border-slate-100 flex gap-2">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
     </div>
     <div className="p-10 border-t border-slate-100 bg-slate-50/50">
        <div className="relative">
           <input 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && onSend()}
              placeholder="Ask a question..." 
              className="w-full bg-white border border-slate-200 p-8 rounded-[40px] font-bold shadow-2xl shadow-slate-200/50 pr-40 text-lg border-none focus:ring-4 ring-indigo-100 transition-all" 
           />
           <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-3">
              <button onClick={onSend} className="w-16 h-16 rounded-[24px] flex items-center justify-center bg-indigo-600 text-white shadow-xl active:scale-90 transition-all"><Send size={24}/></button>
              <button onClick={onVoiceToggle} className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-white active:scale-90 transition-all shadow-xl ${isVoice ? 'bg-red-500' : 'bg-slate-900'}`}>{isVoice ? <MicOff size={24}/> : <Mic size={24}/>}</button>
           </div>
        </div>
        <p className="mt-6 text-[9px] text-center font-black uppercase text-slate-300 tracking-[0.2em]">Veira is here to help</p>
     </div>
  </div>
);

export default App;
