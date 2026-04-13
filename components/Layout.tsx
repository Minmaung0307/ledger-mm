// components/Layout.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Receipt, ShoppingCart, 
  Users, Landmark, FileBarChart, Settings, LogOut, 
  List
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

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

  if (!user) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
       <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">SimpleLedger</h1>
       <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-white border-2 border-slate-200 p-5 rounded-[2rem] font-black shadow-xl flex items-center gap-3">
         <img src="https://www.google.com/favicon.ico" className="w-5 h-5" /> CONTINUE WITH GOOGLE
       </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col p-8 fixed h-full z-20">
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
           <Link href="/settings" className={`flex items-center gap-4 p-4 rounded-2xl font-bold mb-2 ${pathname === '/settings' ? 'text-emerald-600' : 'text-slate-400'}`}>
              <Settings size={20}/> Settings
           </Link>
           <button onClick={() => signOut(auth)} className="flex items-center gap-4 p-4 w-full text-rose-500 font-bold hover:bg-rose-50 rounded-2xl transition">
              <LogOut size={20}/> Logout
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