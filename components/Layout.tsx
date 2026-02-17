
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
      {/* Desktop Menu */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col p-6 no-print">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">V</div>
          <span className="text-xl font-extrabold tracking-tight">Veira</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
                activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-slate-100 mt-auto">
          <div className="bg-slate-50 p-4 rounded-xl mb-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">User</p>
            <p className="font-bold text-slate-900 truncate">{staffName}</p>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bar */}
      <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 no-print">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">V</div>
          <span className="font-extrabold text-lg">Veira</span>
        </div>
        <button onClick={onLogout} className="p-2 text-slate-400">
          <LogOut size={20} />
        </button>
      </header>

      {/* Main View */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-32 lg:pb-0">
        <div className="max-w-6xl mx-auto p-4 md:p-10">
            {children}
        </div>
      </main>

      {/* Mobile Bottom Menu */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 dock-shadow px-2 py-3 pb-8 flex justify-around items-center z-[100] no-print">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
              activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeTab === item.id ? 'bg-indigo-50' : ''}`}>
                <item.icon size={22} />
            </div>
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
