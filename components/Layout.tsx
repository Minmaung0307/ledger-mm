// components/Layout.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { Home, PlusCircle, List, PieChart, LogOut, Settings, FileText } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // လက်ရှိရောက်နေတဲ့ page သိအောင်
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  // Menu List (Settings နဲ့ Invoices ပါအောင် ထပ်တိုးထားပါတယ်)
  const navItems = [
    { icon: <Home size={22}/>, label: 'Dashboard', href: '/' },
    { icon: <List size={22}/>, label: 'Records', href: '/transactions' },
    { icon: <FileText size={22}/>, label: 'Invoices', href: '/invoices' },
    { icon: <PieChart size={22}/>, label: 'Tax Report', href: '/report' },
    { icon: <Settings size={22}/>, label: 'Settings', href: '/settings' },
  ];

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h1 className="text-4xl font-black text-emerald-600 mb-4 tracking-tighter">SimpleLedger US</h1>
        <p className="text-slate-500 mb-8 font-bold max-w-xs">Secure cloud accounting for your personal business.</p>
        <button onClick={login} className="flex items-center gap-3 bg-white border-2 border-slate-200 p-5 rounded-3xl font-black text-slate-800 hover:bg-slate-100 shadow-2xl transition active:scale-95">
           <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="google" />
           SIGN IN WITH GOOGLE
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 bg-white border-r-2 border-slate-100 flex-col p-8 fixed h-full shadow-sm">
        <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg"></div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter">SimpleLedger</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.label} href={item.href} 
                className={`flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${
                  isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                }`}>
                {item.icon} <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="mt-auto border-t-2 border-slate-50 pt-8 pb-4">
            <div className="flex items-center gap-3 px-2 mb-6">
                <img src={user.photoURL} className="w-10 h-10 rounded-full border-2 border-emerald-500" alt="profile" />
                <div className="overflow-hidden">
                    <p className="text-sm font-black text-slate-900 truncate">{user.displayName}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate">{user.email}</p>
                </div>
            </div>
            <button onClick={logout} className="flex items-center gap-4 p-4 w-full text-rose-500 font-black hover:bg-rose-50 rounded-2xl transition">
                <LogOut size={20}/> Logout
            </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-72 p-6 mb-24 md:mb-0">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-50 flex justify-around p-4 pb-10 shadow-2xl z-50">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.label} href={item.href} 
              className={`flex flex-col items-center gap-1 font-black ${isActive ? 'text-emerald-600' : 'text-slate-300'}`}>
              {item.icon} <span className="text-[8px] uppercase tracking-tighter">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}