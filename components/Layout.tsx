// components/Layout.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { Home, PlusCircle, List, PieChart, LogOut, LogIn } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  const navItems = [
    { icon: <Home size={20}/>, label: 'Dashboard', href: '/' },
    { icon: <List size={20}/>, label: 'Trans', href: '/transactions' },
    { icon: <PlusCircle size={20} className="text-emerald-500"/>, label: 'Add', href: '/add' },
    { icon: <PieChart size={20}/>, label: 'Tax Report', href: '/report' },
  ];

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <h1 className="text-4xl font-black text-emerald-600 mb-4 text-center">SimpleLedger US</h1>
        <p className="text-slate-500 mb-8 font-bold text-center">Log in to manage your business taxes securely.</p>
        <button onClick={login} className="flex items-center gap-3 bg-white border-2 border-slate-200 p-4 rounded-2xl font-black text-slate-800 hover:bg-slate-100 shadow-xl transition active:scale-95">
           <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="google" />
           SIGN IN WITH GOOGLE
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r-2 border-slate-100 flex-col p-6 fixed h-full shadow-sm">
        <h1 className="text-2xl font-black text-emerald-600 mb-10">SimpleLedger</h1>
        <nav className="space-y-3 flex-1">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="flex items-center gap-4 p-4 hover:bg-emerald-50 rounded-2xl text-slate-600 hover:text-emerald-600 font-bold transition">
              {item.icon} <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className="mt-auto border-t-2 border-slate-100 pt-6 pb-24"> {/* pb-24 ကို တိုးလိုက်ပါ၊ ဒါမှ Next.js tool နဲ့ လွတ်မှာပါ */}
            <div className="flex items-center gap-3 px-2 mb-6">
                {user.photoURL ? (
                <img src={user.photoURL} className="w-10 h-10 rounded-full border-2 border-emerald-500" alt="profile" />
                ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                    {user.displayName?.charAt(0) || 'U'}
                </div>
                )}
                <div className="overflow-hidden">
                <p className="text-sm font-black text-slate-900 truncate">{user.displayName}</p>
                <p className="text-[10px] font-bold text-slate-400 truncate">{user.email}</p>
                </div>
            </div>

            <button 
                onClick={logout} 
                className="flex items-center gap-4 p-4 w-full text-rose-500 font-black hover:bg-rose-50 rounded-2xl transition shadow-sm hover:shadow-md active:scale-95"
            >
                <LogOut size={20}/> Logout
            </button>
            </div>
      </aside>

      <main className="flex-1 md:ml-64 p-6 mb-20 md:mb-0">
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-100 flex justify-around p-4 pb-8 shadow-2xl">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href} className="flex flex-col items-center gap-1 text-slate-400 font-black active:text-emerald-600">
            {item.icon} <span className="text-[10px] uppercase tracking-tighter">{item.label}</span>
          </Link>
        ))}
        <button onClick={logout} className="text-rose-400"><LogOut size={20}/></button>
      </nav>
    </div>
  );
}