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

  return (
    <Layout>
      <div className="pt-4 pb-40 px-4">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-10 no-print">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center"><TableIcon size={24}/></div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">Analytics Matrix</h2>
                    <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-transparent font-black text-emerald-600 outline-none cursor-pointer text-xs">
                        {years.reverse().map(y => <option key={y} value={y}>{y} FISCAL YEAR</option>)}
                    </select>
                </div>
            </div>
            <button onClick={() => {/* Excel Export Logic */}} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-[10px] shadow-lg">EXPORT EXCEL</button>
        </div>

        {/* --- SECTION 1: WEEKLY INCOME (Year Only) --- */}
        <div className="mb-16">
            <div className="flex items-center gap-2 mb-6">
                <ArrowUpCircle className="text-emerald-500" size={20} />
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest italic">Weekly Income Analysis</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border-2 border-slate-50 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="bg-slate-900 text-slate-400 font-black text-[9px] uppercase tracking-widest">
                                <th className="p-5 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 text-center">Weeks</th>
                                {monthNames.map(m => <th key={m} className="p-5 text-center">{m}</th>)}
                                <th className="p-5 bg-emerald-600 text-white text-right sticky right-0 z-10">Total</th>
                            </tr>
                        </thead>
                        <tbody className="font-bold text-xs">
                            {Object.keys(incomeMatrixData.matrix).map(week => (
                                <tr key={week} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                    <td className="p-5 bg-slate-50 dark:bg-slate-900 font-black text-slate-900 dark:text-white sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 text-center">{week}</td>
                                    {monthNames.map((_, i) => (
                                        <td key={i} className="p-5 text-right font-black text-emerald-600 dark:text-emerald-400 opacity-80">
                                            {incomeMatrixData.matrix[week][i] ? `$${incomeMatrixData.matrix[week][i].toLocaleString()}` : "-"}
                                        </td>
                                    ))}
                                    <td className="p-5 text-right bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-black sticky right-0 z-10 border-l border-emerald-100 dark:border-emerald-800">
                                        ${getRowSum(incomeMatrixData.matrix[week]).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-emerald-600 text-white font-black">
                                <td className="p-5 sticky left-0 bg-emerald-700 z-10 uppercase text-center">Monthly Totals</td>
                                {incomeMatrixData.totals.map((t, i) => <td key={i} className="p-5 text-right">${t.toLocaleString()}</td>)}
                                <td className="p-5 text-right bg-emerald-800 text-lg sticky right-0 italic underline decoration-white decoration-4 underline-offset-4 shadow-2xl">
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
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                <div className="flex items-center gap-2">
                    <ArrowDownCircle className="text-rose-500" size={20} />
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest italic">Itemized Spending Matrix</h3>
                </div>
                
                {/* Advanced Search & Filter Bar (Positioned specifically for Expense) */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-lg border-2 border-slate-50 dark:border-slate-700 flex flex-wrap gap-4 no-print">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input type="text" placeholder="Search Item..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl font-bold text-xs" />
                    </div>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl font-bold text-xs">
                        <option value="all">All Months</option>
                        {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl font-bold text-xs">
                        <option value="all">All Weeks</option>
                        {["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"].map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                    {(searchTerm || selectedMonth !== 'all' || selectedWeek !== 'all') && (
                        <button onClick={() => {setSearchTerm(''); setSelectedMonth('all'); setSelectedWeek('all');}} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"><X size={18}/></button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl border-2 border-slate-50 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1400px]">
                        <thead>
                            <tr className="bg-slate-900 text-slate-500 font-black text-[9px] uppercase tracking-widest border-b border-slate-800">
                                <th className="p-6 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 min-w-[250px]">Purchase Item</th>
                                {monthNames.map((m, i) => <th key={m} className={`p-6 text-center ${selectedMonth !== 'all' && parseInt(selectedMonth) !== i ? 'opacity-20' : 'opacity-100'}`}>{m}</th>)}
                                <th className="p-6 bg-rose-600 text-white text-right sticky right-0 z-10">Row Total</th>
                            </tr>
                        </thead>
                        <tbody className="font-bold text-xs">
                            {Object.keys(expenseMatrixData.matrix).sort().map(item => (
                                <tr key={item} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                    <td className="p-6 bg-slate-50/80 dark:bg-slate-900 font-black text-slate-900 dark:text-slate-100 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 truncate">{item}</td>
                                    {expenseMatrixData.matrix[item].map((amt: number, i: number) => (
                                        <td key={i} className={`p-6 text-right ${selectedMonth !== 'all' && parseInt(selectedMonth) !== i ? 'opacity-10' : 'opacity-100'}`}>
                                            {amt > 0 ? <span className="text-slate-600 dark:text-slate-400 font-black">${amt.toLocaleString()}</span> : "-"}
                                        </td>
                                    ))}
                                    <td className="p-6 text-right bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-black sticky right-0 z-10 border-l border-rose-100 dark:border-rose-800 shadow-[-10px_0_15px_rgba(0,0,0,0.02)]">
                                        ${getRowSum(expenseMatrixData.matrix[item]).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-slate-900 text-white font-black border-t-4 border-rose-600">
                                <td className="p-6 sticky left-0 bg-slate-950 z-10 uppercase text-center">Totals</td>
                                {expenseMatrixData.totals.map((t, i) => <td key={i} className={`p-6 text-right text-rose-400 ${selectedMonth !== 'all' && parseInt(selectedMonth) !== i ? 'opacity-20' : 'opacity-100'}`}>${t.toLocaleString()}</td>)}
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
    </Layout>
  );
}