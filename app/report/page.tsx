"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { TAX_CATEGORIES } from '@/lib/constants';
import { Calendar, FileBarChart, Printer, Download, ChevronDown, Info, PieChart, AlertCircle, X } from 'lucide-react';

export default function ProfitLossReport() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTip, setActiveTip] = useState<any>(null);

  const years = Array.from({ length: (new Date().getFullYear() - 2024 + 2) }, (_, i) => 2024 + i);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const s = new Date(selectedYear, 0, 1); const e = new Date(selectedYear, 11, 31, 23, 59, 59);
        const q = query(collection(db, "transactions"), where("uid", "==", user.uid), where("date", ">=", s), where("date", "<=", e), orderBy("date", "desc"));
        onSnapshot(q, (snapshot) => { setData(snapshot.docs.map(doc => doc.data())); setLoading(false); });
      }
    });
  }, [selectedYear]);

  const calculateTotal = (val: string) => data.filter(d => d.category === val).reduce((s, i) => s + i.amount, 0);
  const income = data.filter(item => TAX_CATEGORIES.find(c => c.value === item.category)?.type === 'income').reduce((s, i) => s + i.amount, 0);
  const expenses = data.filter(item => { const cat = TAX_CATEGORIES.find(c => c.value === item.category); return cat?.type === 'expense' && item.category !== 'estimated_tax_paid'; }).reduce((s, i) => s + i.amount, 0);

  const mappingCards = [
    { line: "Line 1", title: "Gross Receipts", color: "#10b981", text: "စုစုပေါင်းဝင်ငွေအားလုံးကို Line 1 တွင် ဖြည့်ပါ။", tip: "Credit Card, Zelle, Cash နဲ့ လက်ခံရရှိသမျှ အကုန်ပေါင်းထည့်ပါ။ 1099-K ဖောင် ရလာရင် ဒီကိန်းဂဏန်းနဲ့ တိုက်စစ်ပါ။" },
    { line: "Part III", title: "Supplies (COGS)", color: "#f59e0b", text: "ကုန်ကြမ်းဝယ်ယူရသော ကုန်ကျစရိတ်များကို Part III တွင် ဖြည့်ပါ။", tip: "ကုန်ပစ္စည်း ထုတ်လုပ်ဖို့ တိုက်ရိုက်ဝယ်ရတဲ့ (ဥပမာ- Wave ပါ Tuna/Foods) တွေကို ဒီမှာထည့်ပါ။" },
    { line: "Line 18", title: "Software & Hardware", color: "#3b82f6", text: "Software နှင့် Tablet တို့လို ကုန်ကျစရိတ်များကို Line 18 တွင် ဖြည့်သွင်းနိုင်ပါသည်။", tip: "$2,500 ထက်နည်းတဲ့ Laptop, Tablet တွေနဲ့ လစဉ်ကြေးပေးရတဲ့ Software တွေကို ဒီမှာ ခုနှိမ်နိုင်ပါတယ်။" },
    { line: "Line 11", title: "Payroll (Contractors)", color: "#8b5cf6", text: "Payroll ထဲတွင် သင်ပေးချေခဲ့သော Contractor စရိတ်များကို Line 11 တွင် ဖြည့်ပါ။", tip: "တစ်နှစ်အတွင်း တစ်ဦးတည်းကို $600 ထက်ပိုပေးရင် 1099-NEC ဖောင် ထုတ်ပေးရပါမယ်။" },
    { line: "Line 30", title: "Home Office", color: "#6366f1", text: "အိမ်မှ အလုပ်လုပ်ပါက ရေခိုး၊ မီးခိုး၊ အိမ်လစာများကို ဤနေရာတွင် ခုနှိမ်နိုင်ပါသည်။", tip: "သင့်အိမ်ရဲ့ အခန်းတစ်ခန်းကို အလုပ်အတွက် သီးသန့်သုံးရင် အဲဒီဧရိယာရဲ့ ရာခိုင်နှုန်းအလိုက် နှုတ်နိုင်ပါတယ်။" },
    { line: "Line 1040ES", title: "Tax Payments", color: "#0d9488", text: "၃ လတစ်ကြိမ် အစိုးရကို ကြိုပေးထားသော အခွန်ပမာဏကို ဤနေရာတွင် နှုတ်ရန် မမေ့ပါနှင့်။", tip: "Quarterly Estimated Tax ပေးထားတာတွေ ရှိရင် ဒီမှာ ပြန်နှုတ်မှသာ နှစ်ကုန်ရင် အခွန်ထပ်ဆောင်ရမှာ နည်းသွားမှာပါ။" }
  ];

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-5xl mx-auto px-4">
        <div className="flex justify-between items-center mb-12 no-print">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-100"><Calendar size={28} /></div>
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Fiscal Report</h2>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="mt-2 appearance-none bg-slate-100 border-2 border-slate-200 text-slate-700 px-4 py-1.5 pr-10 rounded-xl font-black text-sm outline-none cursor-pointer">
                        {years.reverse().map(y => <option key={y} value={y}>{y} TAX YEAR</option>)}
                    </select>
                </div>
            </div>
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2"><Printer size={16}/> PRINT REPORT</button>
        </div>

        {/* P&L Table */}
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 mb-16">
            <div className="p-10 border-b-8 border-emerald-500 bg-slate-900 text-white flex justify-between items-end">
                <div><p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2 italic">Net Profit ({selectedYear})</p><h3 className="text-6xl font-black tracking-tighter">${(income-expenses).toLocaleString(undefined,{minimumFractionDigits:2})}</h3></div>
                <PieChart size={60} className="opacity-50" />
            </div>
            <div className="p-10 space-y-8">
                <div><h4 className="text-xs font-black text-emerald-600 uppercase mb-4">GROSS REVENUE</h4><div className="flex justify-between py-4 border-b border-slate-50 font-black text-xl text-slate-900"><p>Total Sales</p><p>${income.toLocaleString(undefined,{minimumFractionDigits:2})}</p></div></div>
                <div><h4 className="text-xs font-black text-rose-500 uppercase mb-4">DEDUCTIONS</h4><div className="space-y-4">{TAX_CATEGORIES.filter(c => c.type === 'expense' && c.value !== 'estimated_tax_paid').map(cat => { const total = calculateTotal(cat.value); return total > 0 ? ( <div key={cat.value} className="flex justify-between items-center group"><p className="text-sm font-bold text-slate-500">{cat.label}</p><div className="flex-1 border-b-2 border-dotted border-slate-200 mx-4 mb-1"></div><p className="font-black text-slate-900">${total.toLocaleString(undefined,{minimumFractionDigits:2})}</p></div> ) : null; })}</div></div>
            </div>
        </div>

        {/* Mapping Guide */}
        <div className="mt-24 border-t-4 border-slate-100 pt-16 no-print">
          <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter flex items-center gap-3 italic"><span className="bg-emerald-600 text-white p-2 rounded-lg"><FileBarChart size={24}/></span> IRS Mapping Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mappingCards.map((card, i) => (
              <div key={i} className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm border-l-8 hover:shadow-md transition group relative overflow-hidden" style={{ borderLeftColor: card.color }}>
                <button onClick={() => setActiveTip(card)} className="absolute top-4 right-4 text-slate-200 hover:text-emerald-500 transition-colors"><Info size={24} /></button>
                <p className="font-black text-slate-400 text-[10px] mb-2 uppercase tracking-widest italic">{card.line}</p>
                <h4 className="font-black text-slate-900 text-xl mb-3 underline decoration-slate-100 decoration-4">{card.title}</h4>
                <p className="text-slate-500 text-xs font-bold leading-relaxed">{card.text}</p>
              </div>
            ))}
          </div>
        </div>

        {activeTip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 relative animate-in zoom-in border-4" style={{borderColor: activeTip.color}}>
                <button onClick={() => setActiveTip(null)} className="absolute top-6 right-6 text-slate-400"><X size={28} /></button>
                <h3 className="text-2xl font-black text-slate-900 mb-4">{activeTip.title} Tip</h3>
                <p className="text-slate-600 font-bold italic bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">"{activeTip.tip}"</p>
                <button onClick={() => setActiveTip(null)} className="mt-8 w-full py-4 rounded-2xl font-black text-white" style={{backgroundColor: activeTip.color}}>Got it!</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}