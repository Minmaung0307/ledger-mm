// app/banking/page.tsx
"use client";
import Layout from '@/components/Layout';
import { Landmark, ArrowUpRight, ArrowDownLeft, UploadCloud } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';

export default function Banking() {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "transactions"), where("uid", "==", user.uid));
        onSnapshot(q, (snapshot) => {
          let total = 0;
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.category === 'income') total += data.amount;
            else total -= data.amount;
          });
          setBalance(total);
        });
      }
    });
  }, []);

  return (
    <Layout>
      <div className="pt-4 pb-20">
        <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tighter">Bank Accounts</h2>
        
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-2 border-slate-50 mb-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <Landmark size={24} />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 tracking-tight">Business Ledger Balance</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculated from Transactions</p>
            </div>
          </div>
          
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter mb-10">${balance.toLocaleString()}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/invoices" className="bg-emerald-50 p-6 rounded-2xl flex items-center justify-between group hover:bg-emerald-600 transition-all">
              <div className="flex items-center gap-3">
                <ArrowUpRight className="text-emerald-500 group-hover:text-white" />
                <p className="text-xs font-black text-emerald-700 uppercase group-hover:text-white">View Sales (Income)</p>
              </div>
            </Link>
            <Link href="/transactions" className="bg-rose-50 p-6 rounded-2xl flex items-center justify-between group hover:bg-rose-600 transition-all">
              <div className="flex items-center gap-3">
                <ArrowDownLeft className="text-rose-500 group-hover:text-white" />
                <p className="text-xs font-black text-rose-700 uppercase group-hover:text-white">View Expenses (Purchases)</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
                <p className="font-black text-lg">Automated Bank Sync</p>
                <p className="text-slate-400 text-sm font-bold">Connect your real US Bank account via Plaid API.</p>
            </div>
            <button 
                onClick={() => alert("Plaid Integration requires a Business License & API Key. For now, please use Manual Records.")}
                className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-lg hover:bg-emerald-600 transition uppercase tracking-widest"
            >
                Connect Bank
            </button>
        </div>
      </div>
    </Layout>
  );
}