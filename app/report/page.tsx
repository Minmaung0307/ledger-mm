// app/report/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { TAX_CATEGORIES } from '@/lib/constants';

export default function TaxReport() {
  const [reportData, setReportData] = useState<any>({});
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, "transactions"), where("uid", "==", user.uid));
        
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          const totals: any = {};
          let inc = 0;
          let exp = 0;

          snapshot.docs.forEach(doc => {
            const data = doc.data();
            const cat = data.category;
            const amt = data.amount;

            if (cat === 'income') {
              inc += amt;
            } else {
              exp += amt;
              totals[cat] = (totals[cat] || 0) + amt;
            }
          });

          setReportData(totals);
          setTotalIncome(inc);
          setTotalExpense(exp);
          setLoading(false);
        });

        return () => unsubscribeData();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse">PREPARING TAX REPORT...</p></Layout>;

  return (
    <Layout>
      <div className="pt-6 pb-20">
        <h2 className="text-4xl font-black text-slate-900 mb-2">Tax Summary</h2>
        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-10">US Internal Revenue Service (IRS) Format</p>

        {/* Profit Card */}
        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-10 -mt-10 blur-3xl"></div>
          <p className="text-slate-400 font-bold uppercase text-xs mb-3 tracking-widest">Calculated Net Profit</p>
          <h1 className="text-6xl font-black text-emerald-400">${(totalIncome - totalExpense).toLocaleString()}</h1>
          
          <div className="mt-10 flex flex-wrap gap-8 border-t border-slate-800 pt-8">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Gross Sales</p>
              <p className="text-2xl font-bold text-white">${totalIncome.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Total Deductions</p>
              <p className="text-2xl font-bold text-rose-400">${totalExpense.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-black text-slate-900 mb-6 px-4 uppercase tracking-tight">IRS Schedule C Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TAX_CATEGORIES.filter(c => c.type === 'expense').map(cat => (
            <div key={cat.value} className="bg-white p-6 rounded-3xl border-2 border-slate-50 flex justify-between items-center shadow-sm hover:shadow-md transition group">
              <div>
                <p className="text-slate-900 font-black text-lg group-hover:text-emerald-600 transition">{cat.label}</p>
                <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Business Deduction</p>
              </div>
              <p className="text-2xl font-black text-slate-900">
                ${(reportData[cat.value] || 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}