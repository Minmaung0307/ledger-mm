// components/Layout.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { Home, PlusCircle, List, PieChart, LogOut, Settings, FileText } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    // Firebase Auth State ကို စစ်မယ်
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // User data ရပြီဆိုတာနဲ့ Splash screen ကို ပိတ်ဖို့ timer ပေးမယ်
      const timer = setTimeout(() => {
        setIsInitialLoading(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    });

    return () => unsubscribe();
  }, []);

  // Login/Logout Functions
  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  // Menu List
  const navItems = [
    { icon: <Home size={22}/>, label: 'Dashboard', href: '/' },
    { icon: <List size={22}/>, label: 'Records', href: '/transactions' },
    { icon: <FileText size={22}/>, label: 'Invoices', href: '/invoices' },
    { icon: <PieChart size={22}/>, label: 'Tax Report', href: '/report' },
    { icon: <Settings size={22}/>, label: 'Settings', href: '/settings' },
  ];

  // ၁။ Splash Screen (App စဖွင့်ချင်း ပြမည့် Animation)
  if (isInitialLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
        <div className="w-16 h-16 bg-emerald-600 rounded-[1.5rem] animate-bounce shadow-2xl shadow-emerald-200 flex items-center justify-center">
            <div className="w-6 h-6 bg-white rounded-full opacity-20 animate-pulse"></div>
        </div>
        <h2 className="mt-8 text-2xl font-black text-slate-900 tracking-tighter uppercase animate-pulse">
            SimpleLedger <span className="text-emerald-600">US</span>
        </h2>
      </div>
    );
  }

  // ၂။ Login Page (User မရှိလျှင် ပြမည့် Page)
  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="mb-10 relative">
            <div className="w-24 h-24 bg-emerald-600 rounded-[2.5rem] rotate-12 shadow-2xl flex items-center justify-center">
                <FileText size={40} className="text-white -rotate-12" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                <PieChart size={20} className="text-emerald-400" />
            </div>
        </div>
        <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">SimpleLedger</h1>
        <p className="text-slate-500 mb-10 font-bold max-w-xs text-lg leading-tight">
            The minimal accounting app for US small businesses.
        </p>
        <button onClick={login} className="flex items-center gap-4 bg-white border-2 border-slate-200 py-5 px-10 rounded-[2rem] font-black text-slate-800 hover:bg-slate-100 shadow-2xl transition-all active:scale-95 text-lg">
           <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="google" />
           CONTINUE WITH GOOGLE
        </button>
      </div>
    );
  }

  // ၃။ Main App Layout (Login ဝင်ပြီးမှ ပေါ်မည့် Layout)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 bg-white border-r-2 border-slate-100 flex-col p-8 fixed h-full shadow-sm">
        <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-100 flex items-center justify-center">
                <div className="w-4 h-4 bg-white/20 rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter">SimpleLedger</h1>
        </div>
        
        <nav className="space-y-3 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.label} href={item.href} 
                className={`flex items-center gap-4 p-4 rounded-2xl font-black transition-all ${
                  isActive ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100 scale-105' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                }`}>
                {item.icon} <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="mt-auto border-t-2 border-slate-50 pt-8 pb-4">
            <div className="flex items-center gap-4 px-2 mb-8 bg-slate-50 p-4 rounded-3xl">
                <img src={user.photoURL} className="w-12 h-12 rounded-2xl border-2 border-white shadow-md" alt="profile" />
                <div className="overflow-hidden">
                    <p className="text-sm font-black text-slate-900 truncate">{user.displayName}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">{user.email?.split('@')[0]}</p>
                </div>
            </div>
            <button onClick={logout} className="flex items-center gap-4 p-4 w-full text-rose-500 font-black hover:bg-rose-50 rounded-2xl transition-all active:scale-95 group">
                <LogOut size={22} className="group-hover:-translate-x-1 transition" /> Logout Session
            </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-72 p-6 mb-24 md:mb-0">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t-2 border-slate-50 flex justify-around p-5 pb-10 shadow-2xl z-50 rounded-t-[2.5rem]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.label} href={item.href} 
              className={`flex flex-col items-center gap-2 font-black transition-all ${isActive ? 'text-emerald-600 scale-110' : 'text-slate-300'}`}>
              {item.icon} <span className="text-[9px] uppercase tracking-tighter font-black">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}