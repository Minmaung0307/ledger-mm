// app/report/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { TAX_CATEGORIES } from '@/lib/constants';
import { Calendar, ExternalLink, FileBarChart, Printer, Download } from 'lucide-react';

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

  // CSV ထုတ်ရန် Function
  const exportCSV = () => {
    if (data.length === 0) return alert("No records to export.");
    const headers = "Date,Description,Category,Amount\n";
    const rows = data.map(t => {
      const date = t.date?.toDate().toLocaleDateString() || "N/A";
      return `${date},${t.description},${t.category},${t.amount}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax_report_${new Date().getFullYear()}.csv`;
    a.click();
  };

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse text-slate-400">GENERATING P&L STATEMENT...</p></Layout>;

  return (
    <Layout>
      <div className="pt-6 pb-20 max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Profit & Loss</h2>
                <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest italic flex items-center gap-2">
                   <Calendar size={14}/> {new Date().getFullYear()} YEAR-TO-DATE SUMMARY
                </p>
            </div>
            
            <div className="flex gap-3 no-print">
                <button 
                    onClick={exportCSV}
                    className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-sm hover:bg-slate-50 transition"
                >
                    <Download size={16}/> EXPORT CSV
                </button>
                <button 
                    onClick={() => window.print()}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-xl hover:bg-slate-800 transition"
                >
                    <Printer size={16}/> PRINT REPORT
                </button>
            </div>
        </div>

        {/* --- Printing CSS --- */}
        <style jsx global>{`
          @media print {
            aside, nav, .no-print { display: none !important; }
            main { margin-left: 0 !important; padding: 20px !important; }
            .bg-white { box-shadow: none !important; border: 1px solid #f1f5f9 !important; }
            body { background: white !important; }
          }
        `}</style>

        {/* P&L Table Style */}
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 mb-16">
            <div className="p-10 border-b-8 border-emerald-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Operating Income</p>
                <h3 className="text-5xl font-black text-slate-900">${income.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
            </div>

            <div className="p-10 space-y-8 bg-slate-50/30">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operating Expenses (Deductions)</h4>
                <div className="space-y-4">
                    {TAX_CATEGORIES.filter(c => c.type === 'expense').map(cat => {
                        const total = data.filter(d => d.category === cat.value).reduce((s, i) => s + i.amount, 0);
                        return (
                            <div key={cat.value} className="flex justify-between items-center group">
                                <p className="font-bold text-slate-500 group-hover:text-slate-900 transition text-sm">{cat.label}</p>
                                <div className="flex-1 border-b-2 border-dotted border-slate-200 mx-4 mb-1"></div>
                                <p className="font-black text-slate-900 text-sm">${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
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
                    ${(income - expenses).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </h3>
            </div>
        </div>

        {/* --- IRS Schedule C Mapping Guide --- */}
        <div className="mt-24 border-t-4 border-slate-100 pt-12 no-print">
          <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter flex items-center gap-3">
             <span className="bg-emerald-600 text-white p-2 rounded-lg inline-flex shadow-lg shadow-emerald-100"><FileBarChart size={24}/></span>
             IRS Schedule C Mapping Guide
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm border-l-8 border-l-emerald-500">
              <p className="font-black text-emerald-600 text-[10px] mb-2 uppercase tracking-widest italic">Line 1: Gross Sales</p>
              <h4 className="font-black text-slate-900 text-xl mb-3 underline decoration-emerald-200 decoration-4">Sales & Income</h4>
              <p className="text-slate-500 text-xs font-bold leading-relaxed">
                သင့်လုပ်ငန်းမှ ရရှိသော စုစုပေါင်းဝင်ငွေအားလုံးကို IRS Form 1040 Schedule C ၏ ပထမစာမျက်နှာ Line 1 တွင် ဖြည့်သွင်းရပါမည်။
              </p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm border-l-8 border-l-amber-500">
              <p className="font-black text-amber-600 text-[10px] mb-2 uppercase tracking-widest italic">Part III: Cost of Goods Sold</p>
              <h4 className="font-black text-slate-900 text-xl mb-3 underline decoration-amber-200 decoration-4">Ingredients & Supplies</h4>
              <p className="text-slate-500 text-xs font-bold leading-relaxed">
                ရောင်းကုန်ထုတ်လုပ်ရန် တိုက်ရိုက်ဝယ်ယူရသော ကုန်ကြမ်းများ (ဥပမာ- Wave ပါ Tuna/Produce) ကို Schedule C ၏ ဒုတိယစာမျက်နှာ Part III တွင် ဖြည့်သွင်းပါ။
              </p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm border-l-8 border-l-blue-500">
              <p className="font-black text-blue-600 text-[10px] mb-2 uppercase tracking-widest italic">Line 18: Office Expenses</p>
              <h4 className="font-black text-slate-900 text-xl mb-3 underline decoration-blue-200 decoration-4">Software & Hardware</h4>
              <p className="text-slate-500 text-xs font-bold leading-relaxed">
                Wave ပါ "Software" နှင့် "Tablet" တို့လို ကုန်ကျစရိတ်များမှာ $2,500 အောက်ဖြစ်ပါက "Office Expense" အဖြစ် Line 18 တွင် ဖြည့်သွင်းနိုင်ပါသည်။
              </p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm border-l-8 border-l-rose-500">
              <p className="font-black text-rose-600 text-[10px] mb-2 uppercase tracking-widest italic">Line 24b: Deductible Meals</p>
              <h4 className="font-black text-slate-900 text-xl mb-3 underline decoration-rose-200 decoration-4">Food & Beverages</h4>
              <p className="text-slate-500 text-xs font-bold leading-relaxed">
                လုပ်ငန်းသုံးအတွက် ဝယ်ယူသော စားသောက်စရိတ်များကို Line 24b တွင် ၅၀% သာ ခုနှိမ်ခွင့်ရှိပါသည်။
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm border-l-8 border-l-violet-500">
              <p className="font-black text-violet-600 text-[10px] mb-2 uppercase tracking-widest italic">Line 11: Contract Labor</p>
              <h4 className="font-black text-slate-900 text-xl mb-3 underline decoration-violet-200 decoration-4">Payroll (Contractors)</h4>
              <p className="text-slate-500 text-xs font-bold leading-relaxed">
                Payroll ထဲတွင် သင်ပေးချေခဲ့သော Contractor များ၏ စရိတ်များကို Line 11 တွင် ဖြည့်ရပါမည်။
              </p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm border-l-8 border-l-slate-700">
              <p className="font-black text-slate-700 text-[10px] mb-2 uppercase tracking-widest italic">Line 9: Car & Truck Expenses</p>
              <h4 className="font-black text-slate-900 text-xl mb-3 underline decoration-slate-300 decoration-4">Car & Truck</h4>
              <p className="text-slate-500 text-xs font-bold leading-relaxed">
                လုပ်ငန်းသုံးယာဉ်အတွက် Gas, Repair သို့မဟုတ် Mileage Rate ကိုသုံးပြီး ဤနေရာတွင် ခုနှိမ်နိုင်ပါသည်။
              </p>
            </div>
          </div>
        </div>

        {/* --- IRS Free File Step-by-Step Guide --- */}
        <div className="mt-24 border-t-8 border-slate-100 pt-16 mb-40 no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                IRS Free Filing Guide
              </h3>
              <p className="text-slate-500 font-bold mt-2 font-sans italic">သင့် App ထဲက စာရင်းတွေကို အစိုးရ website မှာ ဖြည့်သွင်းနည်း</p>
            </div>
            <a 
              href="https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free" 
              target="_blank" 
              className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-2xl hover:bg-slate-900 transition flex items-center gap-2"
            >
              GO TO IRS.GOV <ExternalLink size={16} />
            </a>
          </div>

          <div className="space-y-6">
            {[
              { n: 1, title: "Gather App Reports", text: "Profit & Loss Report ကို ဖွင့်ပါ။ စုစုပေါင်း ဝင်ငွေနဲ့ Category အလိုက် စုစုပေါင်း အသုံးစရိတ်တွေကို မှတ်ထားပါ။ (Export CSV ကို သုံးနိုင်သည်)" },
              { n: 2, title: "Choose Software", text: "IRS.gov တွင် Free File Lookup Tool ကို သုံးပါ။ ဝင်ငွေ $79,000 အောက်ဖြစ်ပါက TurboTax သို့မဟုတ် TaxSlayer ကို အခမဲ့ သုံးနိုင်ပါသည်။" },
              { n: 3, title: "Enter Gross Income", text: "Software ထဲတွင် Business Income နေရာကို သွားပြီး App Dashboard ရှိ Total Income ကို Line 1 တွင် ဖြည့်ပါ။" },
              { n: 4, title: "Claim Deductions", text: "App Category များအတိုင်း Software တွင် လိုက်ဖြည့်ပါ။ (ဥပမာ- Office Expense, Advertising)" },
              { n: 5, title: "Report COGS", text: "Tuna, Produce တို့လို ကုန်ကြမ်းဝယ်ယူမှုများကို Schedule C ၏ Part III (Line 36: Purchases) တွင် ဖြည့်ပါ။" },
              { n: 6, title: "Self-Employment Tax", text: "Software က SE Tax ကို auto တွက်ပေးပါမည်။ ဤကိန်းဂဏန်းသည် App ရှိ Estimated Tax နှင့် ဆင်တူနေရပါမည်။" },
              { n: 7, title: "Final Review & E-File", text: "အချက်အလက်များ စစ်ဆေးပြီး E-file ကို နှိပ်ပါ။ ဂုဏ်ယူပါသည်၊ အခွန်ဆောင်ခြင်း အောင်မြင်သွားပါပြီ!", special: true }
            ].map((step) => (
              <div key={step.n} className={`${step.special ? 'bg-emerald-600 text-white shadow-2xl scale-[1.02]' : 'bg-white border-2 border-slate-50 shadow-xl'} p-8 rounded-[2.5rem] flex gap-6 group transition-all`}>
                <div className={`w-16 h-16 ${step.special ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white'} rounded-full flex-shrink-0 flex items-center justify-center font-black text-2xl transition`}>
                  {step.n}
                </div>
                <div>
                  <h4 className={`text-xl font-black mb-2 uppercase tracking-tight ${step.special ? 'text-white' : 'text-slate-900'}`}>{step.title}</h4>
                  <p className={`${step.special ? 'text-emerald-50' : 'text-slate-500'} text-sm font-bold leading-relaxed`}>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}