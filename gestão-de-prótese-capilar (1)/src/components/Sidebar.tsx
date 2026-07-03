import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Users, 
  DollarSign, 
  Settings, 
  Scissors,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  clinicName: string;
  isOpen: boolean; // mobile open/close state
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  clinicName,
  isOpen,
  setIsOpen
}: SidebarProps) {
  
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'agenda', name: 'Agenda', icon: CalendarIcon },
    { id: 'clientes', name: 'Clientes', icon: Users },
    { id: 'servicos', name: 'Serviços', icon: Scissors },
    { id: 'financeiro', name: 'Financeiro', icon: DollarSign },
    { id: 'configuracoes', name: 'Configurações', icon: Settings },
  ];

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    setIsOpen(false); // Close on mobile when clicked
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 border-r border-slate-800">
      {/* Brand logo */}
      <div className="p-6 border-b border-slate-850 flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg text-white">
          <Scissors className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight text-white tracking-tight">
            {clinicName || 'CK Próteses Capilares'}
          </h1>
          <span className="text-[10px] text-blue-400 font-mono tracking-wider uppercase font-semibold">
            Prótese Capilar
          </span>
        </div>
      </div>

      {/* Nav Menu Items */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentTab === item.id;
          
          return (
            <button
              key={item.id}
              id={`sidebar-tab-${item.id}`}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 font-semibold' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <IconComponent className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              <span>{item.name}</span>
              {isActive && (
                <motion.div 
                  layoutId="activeIndicator" 
                  className="ml-auto w-1 h-4 bg-white/80 rounded-full" 
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* App Footer Info */}
      <div className="p-5 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-500 font-mono">
          © {new Date().getFullYear()} - CRM Prótese Capilar
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Always visible on md screens) */}
      <aside className="hidden md:block w-64 h-screen sticky top-0 shrink-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-slate-900 text-white border-b border-slate-850 z-30 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-xs text-white leading-tight">
              {clinicName || 'CK Próteses Capilares'}
            </h1>
            <span className="text-[8px] text-blue-400 font-mono tracking-wider uppercase block font-semibold">Prótese Capilar</span>
          </div>
        </div>
        <button 
          id="mobile-menu-toggle"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Sidebar Overlay (Slide-out drawer) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="md:hidden fixed inset-0 bg-black z-40"
            />
            
            {/* Sidebar content drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed top-0 bottom-0 left-0 w-64 bg-slate-900 z-50 shadow-2xl"
            >
              {sidebarContent}
              <button 
                id="mobile-close-sidebar"
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-1 bg-slate-800 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
