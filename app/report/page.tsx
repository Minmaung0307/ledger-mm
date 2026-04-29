// app/report/page.tsx
"use client";
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { TAX_CATEGORIES } from '@/lib/constants';
import { Calendar, ExternalLink, FileBarChart, Printer, Download, ChevronDown, Info, PieChart, Landmark, AlertCircle, X, Edit, Save, Loader2 } from 'lucide-react';

export default function ProfitLossReport() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTip, setActiveTip] = useState<any>(null);
  const [taxNote, setTaxNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2024 + 2 }, (_, i) => 2024 + i);

  useEffect(() => {
      // ၁။ Auth State ကို စောင့်ကြည့်မယ်
      const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // --- (က) စာရင်းများ (Transactions) ဆွဲယူခြင်း ---
          const startOfYear = new Date(selectedYear, 0, 1);
          const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);

          const q = query(
            collection(db, "transactions"),
            where("uid", "==", user.uid),
            where("date", ">=", startOfYear),
            where("date", "<=", endOfYear),
            orderBy("date", "desc")
          );

          const unsubscribeData = onSnapshot(q, (snapshot) => {
            setData(snapshot.docs.map(doc => doc.data()));
            setLoading(false);
          }, (error) => {
            console.error("Firestore error:", error);
            setLoading(false);
          });

          // --- (ခ) မှတ်စု (Tax Note) ဆွဲယူခြင်း ---
          try {
            const noteRef = doc(db, "tax_notes", `${user.uid}_${selectedYear}`);
            const noteSnap = await getDoc(noteRef);
            if (noteSnap.exists()) {
              setTaxNote(noteSnap.data().content);
            } else {
              setTaxNote(''); // မှတ်စု မရှိသေးရင် အလွတ်ပြမယ်
            }
          } catch (err) {
            console.error("Error fetching note:", err);
          }

          // Cleanup function: Listener တွေကို ပြန်ပိတ်မယ်
          return () => {
            unsubscribeData();
          };
        } else {
          setLoading(false);
        }
      });

      return () => unsubscribeAuth();
    }, [selectedYear]);

  const saveNote = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setIsSavingNote(true);
    try {
      const noteRef = doc(db, "tax_notes", `${user.uid}_${selectedYear}`);
      await setDoc(noteRef, {
        content: taxNote,
        year: selectedYear,
        uid: user.uid,
        updatedAt: new Date()
      });
      alert(`${selectedYear} မှတ်စုကို သိမ်းဆည်းပြီးပါပြီ။`);
    } catch (err) {
      alert("သိမ်းဆည်းရတာ အဆင်မပြေပါ");
    } finally {
      setIsSavingNote(false);
    }
  };

  const calculateTotal = (catValue: string) => {
    return data.filter(d => d.category === catValue).reduce((s, i) => s + i.amount, 0);
  };

  // ဝင်ငွေ စုစုပေါင်း
  const income = data.filter(item => {
    const cat = TAX_CATEGORIES.find(c => c.value === item.category);
    return cat?.type === 'income';
  }).reduce((sum, item) => sum + item.amount, 0);

  // အသုံးစရိတ် စုစုပေါင်း (Estimated Tax ကို ဖယ်ထားပါမယ် - ဒါမှ Net Profit အစစ် ထွက်မှာပါ)
  const expenses = data.filter(item => {
    const cat = TAX_CATEGORIES.find(c => c.value === item.category);
    return cat?.type === 'expense' && item.category !== 'estimated_tax_paid';
  }).reduce((sum, item) => sum + item.amount, 0);

  // အစိုးရကို ကြိုတင်ပေးထားသော အခွန် စုစုပေါင်း
  const totalEstimatedPaid = calculateTotal('estimated_tax_paid');
  
  // အသားတင်အမြတ် နှင့် အခွန်တွက်ချက်မှု
  const netProfit = income - expenses;
  const taxLiability = netProfit > 0 ? netProfit * 0.153 : 0; // 15.3% Self-Employment Tax
  const balanceDue = taxLiability - totalEstimatedPaid;

  const exportCSV = () => {
    if (data.length === 0) return alert("No records to export.");
    const headers = "Date,Description,Category,Amount\n";
    const rows = data.map(t => `${t.date?.toDate().toLocaleDateString() || "N/A"},${t.description},${t.category},${t.amount}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax_report_${selectedYear}.csv`;
    a.click();
  };

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse text-slate-400 uppercase">Syncing {selectedYear} Data...</p></Layout>;

  return (
    <Layout>
      <div className="pt-6 pb-40 max-w-5xl mx-auto px-4">
        
        {/* --- Header Section --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 no-print">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                    <Calendar size={28} />
                </div>
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Fiscal Report</h2>
                    <div className="mt-2 relative inline-block group">
                        <select 
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="appearance-none bg-slate-100 border-2 border-slate-200 text-slate-700 px-4 py-1.5 pr-10 rounded-xl font-black text-sm outline-none cursor-pointer hover:bg-slate-200 transition-all"
                        >
                            {years.reverse().map(year => (
                                <option key={year} value={year}>{year} TAX YEAR</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>
            
            <div className="flex gap-3">
                <button onClick={exportCSV} className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-slate-50 transition">
                    <Download size={16}/> EXPORT CSV
                </button>
                <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-xl hover:bg-slate-800 transition">
                    <Printer size={16}/> PRINT REPORT
                </button>
            </div>
        </div>

        <style jsx global>{`
          @media print {
            aside, nav, .no-print { display: none !important; }
            main { margin-left: 0 !important; padding: 20px !important; }
            .bg-white { box-shadow: none !important; border: 1px solid #f1f5f9 !important; }
          }
        `}</style>

        {/* --- Main P&L Table --- */}
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 mb-16">
            <div className="p-10 border-b-8 border-emerald-500 bg-slate-900 text-white flex justify-between items-end">
                <div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2 italic">Net Business Profit ({selectedYear})</p>
                    <h3 className="text-6xl font-black tracking-tighter">${netProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
                </div>
                <div className="text-right hidden md:block opacity-50"><PieChart size={60} /></div>
            </div>

            <div className="p-10 space-y-10">
                {/* Gross Income Section */}
                <div>
                    <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">GROSS RECEIPTS</h4>
                    <div className="flex justify-between items-center py-4 border-b border-slate-50 font-black text-xl text-slate-900">
                        <p>Total Sales & Income</p>
                        <p>${income.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </div>
                </div>

                {/* Operating Expenses Section (Including Home Office & Mileage) */}
                <div>
                    <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-6">OPERATING DEDUCTIONS</h4>
                    <div className="space-y-4">
                        {TAX_CATEGORIES.filter(c => c.type === 'expense' && c.value !== 'estimated_tax_paid').map(cat => {
                            const total = calculateTotal(cat.value);
                            if (total === 0) return null;
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

                {/* --- New Section: Tax Calculation Summary --- */}
                <div className="mt-12 pt-10 border-t-4 border-slate-100">
                    <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <AlertCircle size={14}/> ESTIMATED TAX SUMMARY
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Est. Self-Employment Tax (15.3%)</p>
                            <p className="text-2xl font-black text-slate-900">${taxLiability.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                        </div>
                        <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                            <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Total Estimated Tax Paid</p>
                            <p className="text-2xl font-black text-blue-600">${totalEstimatedPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                        </div>
                    </div>
                    <div className="mt-4 bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 flex justify-between items-center">
                        <p className="font-black text-emerald-900 uppercase text-xs">Remaining Tax Balance:</p>
                        <p className="text-3xl font-black text-emerald-600">
                            {balanceDue > 0 ? `$${balanceDue.toLocaleString(undefined, {minimumFractionDigits: 2})}` : "$0.00"}
                        </p>
                    </div>
                </div>
            </div>
        </div>

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

        {/* --- Yearly Tax Notes Section --- */}
        <div className="mt-16 bg-white p-8 rounded-[3rem] shadow-2xl border-2 border-slate-50 no-print">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
              <Edit size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedYear} Tax Notes & Strategy</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ဒီနှစ်အတွက် သီးသန့်မှတ်ချက်များ</p>
            </div>
          </div>

          <textarea 
            value={taxNote}
            onChange={(e) => setTaxNote(e.target.value)}
            placeholder={`${selectedYear} ခုနှစ် အခွန်ဆောင်ရမည့် အစီအစဉ်များ၊ သတိထားရမည့်အချက်များကို ဒီမှာ ရေးမှတ်ထားနိုင်ပါသည်...`}
            className="w-full h-40 p-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] font-bold text-slate-700 dark:text-white focus:border-amber-400 outline-none transition-all resize-none"
          />

          <div className="mt-4 flex justify-end">
            <button 
              onClick={saveNote}
              disabled={isSavingNote}
              className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg hover:bg-slate-900 transition active:scale-95 disabled:bg-slate-200"
            >
              {isSavingNote ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
              SAVE {selectedYear} NOTES
            </button>
          </div>
        </div>

        {/* --- Mapping Guide Section --- */}
        <div className="mt-24 border-t-4 border-slate-100 pt-16 no-print">
          <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter flex items-center gap-3">
             <span className="bg-emerald-600 text-white p-2 rounded-lg inline-flex shadow-lg shadow-emerald-100"><FileBarChart size={24}/></span>
             IRS Schedule C Mapping Guide
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { line: "Line 1", title: "Sales & Income", color: "#10b981", text: "သင့်လုပ်ငန်းမှ ရရှိသော စုစုပေါင်းဝင်ငွေအားလုံးကို Line 1 တွင် ဖြည့်သွင်းရပါမည်။", tip: "Credit Card, Zelle, Cash နဲ့ လက်ခံရရှိသမျှ အကုန်ပေါင်းထည့်ပါ။ 1099-K ဖောင် ရလာရင် ဒီကိန်းဂဏန်းနဲ့ တိုက်စစ်ပါ။" },
              { line: "Part III", title: "Ingredients & Supplies", color: "#f59e0b", text: "ရောင်းကုန်ထုတ်လုပ်ရန် တိုက်ရိုက်ဝယ်ယူရသော ကုန်ကြမ်းများကို Part III (COGS) တွင် ဖြည့်ပါ။", tip: "ကုန်ပစ္စည်း ထုတ်လုပ်ဖို့ တိုက်ရိုက်ဝယ်ရတဲ့ (ဥပမာ- Wave ပါ Tuna/Foods) တွေကို ဒီမှာထည့်ပါ။ Inventory ကျန်တာရှိရင် နှုတ်ပေးဖို့ မမေ့ပါနဲ့။" },
              { line: "Line 18", title: "Software & Hardware", color: "#3b82f6", text: "Software နှင့် Tablet တို့လို ကုန်ကျစရိတ်များကို Line 18 တွင် ဖြည့်သွင်းနိုင်ပါသည်။", tip: "$2,500 ထက်နည်းတဲ့ Laptop, Tablet တွေနဲ့ လစဉ်ကြေးပေးရတဲ့ Software တွေကို ဒီမှာ အပြည့်အဝ ခုနှိမ်နိုင်ပါတယ်။" },
              { line: "Line 24b", title: "Food & Beverages", color: "#f43f5e", text: "လုပ်ငန်းသုံးအတွက် ဝယ်ယူသော စားသောက်စရိတ်များကို Line 24b တွင် ၅၀% သာ ခုနှိမ်ခွင့်ရှိပါသည်။", tip: "Client နဲ့ အလုပ်ကိစ္စ ဆွေးနွေးရင်း စားသောက်တဲ့ စရိတ်ကိုပဲ ခုနှိမ်ပါ။ Grocery ဝယ်တာကိုတော့ Personal expense လို့ သတ်မှတ်ပါတယ်။" },
              { line: "Line 11", title: "Payroll (Contractors)", color: "#8b5cf6", text: "Payroll ထဲတွင် သင်ပေးချေခဲ့သော Contractor များ၏ စရိတ်များကို Line 11 တွင် ဖြည့်ပါ။", tip: "တစ်နှစ်အတွင်း တစ်ဦးတည်းကို $600 ကျော်ရင် 1099-NEC ဖောင် ထုတ်ပေးရပါမယ်။ SSN သို့မဟုတ် EIN တောင်းထားဖို့ လိုပါတယ်။" },
              { line: "Line 9", title: "Car & Truck", color: "#64748b", text: "Gas, Repair သို့မဟုတ် Mileage Rate ကိုသုံးပြီး ဤနေရာတွင် ခုနှိမ်နိုင်ပါသည်။", tip: "အမှန်တကယ် ကုန်ကျတဲ့ ဆီဖိုးကို သုံးမလား၊ ဒါမှမဟုတ် IRS မိုင်နှုန်း ($0.67/mile) ကို သုံးမလား ရွေးချယ်နိုင်ပါတယ်။" },
              { line: "Line 30", title: "Home Office", color: "#6366f1", text: "အိမ်မှ အလုပ်လုပ်ပါက ရေခိုး၊ မီးခိုး၊ အိမ်လစာများကို အချိုးကျ ဤနေရာတွင် ခုနှိမ်နိုင်ပါသည်။", tip: "သင့်အိမ်ရဲ့ အခန်းတစ်ခန်းကို အလုပ်အတွက် သီးသန့်သုံးရင် အဲဒီဧရိယာရဲ့ ရာခိုင်နှုန်းအလိုက် အိမ်လစာ၊ မီးဖိုးတွေကို နှုတ်နိုင်ပါတယ်။" },
              { line: "Line 1040ES", title: "Tax Payments", color: "#0d9488", text: "၃ လတစ်ကြိမ် အစိုးရကို ကြိုပေးထားသော အခွန်ပမာဏကို ဤနေရာတွင် နှုတ်ရန် မမေ့ပါနှင့်။", tip: "Quarterly Estimated Tax ပေးထားတာတွေ ရှိရင် ဒီမှာ ပြန်နှုတ်မှသာ နှစ်ကုန်ရင် အခွန်ထပ်ဆောင်ရမှာ နည်းသွားမှာပါ။" }
            ].map((card, i) => (
              <div key={i} className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm border-l-8 transition-all hover:shadow-md group relative overflow-hidden" style={{ borderLeftColor: card.color }}>
                
                {/* နှိပ်လို့ရမည့် Info ခလုတ်လေး ဖြစ်သွားပါပြီ */}
                <button 
                  onClick={() => setActiveTip(card)}
                  className="absolute top-4 right-4 text-slate-200 hover:text-emerald-500 transition-colors bg-slate-50 p-2 rounded-full group-hover:bg-emerald-50"
                >
                    <Info size={24} />
                </button>

                <p className="font-black text-slate-400 text-[10px] mb-2 uppercase tracking-widest italic">{card.line}</p>
                <h4 className="font-black text-slate-900 text-xl mb-3 underline decoration-slate-100 decoration-4">{card.title}</h4>
                <p className="text-slate-500 text-xs font-bold leading-relaxed">{card.text}</p>
              </div>
            ))}
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
                <div className={`w-16 h-16 ${step.special ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-900 group-hover:bg-emerald-600 group-hover:text-white'} rounded-full flex-shrink-0 flex items-center justify-center font-black text-2xl transition`}>
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

        {/* --- Tax Tip Pop-up (Modal) --- */}
        {activeTip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm no-print">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 relative animate-in zoom-in duration-200 border-4" style={{borderColor: activeTip.color}}>
                <button onClick={() => setActiveTip(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X size={28} /></button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl text-white shadow-lg" style={{backgroundColor: activeTip.color}}><AlertCircle size={24}/></div>
                    <div>
                        <p className="text-[10px] font-black uppercase opacity-50">{activeTip.line} Pro Tip</p>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{activeTip.title}</h3>
                    </div>
                </div>
                <p className="text-slate-600 font-bold leading-relaxed text-lg bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 italic">"{activeTip.tip}"</p>
                <button onClick={() => setActiveTip(null)} className="mt-8 w-full py-4 rounded-2xl font-black text-white shadow-xl hover:opacity-90 transition-all uppercase tracking-widest" style={{backgroundColor: activeTip.color}}>Got it, Thanks!</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}