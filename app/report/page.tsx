// app/report/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { TAX_CATEGORIES } from '@/lib/constants';
import { Calendar, ExternalLink, FileBarChart } from 'lucide-react';

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

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse text-slate-400">GENERATING P&L STATEMENT...</p></Layout>;

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
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 mb-12">
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

        {/* --- IRS Tax Filing Guide --- */}
        <div className="mt-24 border-t-4 border-slate-100 pt-12">
          {/* FileBarChart ကို ဒီနေရာမှာ ပြန်ထည့်ထားပါတယ် */}
          <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter flex items-center gap-3">
             <span className="bg-emerald-600 text-white p-2 rounded-lg inline-flex"><FileBarChart size={24}/></span>
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
              <p className="font-black text-amber-600 text-[10px] mb-2 uppercase tracking-widest italic">Part III: Cost of Goods Sold (COGS)</p>
              <h4 className="font-black text-slate-900 text-xl mb-3 underline decoration-amber-200 decoration-4">Ingredients & Supplies</h4>
              <p className="text-slate-500 text-xs font-bold leading-relaxed">
                ရောင်းကုန်ထုတ်လုပ်ရန် တိုက်ရိုက်ဝယ်ယူရသော ကုန်ကြမ်းများ (ဥပမာ- Wave ပါ Tuna/Produce) ကို Schedule C ၏ ဒုတိယစာမျက်နှာ Part III (COGS) တွင် ဖြည့်သွင်းရပါမည်။
              </p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm border-l-8 border-l-blue-500">
              <p className="font-black text-blue-600 text-[10px] mb-2 uppercase tracking-widest italic">Line 18: Office Expenses</p>
              <h4 className="font-black text-slate-900 text-xl mb-3 underline decoration-blue-200 decoration-4">Software & Small Hardware</h4>
              <p className="text-slate-500 text-xs font-bold leading-relaxed">
                Wave ပါ "Software" နှင့် "Tablet" တို့လို ကုန်ကျစရိတ်များမှာ $2,500 အောက်ဖြစ်ပါက "Office Expense" အဖြစ် Line 18 တွင် တိုက်ရိုက်ခုနှိမ်နိုင်ပါသည်။
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
                Payroll ထဲတွင် သင်ပေးချေခဲ့သော Contractor များ၏ စရိတ်များကို Line 11 တွင် ဖြည့်ရပါမည်။ တစ်ဦးကို $600 ကျော်လျှင် 1099-NEC ထုတ်ပေးရန် လိုအပ်ပါသည်။
              </p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm border-l-8 border-l-slate-700">
              <p className="font-black text-slate-700 text-[10px] mb-2 uppercase tracking-widest italic">Line 9: Car & Truck Expenses</p>
              <h4 className="font-black text-slate-900 text-xl mb-3 underline decoration-slate-300 decoration-4">Car & Truck</h4>
              <p className="text-slate-500 text-xs font-bold leading-relaxed">
                လုပ်ငန်းသုံးယာဉ်အတွက် Gas, Repair သို့မဟုတ် Standard Mileage Rate ကိုသုံးပြီး ဤနေရာတွင် ခုနှိမ်နိုင်ပါသည်။
              </p>
            </div>
          </div>
        </div>

        {/* --- IRS Free File Step-by-Step Guide --- */}
        <div className="mt-24 border-t-8 border-slate-100 pt-16 mb-40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                Step-by-Step IRS Free Filing Guide
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
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-50 flex gap-6 group hover:border-emerald-500 transition-all">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex-shrink-0 flex items-center justify-center font-black text-2xl text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition">1</div>
              <div>
                <h4 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight font-sans">Gather App Reports (စာရင်းများ ပြင်ဆင်ခြင်း)</h4>
                <p className="text-slate-500 text-sm font-bold leading-relaxed">
                  ပထမဆုံး သင့် App ထဲက Profit & Loss Report ကို ဖွင့်ပါ။ စုစုပေါင်း ဝင်ငွေ (Total Income) နဲ့ Category အလိုက် စုစုပေါင်း အသုံးစရိတ်တွေကို မှတ်ထားပါ။ 
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-50 flex gap-6 group hover:border-emerald-500 transition-all">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex-shrink-0 flex items-center justify-center font-black text-2xl text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition">2</div>
              <div>
                <h4 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight font-sans">Choose IRS Free File Provider (Software ရွေးချယ်ခြင်း)</h4>
                <p className="text-slate-500 text-sm font-bold leading-relaxed">
                  IRS.gov တွင် "Free File Lookup Tool" ကို သုံးပါ။ သင့်ဝင်ငွေ $79,000 အောက်ဖြစ်ပါက TurboTax သို့မဟုတ် TaxSlayer ကဲ့သို့သော နာမည်ကြီး Software များကို အခမဲ့ သုံးခွင့်ရပါမည်။
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-100 flex gap-6 group hover:border-emerald-500 transition-all border-l-8 border-l-emerald-500">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex-shrink-0 flex items-center justify-center font-black text-2xl text-emerald-600">3</div>
              <div>
                <h4 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight font-sans">Enter Gross Income: Line 1 (ဝင်ငွေထည့်ခြင်း)</h4>
                <p className="text-slate-500 text-sm font-bold leading-relaxed">
                  Software ထဲတွင် "Business Income" နေရာကို သွားပါ။ App Dashboard ရှိ Total Income ကို IRS Form Schedule C ၏ **Line 1** နေရာတွင် ဖြည့်သွင်းပါ။
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-100 flex gap-6 group hover:border-emerald-500 transition-all border-l-8 border-l-rose-500">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex-shrink-0 flex items-center justify-center font-black text-2xl text-rose-500">4</div>
              <div>
                <h4 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight font-sans">Claim Deductions: Schedule C (အသုံးစရိတ်များ ဖြည့်ခြင်း)</h4>
                <p className="text-slate-500 text-sm font-bold leading-relaxed">
                  App ရှိ Category များအတိုင်း Software တွင် လိုက်ဖြည့်ပါ။ (ဥပမာ- Office Expense, Advertising, Contract Labor)
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-100 flex gap-6 group hover:border-emerald-500 transition-all border-l-8 border-l-amber-500">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex-shrink-0 flex items-center justify-center font-black text-2xl text-amber-500">5</div>
              <div>
                <h4 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight font-sans">Report COGS: Part III (ကုန်ကြမ်းစရိတ်များ)</h4>
                <p className="text-slate-500 text-sm font-bold leading-relaxed">
                  **Tuna, Produce, Foods** ကဲ့သို့ ကုန်ကြမ်းဝယ်ယူမှုများကို Schedule C ၏ Part III (Line 36: Purchases) နေရာတွင် ဖြည့်သွင်းပါ။
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-100 flex gap-6 group hover:border-emerald-500 transition-all border-l-8 border-l-slate-900">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex-shrink-0 flex items-center justify-center font-black text-2xl text-white">6</div>
              <div>
                <h4 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight font-sans">Pay Self-Employment Tax: 1040-SE (အခွန်တွက်ချက်ခြင်း)</h4>
                <p className="text-slate-500 text-sm font-bold leading-relaxed">
                  Software က SE Tax ကို auto တွက်ပေးပါမည်။ ဤကိန်းဂဏန်းသည် App Dashboard ရှိ Estimated Tax နှင့် ဆင်တူနေရပါမည်။
                </p>
              </div>
            </div>

            <div className="bg-emerald-600 p-8 rounded-[2.5rem] shadow-2xl flex gap-6 text-white transform hover:scale-[1.02] transition">
              <div className="w-16 h-16 bg-white/20 rounded-full flex-shrink-0 flex items-center justify-center font-black text-2xl text-white animate-bounce">7</div>
              <div>
                <h4 className="text-xl font-black mb-2 uppercase tracking-tight font-sans">Final Review & E-File (တင်သွင်းခြင်း)</h4>
                <p className="text-emerald-50 font-bold text-sm leading-relaxed">
                  အချက်အလက်များ စစ်ဆေးပြီး "E-file" ကို နှိပ်ပြီး တင်သွင်းလိုက်ပါ။ ဂုဏ်ယူပါသည်၊ သင် ကိုယ်တိုင် အခွန်ဆောင်ခြင်း အောင်မြင်သွားပါပြီ!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}