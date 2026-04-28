// components/Layout.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Receipt, ShoppingCart, 
  Users, Landmark, FileBarChart, Settings, LogOut, 
  List, ImageIcon, FileText, Menu, X, ChevronRight, 
  ExternalLink, UploadCloud, Sun, Moon, Plus // Sun, Moon, Plus, FileText ပါဝင်အောင် ပြင်လိုက်ပါပြီ
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, signInWithPopup, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Login Logic
  const login = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, provider);
      } else {
          alert("Login failed: " + error.message);
      }
    }
  };

  const logout = () => {
    setIsMobileMenuOpen(false);
    signOut(auth);
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { 
      setIsDark(true); 
      document.documentElement.classList.add('dark'); 
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setTimeout(() => setIsLoading(false), 800);
    });
    return () => unsubscribe();
  }, []);

  const toggleDark = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navGroups = [
    {
      group: "Business",
      items: [
        { icon: <LayoutDashboard size={20}/>, label: 'Dashboard', href: '/' },
        { icon: <Receipt size={20}/>, label: 'Sales/Invoices', href: '/invoices' },
        { icon: <ShoppingCart size={20}/>, label: 'Purchases/Bills', href: '/transactions' },
        { icon: <ImageIcon size={20}/>, label: 'Receipts Gallery', href: '/receipts' },
        { icon: <FileText size={20}/>, label: 'Bank Statements', href: '/banking/statements' },
        { icon: <UploadCloud size={20}/>, label: 'Excel/CSV Import', href: '/banking/import' },
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
        { icon: <List size={20}/>, label: 'Chart of Accounts', href: '/accounts' },
        { icon: <FileText size={20}/>, label: 'Tax Filing Prep', href: '/tax-form' },
      ]
    },
    {
      group: "Resources",
      items: [
        { icon: <ExternalLink size={20}/>, label: 'Quick Links', href: '/links' },
      ]
    }
  ];

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 transition-colors">
      <div className="w-16 h-16 bg-emerald-600 rounded-[2rem] animate-bounce shadow-2xl shadow-emerald-200"></div>
      <p className="mt-6 italic font-black text-emerald-600 uppercase tracking-widest text-xs">Simple Ledger Pro...</p>
    </div>
  );

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-slate-950 relative overflow-hidden transition-colors">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100 dark:bg-emerald-900/20 rounded-full blur-[120px] opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 dark:bg-blue-900/20 rounded-full blur-[120px] opacity-50"></div>
        <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6">
          <div className="mb-8 w-20 h-20 bg-emerald-600 rounded-[2.5rem] shadow-2xl flex items-center justify-center rotate-3"><FileBarChart size={40} className="text-white" /></div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Simple<span className="text-emerald-600 italic">Ledger</span></h1>
          <p className="text-slate-400 font-bold text-center mb-12 uppercase tracking-widest text-[10px]">The Most Minimal Accounting for US SME</p>
          <button onClick={login} className="w-full flex items-center justify-center gap-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 py-5 px-8 rounded-[2rem] shadow-xl hover:border-emerald-500 transition-all active:scale-95 group">
            <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="google" />
            <span className="font-black text-slate-800 dark:text-white text-lg tracking-tight">CONTINUE WITH GOOGLE</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col md:flex-row font-sans transition-colors">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col p-8 fixed h-full z-20 overflow-y-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center font-black text-white italic shadow-lg">SL</div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">SimpleLedger</h1>
        </div>

        <nav className="space-y-6">
          {navGroups.map((group) => (
            <div key={group.group}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-4 italic">{group.group}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.label} href={item.href} className={`flex items-center gap-4 py-2.5 px-4 rounded-xl font-bold transition-all ${isActive ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      {item.icon} <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <img src={user.photoURL} className="w-10 h-10 rounded-xl border-2 border-white dark:border-slate-700 shadow-sm" alt="p" />
              <div className="overflow-hidden">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user.displayName}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business Owner</p>
              </div>
          </div>
          
          <Link href="/settings" className={`flex items-center gap-4 p-4 rounded-2xl font-bold mb-2 transition-all ${pathname === '/settings' ? 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Settings size={20}/> Settings</Link>
          
          {/* Dark Mode Toggle Button */}
          <button onClick={toggleDark} className="flex items-center gap-4 p-4 w-full text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl mb-2 transition-all active:scale-95">
            {isDark ? (
              <span className="flex items-center gap-4"><Sun size={20} className="text-amber-400" /> Light Mode</span>
            ) : (
              <span className="flex items-center gap-4"><Moon size={20} /> Dark Mode</span>
            )}
          </button>

          <button onClick={logout} className="flex items-center gap-4 p-4 w-full text-rose-500 font-black hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all active:scale-95 group">
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-72 p-6 md:p-12 mb-32 md:mb-0 transition-colors">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>

      {/* --- Mobile Bottom Nav --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 flex justify-around p-4 pb-10 z-40 shadow-2xl rounded-t-[2.5rem]">
        <Link href="/" className={`flex flex-col items-center gap-1 ${pathname === '/' ? 'text-emerald-600 scale-110' : 'text-slate-500'}`}><LayoutDashboard size={24} /><span className="text-[9px] font-black uppercase tracking-tighter">Home</span></Link>
        <Link href="/invoices" className={`flex flex-col items-center gap-1 ${pathname === '/invoices' ? 'text-emerald-600 scale-110' : 'text-slate-500'}`}><Receipt size={24} /><span className="text-[9px] font-black uppercase tracking-tighter">Sales</span></Link>
        <Link href="/transactions" className={`flex flex-col items-center gap-1 ${pathname === '/transactions' ? 'text-emerald-600 scale-110' : 'text-slate-500'}`}><ShoppingCart size={24} /><span className="text-[9px] font-black uppercase tracking-tighter">Bills</span></Link>
        <Link href="/report" className={`flex flex-col items-center gap-1 ${pathname === '/report' ? 'text-emerald-600 scale-110' : 'text-slate-500'}`}><FileBarChart size={24} /><span className="text-[9px] font-black uppercase tracking-tighter">Tax</span></Link>
        <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center gap-1 text-slate-500"><Menu size={24} /><span className="text-[9px] font-black uppercase tracking-tighter">More</span></button>
      </nav>

      {/* --- Mobile More Menu Drawer --- */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="relative w-[85%] bg-white dark:bg-slate-900 h-full shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300 rounded-l-[3rem]">
                <div className="flex justify-between items-center mb-10 text-slate-900 dark:text-white">
                    <h2 className="text-2xl font-black italic">Full Menu</h2>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400"><X size={24}/></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-8 pr-2">
                    {navGroups.map(group => (
                        <div key={group.group}>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 italic px-2">{group.group}</p>
                            <div className="space-y-3">
                                {group.items.map(item => (
                                    <Link key={item.label} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center justify-between p-4 rounded-2xl font-black transition-all ${pathname === item.href ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                                        <div className="flex items-center gap-4">{item.icon} <span className="text-sm">{item.label}</span></div>
                                        <ChevronRight size={14} className="opacity-30" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        {/* Mobile Dark Mode Toggle */}
                        <button onClick={toggleDark} className="flex items-center gap-4 p-4 w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl">
                          {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
                          {isDark ? 'Light Mode' : 'Dark Mode'}
                        </button>
                        <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl font-black bg-slate-900 dark:bg-white dark:text-slate-900 text-white shadow-lg"><Settings size={20}/> Business Settings</Link>
                        <button onClick={logout} className="flex items-center gap-4 p-4 w-full text-rose-500 font-black bg-rose-50 dark:bg-rose-900/20 rounded-2xl">Logout</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}