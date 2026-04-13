// app/report/page.tsx (Updated)
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { TAX_CATEGORIES } from '@/lib/constants';
import { Calendar } from 'lucide-react';

export default function ProfitLossReport() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "transactions"), where("uid", "==", user.uid));
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          setData(snapshot.docs.map(doc => doc.data()));
          setLoading(false);
        });
        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const calculateTotal = (catType: string) => {
    return data
      .filter(item => {
        const cat = TAX_CATEGORIES.find(c => c.value === item.category);
        return cat?.type === catType;
      })
      .reduce((sum, item) => sum + item.amount, 0);
  };

  const income = calculateTotal('income');
  const expenses = calculateTotal('expense');

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse">GENERATING P&L STATEMENT...</p></Layout>;

  return (
    <Layout>
      <div className="pt-6 pb-20 max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-12">
            <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Profit & Loss</h2>
                <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest">Year to Date (YTD) Summary</p>
            </div>
            <div className="bg-slate-100 p-3 rounded-xl flex items-center gap-2 text-slate-600 font-bold text-xs">
                <Calendar size={16}/> {new Date().getFullYear()} TAX YEAR
            </div>
        </div>

        {/* P&L Table Style */}
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-10 border-b-8 border-emerald-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Operating Income</p>
                <h3 className="text-5xl font-black text-slate-900">${income.toLocaleString()}</h3>
            </div>

            <div className="p-10 space-y-8 bg-slate-50/30">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operating Expenses (Deductions)</h4>
                <div className="space-y-4">
                    {TAX_CATEGORIES.filter(c => c.type === 'expense').map(cat => {
                        const total = data.filter(d => d.category === cat.value).reduce((s, i) => s + i.amount, 0);
                        return (
                            <div key={cat.value} className="flex justify-between items-center group">
                                <p className="font-bold text-slate-500 group-hover:text-slate-900 transition">{cat.label}</p>
                                <div className="flex-1 border-b-2 border-dotted border-slate-200 mx-4 mb-1"></div>
                                <p className="font-black text-slate-900">${total.toLocaleString()}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                <div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Net Ordinary Income</p>
                    <h3 className="text-4xl font-black italic">Net Profit:</h3>
                </div>
                <h3 className="text-5xl font-black text-emerald-400 tracking-tighter">
                    ${(income - expenses).toLocaleString()}
                </h3>
            </div>
        </div>
      </div>
    </Layout>
  );
}