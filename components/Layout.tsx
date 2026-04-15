// components/Layout.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Receipt, ShoppingCart, 
  Users, Landmark, FileBarChart, Settings, LogOut, 
  List, ImageIcon, Menu, X, ChevronRight, FileText
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Menu ပိတ်/ဖွင့် state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setTimeout(() => setIsLoading(false), 800);
    });
    return () => unsubscribe();
  }, []);

  const navGroups = [
    {
      group: "Operations",
      items: [
        { icon: <LayoutDashboard size={20}/>, label: 'Dashboard', href: '/' },
        { icon: <Receipt size={20}/>, label: 'Sales & Invoices', href: '/invoices' },
        { icon: <ShoppingCart size={20}/>, label: 'Purchases & Bills', href: '/transactions' },
        { icon: <Users size={20}/>, label: 'Contractors (1099)', href: '/payroll' },
        { icon: <Users size={20}/>, label: 'Employees (W-2)', href: '/payroll/employees' },
      ]
    },
    {
      group: "Finance & Tax",
      items: [
        { icon: <ImageIcon size={20}/>, label: 'Receipts Gallery', href: '/receipts' },
        { icon: <Landmark size={20}/>, label: 'Bank Accounts', href: '/banking' },
        { icon: <FileBarChart size={20}/>, label: 'Tax Reports (P&L)', href: '/report' },
        { icon: <FileText size={20}/>, label: 'Tax Filing Prep', href: '/tax-form' },
        { icon: <List size={20}/>, label: 'Chart of Accounts', href: '/accounts' },
      ]
    }
  ];

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
      <div className="w-16 h-16 bg-emerald-600 rounded-3xl animate-bounce shadow-2xl shadow-emerald-200"></div>
      <p className="mt-6 italic font-black text-emerald-600 uppercase tracking-widest text-xs">Simple Ledger Pro...</p>
    </div>
  );

  if (!user) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
       <h1 className="text-5xl font-black text-slate-900 mb-2 tracking-tighter">SimpleLedger</h1>
       <p className="text-slate-400 font-bold mb-10 text-sm uppercase tracking-widest italic">The Minimalist Accountant</p>
       <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-white border-2 border-slate-200 p-5 rounded-[2.5rem] font-black shadow-xl flex items-center gap-4 hover:bg-slate-50 transition active:scale-95 text-lg px-10">
         <img src="https://www.google.com/favicon.ico" className="w-6 h-6" /> CONTINUE WITH GOOGLE
       </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans overflow-x-hidden">
      
      {/* --- Sidebar - Desktop --- */}
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col p-8 fixed h-full z-20 overflow-y-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 flex items-center justify-center font-black text-white italic">SL</div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase underline decoration-emerald-500 decoration-4 underline-offset-4">SimpleLedger</h1>
        </div>

        <nav className="space-y-8">
          {navGroups.map((group) => (
            <div key={group.group}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4 italic">{group.group}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.label} href={item.href} className={`flex items-center gap-4 p-4 rounded-2xl font-black transition-all ${isActive ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                      {item.icon} <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
           <Link href="/settings" className={`flex items-center gap-4 p-4 rounded-2xl font-black mb-2 transition-all ${pathname === '/settings' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
              <Settings size={20}/> Settings
           </Link>
           <button onClick={() => signOut(auth)} className="flex items-center gap-4 p-4 w-full text-rose-500 font-black hover:bg-rose-50 rounded-2xl transition active:scale-95">
              <LogOut size={20}/> Logout
           </button>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 md:ml-72 p-6 md:p-12 mb-32 md:mb-0">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>

      {/* --- Mobile Bottom Nav (Overhauled for better visibility & more menus) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex justify-around p-4 pb-10 z-40 shadow-[0_-10px_50px_rgba(0,0,0,0.05)] rounded-t-[2.5rem]">
        
        {/* Dashboard */}
        <Link href="/" className={`flex flex-col items-center gap-1 transition-all ${pathname === '/' ? 'text-emerald-600 scale-110' : 'text-slate-400 font-bold'}`}>
           <LayoutDashboard size={24} />
           <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
        </Link>

        {/* Sales */}
        <Link href="/invoices" className={`flex flex-col items-center gap-1 transition-all ${pathname === '/invoices' ? 'text-emerald-600 scale-110' : 'text-slate-400 font-bold'}`}>
           <Receipt size={24} />
           <span className="text-[9px] font-black uppercase tracking-tighter">Sales</span>
        </Link>

        {/* Purchases */}
        <Link href="/transactions" className={`flex flex-col items-center gap-1 transition-all ${pathname === '/transactions' ? 'text-emerald-600 scale-110' : 'text-slate-400 font-bold'}`}>
           <ShoppingCart size={24} />
           <span className="text-[9px] font-black uppercase tracking-tighter">Purchases</span>
        </Link>

        {/* Report (အသုံးဝင်ဆုံးဖြစ်လို့ အောက်မှာ တန်းပြမယ်) */}
        <Link href="/report" className={`flex flex-col items-center gap-1 transition-all ${pathname === '/report' ? 'text-emerald-600 scale-110' : 'text-slate-400 font-bold'}`}>
           <FileBarChart size={24} />
           <span className="text-[9px] font-black uppercase tracking-tighter">Reports</span>
        </Link>

        {/* More/Menu (ကျန်တဲ့ Menu တွေကို ပေါ်လာစေဖို့) */}
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center gap-1 ${isMobileMenuOpen ? 'text-emerald-600' : 'text-slate-400 font-bold'}`}
        >
           <Menu size={24} />
           <span className="text-[9px] font-black uppercase tracking-tighter">More</span>
        </button>
      </nav>

      {/* --- Mobile Full Menu Overlay --- */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
           <div className="absolute right-0 top-0 bottom-0 w-[80%] bg-white shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300 rounded-l-[3rem]">
              <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-6">
                 <h2 className="text-2xl font-black text-slate-900 italic tracking-tighter">Full Menu</h2>
                 <button onClick={() => setIsMobileMenuOpen(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 active:bg-rose-50 active:text-rose-500 transition-colors">
                    <X size={24}/>
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 pr-2">
                 {navGroups.map(group => (
                    <div key={group.group}>
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 italic">{group.group}</p>
                       <div className="space-y-3">
                          {group.items.map(item => (
                             <Link key={item.label} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center justify-between p-4 rounded-2xl font-black transition-all ${pathname === item.href ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-600'}`}>
                                <div className="flex items-center gap-4">
                                   {item.icon} <span className="text-sm">{item.label}</span>
                                </div>
                                <ChevronRight size={14} className={pathname === item.href ? 'text-white' : 'text-slate-300'} />
                             </Link>
                          ))}
                       </div>
                    </div>
                 ))}
                 
                 <div className="pt-6 border-t border-slate-100 space-y-3">
                    <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-4 p-4 rounded-2xl font-black bg-slate-900 text-white`}>
                       <Settings size={20}/> Settings
                    </Link>
                    <button onClick={() => signOut(auth)} className="flex items-center gap-4 p-4 w-full text-rose-500 font-black bg-rose-50 rounded-2xl">
                       <LogOut size={20}/> Logout
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}