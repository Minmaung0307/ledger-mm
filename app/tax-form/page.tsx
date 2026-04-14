// app/tax-form/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { TAX_CATEGORIES } from '@/lib/constants';
import { Printer, Download, Info, CheckCircle } from 'lucide-react';

export default function TaxFormWorksheet() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const start = new Date(selectedYear, 0, 1);
        const end = new Date(selectedYear, 11, 31, 23, 59, 59);
        const q = query(collection(db, "transactions"), where("uid", "==", user.uid), where("date", ">=", start), where("date", "<=", end));
        onSnapshot(q, (snap) => {
          setData(snap.docs.map(doc => doc.data()));
          setLoading(false);
        });
      }
    });
  }, [selectedYear]);

  const getSum = (cat: string) => data.filter(d => d.category === cat).reduce((s, i) => s + i.amount, 0);

  // IRS Line Mapping Logic
  const taxLines = [
    { line: "1", label: "Gross receipts or sales", value: getSum('income'), desc: "စုစုပေါင်း ရောင်းရငွေ" },
    { line: "8", label: "Advertising", value: getSum('advertising'), desc: "ကြော်ငြာနှင့် Marketing စရိတ်" },
    { line: "9", label: "Car and truck expenses", value: getSum('car_truck') + getSum('mileage'), desc: "ကားဆီဖိုးနှင့် မိုင်နှုန်းစရိတ်" },
    { line: "11", label: "Contract labor", value: getSum('contract_labor'), desc: "Contractor ပေးချေမှုများ (1099-NEC)" },
    { line: "15", label: "Insurance (other than health)", value: getSum('insurance'), desc: "လုပ်ငန်းအာမခံကြေး" },
    { line: "17", label: "Legal and professional services", value: getSum('legal_fees'), desc: "ရှေ့နေနှင့် စာရင်းကိုင်ခ" },
    { line: "18", label: "Office expense", value: getSum('office') + getSum('software'), desc: "ရုံးသုံးပစ္စည်းနှင့် Software စရိတ်" },
    { line: "20", label: "Rent or lease", value: getSum('rent'), desc: "ရုံးခန်း သို့မဟုတ် ပစ္စည်းငှားရမ်းခ" },
    { line: "24b", label: "Deductible meals", value: getSum('meals') * 0.5, desc: "လုပ်ငန်းသုံး စားသောက်စရိတ် (၅၀%)" },
    { line: "25", label: "Utilities", value: getSum('utilities'), desc: "ဖုန်း၊ အင်တာနက်နှင့် မီးဖိုး" },
    { line: "26", label: "Wages (less jobs credit)", value: getSum('w2_wages'), desc: "W-2 ဝန်ထမ်းလစာများ" },
    { line: "27a", label: "Other expenses", value: getSum('other') + getSum('payroll_taxes'), desc: "အခြားသော အထွေထွေစရိတ်များ" },
    { line: "30", label: "Expenses for business use of your home", value: getSum('home_office'), desc: "အိမ်ရုံးခန်း အချိုးကျစရိတ်" },
  ];

  const totalIncome = taxLines[0].value;
  const totalExpenses = taxLines.slice(1).reduce((s, i) => s + i.value, 0);

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse uppercase">Generating Tax Worksheet...</p></Layout>;

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-4xl mx-auto px-4">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 no-print">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">IRS Schedule C Worksheet</h2>
            <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest italic">Prepare for your {selectedYear} Tax Return</p>
          </div>
          <button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2 active:scale-95 transition-all">
            <Printer size={18}/> PRINT FOR TAX FILING
          </button>
        </div>

        {/* --- The Digital Tax Form --- */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border-4 border-slate-900 overflow-hidden print:border-2">
          {/* Form Header */}
          <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tighter italic">Schedule C (Form 1040)</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Year: {selectedYear} • Worksheet Only</p>
            </div>
            <div className="text-right">
                <div className="bg-emerald-500 text-white px-4 py-1 rounded-md font-black text-[10px] animate-pulse">READY TO FILE</div>
            </div>
          </div>

          <div className="p-0 divide-y divide-slate-100">
            {/* Net Profit Section (Top Summary) */}
            <div className="p-8 bg-emerald-50 flex justify-between items-center border-b-4 border-emerald-200">
                <h4 className="font-black text-emerald-900 uppercase text-xs tracking-widest">Line 31: Net Profit or (Loss)</h4>
                <p className="text-4xl font-black text-emerald-600">${(totalIncome - totalExpenses).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>

            {/* Line items loop */}
            {taxLines.map((line, idx) => (
              <div key={idx} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50 transition group">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-400 text-xs border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition">
                    {line.line}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{line.label}</p>
                    <p className="text-[11px] font-bold text-slate-400 italic mt-0.5">{line.desc}</p>
                  </div>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-3">
                    <div className="bg-slate-50 px-6 py-3 rounded-xl border-2 border-slate-100 font-black text-xl text-slate-900 min-w-[150px] text-right shadow-inner">
                        ${line.value.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="p-8 bg-slate-50 text-slate-400 text-[10px] font-bold text-center leading-relaxed">
            <p>DISCLAIMER: This document is a worksheet generated from your ledger data. It is intended to help you fill out IRS Form 1040 Schedule C. <br />Please review all figures and consult a certified tax professional before final submission.</p>
          </div>
        </div>

        {/* --- Extra Tip: Why Line numbers matter? --- */}
        <div className="mt-16 bg-blue-600 p-10 rounded-[3rem] text-white shadow-2xl no-print relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <Info size={24} />
                    <h4 className="text-xl font-black uppercase">How to use this worksheet?</h4>
                </div>
                <p className="font-bold text-blue-100 leading-relaxed">
                    နှစ်ကုန်တဲ့အခါ အစိုးရ website (IRS Free File) ကိုသွားပါ။ Schedule C ဖောင်ကို ဖြည့်တဲ့အခါ ဘယ်ဘက်က **Line Number** တွေကို ကြည့်ပြီး ဒီ Worksheet ထဲက ကိန်းဂဏန်းတွေကို အကွက်ချင်းစီအတိုင်း အတိအကျ ကူးထည့်လိုက်ရုံပါပဲ။ ဥပမာ - Software ဖိုးတွေအတွက် Line 18 အကွက်မှာ ဒီကပြထားတဲ့ ပမာဏကို ထည့်ပါ။
                </p>
            </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          aside, nav, .no-print { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          .bg-white { border: none !important; box-shadow: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </Layout>
  );
}