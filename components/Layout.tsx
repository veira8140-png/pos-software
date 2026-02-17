
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
    { id: 'sales', icon: ShoppingBag, label: 'Sales', color: 'from-blue-500 to-indigo-600' },
    { id: 'products', icon: Package, label: 'Products', color: 'from-orange-400 to-red-500' },
    { id: 'staff', icon: Users, label: 'Staff', color: 'from-purple-500 to-pink-600' },
    { id: 'receipts', icon: Receipt, label: 'Receipts', color: 'from-emerald-400 to-teal-600' },
    { id: 'reports', icon: BarChart3, label: 'Reports', color: 'from-blue-400 to-cyan-600' },
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FC] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col no-print z-50">
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center text-white font-bold text-xl">V</div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Veira</h1>
          </div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em]">Retail Intelligence</p>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
                activeTab === item.id 
                ? 'bg-slate-50 text-indigo-600 shadow-inner' 
                : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-700'
              }`}
            >
              <div className={`p-2 rounded-xl bg-gradient-to-br ${item.color} text-white shadow-md ${activeTab === item.id ? 'scale-110' : 'opacity-80'}`}>
                <item.icon size={18} strokeWidth={2.5} />
              </div>
              <span className={`font-bold text-sm ${activeTab === item.id ? 'text-slate-900' : ''}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-50">
          <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Active Staff</p>
            <p className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              {staffName}
            </p>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-3 px-4 py-4 rounded-2xl text-red-500 hover:bg-red-50 font-bold transition-colors text-sm"
          >
            <LogOut size={18} />
            <span>Lock Terminal</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative">
        <div className="max-w-7xl mx-auto p-10">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
