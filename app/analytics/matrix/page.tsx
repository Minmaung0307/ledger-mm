// app/analytics/matrix/page.tsx
"use client";
import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Download, Search, FileSpreadsheet, Calendar, Table as TableIcon, X, ChevronDown, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AnalyticsMatrix() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // --- Expense အတွက် သီးသန့် Filter States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const years = Array.from({ length: new Date().getFullYear() - 2024 + 2 }, (_, i) => 2024 + i);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoading(true);
        const start = new Date(selectedYear, 0, 1);
        const end = new Date(selectedYear, 11, 31, 23, 59, 59);

        // Firebase Query (Index building ပြီးသွားရင် အကုန်ပေါ်လာပါလိမ့်မယ်)
        const q = query(
          collection(db, "transactions"), 
          where("uid", "==", user.uid), 
          where("date", ">=", start), 
          where("date", "<=", end),
          orderBy("date", "asc")
        );

        const unsubscribeData = onSnapshot(q, (snap) => {
          const items = snap.docs.map(doc => {
              const d = doc.data();
              const date = d.transactionDate?.toDate?.() || d.date?.toDate?.() || new Date();
              const day = date.getDate();
              const week = day <= 7 ? "Week 1" : day <= 14 ? "Week 2" : day <= 21 ? "Week 3" : day <= 28 ? "Week 4" : "Week 5";
              return { 
                id: doc.id, ...d, 
                month: date.getMonth(), 
                weekLabel: week,
                amount: Number(d.amount) || 0 
              };
          });
          setData(items);
          setLoading(false);
        }, (error) => {
          console.error("Firebase Error:", error);
          setLoading(false);
        });

        return () => unsubscribeData();
      }
    });
    return () => unsubscribeAuth();
  }, [selectedYear]);

  // --- ၁။ Income Logic (Year Selector တစ်ခုတည်းကိုပဲ နားထောင်မယ်) ---
  const incomeMatrixData = useMemo(() => {
    const matrix: any = { "Week 1": {}, "Week 2": {}, "Week 3": {}, "Week 4": {}, "Week 5": {} };
    const totals = Array(12).fill(0);
    
    data.filter(d => d.category === 'income' || d.category === 'w2_income').forEach(d => {
        matrix[d.weekLabel][d.month] = (matrix[d.weekLabel][d.month] || 0) + d.amount;
        totals[d.month] += d.amount;
    });
    return { matrix, totals };
  }, [data]);

  // --- ၂။ Expense Logic (Search + Month + Week Filter တွေကို နားထောင်မယ်) ---
  const expenseMatrixData = useMemo(() => {
    const filtered = data.filter(d => {
        const isExpense = d.category !== 'income' && d.category !== 'w2_income' && d.category !== 'estimated_tax_paid' && d.category !== 'owner_draw';
        const matchSearch = d.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchMonth = selectedMonth === 'all' ? true : d.month === parseInt(selectedMonth);
        const matchWeek = selectedWeek === 'all' ? true : d.weekLabel === selectedWeek;
        return isExpense && matchSearch && matchMonth && matchWeek;
    });

    const matrix: any = {};
    const totals = Array(12).fill(0);
    filtered.forEach(d => {
        const cleanName = d.description.split(' (')[0].trim();
        if (!matrix[cleanName]) matrix[cleanName] = Array(12).fill(0);
        matrix[cleanName][d.month] += d.amount;
        totals[d.month] += d.amount;
    });
    return { matrix, totals };
  }, [data, searchTerm, selectedMonth, selectedWeek]);

  const getRowSum = (arr: any) => (Array.isArray(arr) ? arr : Object.values(arr)).reduce((a:number,b:any)=>a+(Number(b)||0), 0);

  if (loading) return <Layout><p className="p-20 text-center font-black animate-pulse text-slate-300">Syncing Matrix Data...</p></Layout>;

  // --- Excel ထုတ်ယူမည့် Logic (ဒီကုဒ်ကို ထည့်လိုက်ရင် အနီရောင်မျဉ်း ပျောက်သွားပါလိမ့်မယ်) ---
    const exportToExcel = () => {
    if (data.length === 0) return alert("No data to export");
    
    const wb = XLSX.utils.book_new();

    // ၁။ Weekly Income Sheet အတွက် Data ပြင်ဆင်ခြင်း
    const incomeRows = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"].map(week => ({
        Timeframe: week,
        ...monthNames.reduce((acc, m, i) => ({ ...acc, [m]: incomeMatrixData.matrix[week][i] || 0 }), {}),
        "Year Total": getRowSum(incomeMatrixData.matrix[week])
    }));
    const wsIncome = XLSX.utils.json_to_sheet(incomeRows);
    XLSX.utils.book_append_sheet(wb, wsIncome, "Weekly_Income");

    // ၂။ Itemized Expense Sheet အတွက် Data ပြင်ဆင်ခြင်း
    const expenseRows = Object.keys(expenseMatrixData.matrix).sort().map(item => ({
        "Purchase Item": item,
        ...monthNames.reduce((acc, m, i) => ({ ...acc, [m]: expenseMatrixData.matrix[item][i] || 0 }), {}),
        "Total Sum": getRowSum(expenseMatrixData.matrix[item])
    }));
    const wsExpense = XLSX.utils.json_to_sheet(expenseRows);
    XLSX.utils.book_append_sheet(wb, wsExpense, "Expense_Matrix");

    // ၃။ ဖိုင်အမည်ပေးပြီး သိမ်းဆည်းခြင်း
    XLSX.writeFile(wb, `Sushi_Business_Matrix_${selectedYear}.xlsx`);
    };

  return (
    <Layout>
      <div className="pt-4 pb-40 px-4 max-w-full overflow-hidden">
        
        {/* --- ၁။ PAGE HEADER (အမြဲပေါ်နေမည့် အပိုင်း) --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 no-print">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-2xl">
                    <TableIcon size={28}/>
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Analytics Matrix</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <Calendar size={14} className="text-emerald-500" />
                        <select 
                            value={selectedYear} 
                            onChange={e => setSelectedYear(parseInt(e.target.value))} 
                            className="bg-transparent font-black text-emerald-600 outline-none cursor-pointer text-sm uppercase"
                        >
                            {years.reverse().map(y => <option key={y} value={y}>{y} FISCAL YEAR</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <button onClick={exportToExcel} className="bg-emerald-600 hover:bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs flex items-center gap-2 shadow-xl transition-all active:scale-95 uppercase tracking-widest">
                <FileSpreadsheet size={18}/> Export to Excel
            </button>
        </div>

        {/* --- ၂။ DESKTOP VIEW ONLY WRAPPER (ဖုန်းမှာ ဖျောက်ထားမည့် အပိုင်း) --- */}
        <div className="hidden lg:block space-y-16">
            
            {/* --- SECTION 1: WEEKLY INCOME (Yearly Only - No extra filters) --- */}
            <div>
                <div className="flex items-center gap-2 mb-6">
                    <ArrowUpCircle className="text-emerald-500" size={22} />
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest italic">Weekly Income Analysis</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl border-2 border-slate-50 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1400px]">
                            <thead>
                                <tr className="bg-slate-900 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-800">
                                    <th className="p-6 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">Timeframe</th>
                                    {monthNames.map(m => <th key={m} className="p-6 text-center">{m}</th>)}
                                    <th className="p-6 bg-emerald-600 text-white text-right sticky right-0 z-10">Total</th>
                                </tr>
                            </thead>
                            <tbody className="font-bold text-xs">
                                {["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"].map(week => (
                                    <tr key={week} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="p-6 bg-slate-50 dark:bg-slate-900 font-black text-slate-900 dark:text-white sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 uppercase italic">{week}</td>
                                        {monthNames.map((_, i) => (
                                            <td key={i} className="p-6 text-right text-slate-500 dark:text-slate-400 font-black">
                                                {incomeMatrixData.matrix[week][i] ? `$${incomeMatrixData.matrix[week][i].toLocaleString()}` : "-"}
                                            </td>
                                        ))}
                                        <td className="p-6 text-right bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-black sticky right-0 z-10 border-l border-emerald-100 dark:border-emerald-800">
                                            ${getRowSum(incomeMatrixData.matrix[week]).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-emerald-600 text-white font-black border-t-2 border-emerald-700">
                                    <td className="p-6 sticky left-0 bg-emerald-700 z-10 uppercase tracking-tighter">Monthly Totals</td>
                                    {incomeMatrixData.totals.map((t, i) => <td key={i} className="p-6 text-right font-black">${t.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>)}
                                    <td className="p-6 text-right bg-emerald-800 text-lg sticky right-0 z-10 italic underline decoration-white decoration-4 underline-offset-4 shadow-2xl">
                                        ${incomeMatrixData.totals.reduce((a,b)=>a+b, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- SECTION 2: ITEMISED EXPENSES (Search & Filter Here) --- */}
            <div>
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
                    <div className="flex items-center gap-2">
                        <ArrowDownCircle className="text-rose-500" size={22} />
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest italic">Itemized Spending Matrix</h3>
                    </div>
                    
                    {/* Advanced Filter Bar for Expenses */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-lg border-2 border-slate-50 dark:border-slate-700 flex flex-wrap gap-4 no-print">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input type="text" placeholder="Search Item..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:border-rose-400 outline-none transition-all" />
                        </div>
                        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white cursor-pointer outline-none">
                            <option value="all">All Months</option>
                            {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white cursor-pointer outline-none">
                            <option value="all">All Weeks</option>
                            {["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"].map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                        {(searchTerm || selectedMonth !== 'all' || selectedWeek !== 'all') && (
                            <button onClick={() => {setSearchTerm(''); setSelectedMonth('all'); setSelectedWeek('all');}} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition"><X size={18}/></button>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl border-2 border-slate-50 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1500px]">
                            <thead>
                                <tr className="bg-slate-900 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-800">
                                    <th className="p-6 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 min-w-[280px]">Purchase Item</th>
                                    {monthNames.map((m, i) => <th key={m} className={`p-6 text-center ${selectedMonth !== 'all' && parseInt(selectedMonth) !== i ? 'opacity-20' : 'opacity-100'}`}>{m}</th>)}
                                    <th className="p-6 bg-rose-600 text-white text-right sticky right-0 z-10">Total Sum</th>
                                </tr>
                            </thead>
                            <tbody className="font-bold text-xs text-slate-700 dark:text-slate-300">
                                {Object.keys(expenseMatrixData.matrix).sort().map(item => (
                                    <tr key={item} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                        <td className="p-6 bg-slate-50/80 dark:bg-slate-900 font-black text-slate-900 dark:text-slate-100 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 truncate">{item}</td>
                                        {expenseMatrixData.matrix[item].map((amt: number, i: number) => (
                                            <td key={i} className={`p-6 text-right ${selectedMonth !== 'all' && parseInt(selectedMonth) !== i ? 'opacity-10' : 'opacity-100'}`}>
                                                {amt > 0 ? <span className="text-slate-900 dark:text-slate-200">${amt.toLocaleString()}</span> : "-"}
                                            </td>
                                        ))}
                                        <td className="p-6 text-right bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-black sticky right-0 z-10 border-l border-rose-100 dark:border-rose-800 shadow-[-10px_0_15px_rgba(0,0,0,0.02)]">
                                            ${getRowSum(expenseMatrixData.matrix[item]).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-900 text-white font-black border-t-4 border-rose-600">
                                    <td className="p-6 sticky left-0 bg-slate-950 z-10 uppercase tracking-tighter">Monthly Spending Totals</td>
                                    {expenseMatrixData.totals.map((t, i) => <td key={i} className={`p-6 text-right text-rose-400 ${selectedMonth !== 'all' && parseInt(selectedMonth) !== i ? 'opacity-20' : 'opacity-100'}`}>${t.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>)}
                                    <td className="p-6 text-right bg-rose-600 text-lg sticky right-0 italic underline decoration-white decoration-4 underline-offset-4 shadow-2xl">
                                        ${expenseMatrixData.totals.reduce((a,b)=>a+b, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        {/* --- ၃။ MOBILE/TABLET WARNING BOX (ဖုန်းမှာပဲ ပေါ်မည့် အပိုင်း) --- */}
        <div className="lg:hidden my-10 p-12 text-center bg-white dark:bg-slate-800 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-700 shadow-inner no-print">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                <TableIcon size={48} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Desktop View Recommended</h3>
            <p className="text-sm font-bold text-slate-400 mt-4 leading-relaxed max-w-xs mx-auto">
                ဤ အဆင့်မြင့် ခွဲခြမ်းစိတ်ဖြာချက် ဇယားကွက်များသည် အချက်အလက် များပြားလွန်းသဖြင့် Desktop သို့မဟုတ် Laptop ဖြင့် ကြည့်ရှုရန် အကြံပြုလိုပါသည်။
            </p>
            <div className="mt-10 flex justify-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
        </div>

      </div>
    </Layout>
  );
}