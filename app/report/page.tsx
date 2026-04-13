// app/report/page.tsx (Updated)
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { TAX_CATEGORIES } from '@/lib/constants';
import { Calendar, FileBarChart } from 'lucide-react';

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

      {/* --- IRS Tax Filing Guide (Add this at the bottom of app/report/page.tsx) --- */}
    <div className="mt-20 border-t-4 border-slate-100 pt-12">
      <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
        <span className="bg-emerald-600 text-white p-2 rounded-lg"><FileBarChart size={20}/></span>
        IRS Schedule C Mapping Guide
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm">
          <p className="font-black text-emerald-600 text-xs mb-1 uppercase tracking-widest italic">Line 1: Gross Receipts</p>
          <h4 className="font-black text-slate-900 mb-2">Income / Sales</h4>
          <p className="text-slate-400 text-[11px] font-bold leading-relaxed">
            သင့်လုပ်ငန်းမှ ရရှိသော စုစုပေါင်းဝင်ငွေအားလုံးကို IRS Form 1040 Schedule C ၏ ပထမစာမျက်နှာ Line 1 တွင် ဖြည့်သွင်းရပါမည်။
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm">
          <p className="font-black text-rose-500 text-xs mb-1 uppercase tracking-widest italic">Line 11: Contract Labor</p>
          <h4 className="font-black text-slate-900 mb-2">Payroll (Contractors)</h4>
          <p className="text-slate-400 text-[11px] font-bold leading-relaxed">
            Payroll ထဲတွင် သင်ပေးချေခဲ့သော Contractor များ၏ စရိတ်များကို Line 11 တွင် ဖြည့်ရပါမည်။ တစ်ဦးကို $600 ကျော်လျှင် 1099-NEC ထုတ်ပေးရန် လိုအပ်ပါသည်။
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm">
          <p className="font-black text-rose-500 text-xs mb-1 uppercase tracking-widest italic">Line 9: Car & Truck Expenses</p>
          <h4 className="font-black text-slate-900 mb-2">Car & Truck</h4>
          <p className="text-slate-400 text-[11px] font-bold leading-relaxed">
            လုပ်ငန်းသုံးယာဉ်အတွက် Gas, Repair သို့မဟုတ် Standard Mileage Rate ကိုသုံးပြီး ဤနေရာတွင် ခုနှိမ်နိုင်ပါသည်။
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm">
          <p className="font-black text-rose-500 text-xs mb-1 uppercase tracking-widest italic">Line 24b: Deductible Meals</p>
          <h4 className="font-black text-slate-900 mb-2">Meals (Business Dinner)</h4>
          <p className="text-slate-400 text-[11px] font-bold leading-relaxed">
            Business အစည်းအဝေးအတွက် စားစရိတ်များကို ပုံမှန်အားဖြင့် ၅၀% သာ အခွန်ခုနှိမ်ခွင့် ရှိပါသည်။
          </p>
        </div>
      </div>
    </div>
    </Layout>
  );
}