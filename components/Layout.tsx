
import React from 'react';
import { 
  ShoppingBag, 
  Package, 
  Users, 
  Receipt, 
  LogOut, 
  BarChart3
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  staffName: string;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, staffName, onLogout }) => {
  const navItems = [
    { id: 'sales', icon: ShoppingBag, label: 'Sell' },
    { id: 'products', icon: Package, label: 'Items' },
    { id: 'staff', icon: Users, label: 'Team' },
    { id: 'receipts', icon: Receipt, label: 'History' },
    { id: 'reports', icon: BarChart3, label: 'Stats' },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 xl:w-72 bg-white border-r border-slate-200 flex-col p-6 xl:p-8 no-print shrink-0">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-100">V</div>
          <span className="text-2xl font-black tracking-tighter">Veira</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${
                activeTab === item.id 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-slate-100 mt-auto">
          <div className="bg-slate-50 p-5 rounded-2xl mb-4 border border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Signed in as</p>
            <p className="font-bold text-slate-900 truncate text-sm">{staffName}</p>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-colors">
            <LogOut size={16} />
            <span className="text-[10px] uppercase tracking-widest">Logout Session</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 no-print sticky top-0 z-[110] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-indigo-100">V</div>
          <span className="font-black text-lg tracking-tighter">Veira</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg max-w-[80px] truncate">{staffName.split(' ')[0]}</span>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Scroll Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative min-w-0">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 pb-36 lg:pb-10">
            {children}
        </div>
      </main>

      {/* Mobile Bottom Dock - Optimized for all iPhone/Android widths */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-[32px] px-2 py-2.5 flex justify-around items-center z-[120] no-print shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-2 px-1 transition-all rounded-2xl min-w-[56px] ${
              activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 active:bg-slate-50'
            }`}
          >
            <item.icon size={20} strokeWidth={activeTab === item.id ? 3 : 2} />
            <span className={`text-[8px] font-black uppercase mt-1 tracking-tight transition-all ${activeTab === item.id ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
