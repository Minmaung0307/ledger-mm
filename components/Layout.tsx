// components/Layout.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Receipt, ShoppingCart, 
  Users, Landmark, FileBarChart, Settings, LogOut, 
  List,
  ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setTimeout(() => setIsLoading(false), 800);
    });
    return () => unsubscribe();
  }, []);

  const navGroups = [
    {
      group: "Business",
      items: [
        { icon: <LayoutDashboard size={20}/>, label: 'Dashboard', href: '/' },
        { icon: <Receipt size={20}/>, label: 'Sales/Invoices', href: '/invoices' },
        { icon: <ShoppingCart size={20}/>, label: 'Purchases/Bills', href: '/transactions' },
        { icon: <ImageIcon size={20}/>, label: 'Receipts Gallery', href: '/receipts' },
      ]
    },
    {
      group: "Payroll",
      items: [
        { icon: <Users size={20}/>, label: 'Contractors (1099)', href: '/payroll' },
        { icon: <Users size={20}/>, label: 'Employees (W-2)', href: '/payroll/employees' },
      ]
    },
    {
      group: "Accounting",
      items: [
        { icon: <Landmark size={20}/>, label: 'Bank Accounts', href: '/banking' },
        { icon: <FileBarChart size={20}/>, label: 'Tax Reports (P&L)', href: '/report' },
        { icon: <List size={20}/>, label: 'Chart of Accounts', href: '/accounts' }, // Wave ရဲ့ Screenshot ထဲကဟာ
      ]
    }
  ];

  if (isLoading) return (
    <div className="h-screen w-full flex items-center justify-center bg-white italic font-black text-emerald-600 animate-pulse">
      SIMPLE LEDGER PRO...
    </div>
  );

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] relative overflow-hidden">
        {/* အနောက်က Background အလှဆင်ခြင်း (Subtle Glow) */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100 rounded-full blur-[120px] opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-50"></div>

        <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6">
          {/* Logo Icon */}
          <div className="mb-8 w-20 h-20 bg-emerald-600 rounded-[2.5rem] shadow-2xl shadow-emerald-200 flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-500 group">
              <FileBarChart size={40} className="text-white group-hover:scale-110 transition-transform" />
          </div>

          {/* Brand Name */}
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">
              Simple<span className="text-emerald-600 italic">Ledger</span>
          </h1>
          <p className="text-slate-400 font-bold text-center mb-12 leading-tight uppercase tracking-widest text-[10px]">
              The Most Minimal Accounting for US SME
          </p>

          {/* --- တောက်တောက်ပြောင်ပြောင် Login Button --- */}
          <button 
              onClick={login} 
              className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-100 py-5 px-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(16,185,129,0.15)] hover:border-emerald-500 transition-all duration-300 active:scale-95 group"
          >
            <img src="https://www.google.com/favicon.ico" className="w-6 h-6 object-contain" alt="google" />
            <span className="font-black text-slate-800 text-lg tracking-tight group-hover:text-emerald-600 transition-colors">
                CONTINUE WITH GOOGLE
            </span>
          </button>

          {/* Footer Text */}
          <p className="mt-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
              Secure • Cloud • IRS Ready
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col p-8 fixed h-full z-20 overflow-y-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 flex items-center justify-center font-black text-white italic">SL</div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">SimpleLedger</h1>
        </div>

        <nav className="space-y-8">
          {navGroups.map((group) => (
            <div key={group.group}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">{group.group}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.label} href={item.href} className={`flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${isActive ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100' : 'text-slate-500 hover:bg-slate-50'}`}>
                      {item.icon} <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          {/* User Info Section */}
          <div className="flex items-center gap-3 px-2 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              {user.photoURL ? (
                  <img src={user.photoURL} className="w-10 h-10 rounded-xl border-2 border-white shadow-sm" alt="profile" />
              ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                      {user.displayName?.charAt(0) || 'U'}
                  </div>
              )}
              <div className="overflow-hidden">
                  <p className="text-sm font-black text-slate-900 truncate">{user.displayName}</p>
                  <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">Premium User</p>
              </div>
          </div>

          <Link href="/settings" className={`flex items-center gap-4 p-4 rounded-2xl font-bold mb-2 transition-all ${pathname === '/settings' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
              <Settings size={20}/> Settings
          </Link>

          {/* ဒီနေရာမှာ onClick={logout} ကို ပြောင်းသုံးလိုက်ရင် အရောင်မမှိန်တော့ပါဘူး */}
          <button 
              onClick={logout} 
              className="flex items-center gap-4 p-4 w-full text-rose-500 font-black hover:bg-rose-50 rounded-2xl transition-all active:scale-95 group"
          >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" /> Logout Session
          </button>
      </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 p-6 md:p-12 mb-24 md:mb-0">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around p-4 pb-8 z-30 shadow-2xl">
        {navGroups[0].items.concat(navGroups[1].items.slice(1,2)).map((item) => (
           <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-1 ${pathname === item.href ? 'text-emerald-600' : 'text-slate-300'}`}>
              {item.icon} <span className="text-[9px] font-black uppercase tracking-tighter">{item.label.split(' ')[0]}</span>
           </Link>
        ))}
      </nav>
    </div>
  );
}