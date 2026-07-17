// app/analytics/matrix/page.tsx
"use client";
import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Download, Search, FileSpreadsheet, Calendar, Table as TableIcon, Filter, X, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { TAX_CATEGORIES } from '@/lib/constants';

export default function AnalyticsMatrix() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // --- စစ်ထုတ်ရန် (Filters) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // Jan, Feb...
  const [selectedWeek, setSelectedWeek] = useState<string>('all');   // Week 1, 2...

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const years = Array.from({ length: new Date().getFullYear() - 2024 + 2 }, (_, i) => 2024 + i);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoading(true);
        // ၁။ ရက်စွဲသတ်မှတ်ချက်
        const start = new Date(selectedYear, 0, 1);
        const end = new Date(selectedYear, 11, 31, 23, 59, 59);

        // ၂။ Firebase Query
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

  // --- Smart Filtering Logic ---
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchSearch = d.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMonth = selectedMonth === 'all' ? true : d.month === parseInt(selectedMonth);
      const matchWeek = selectedWeek === 'all' ? true : d.weekLabel === selectedWeek;
      return matchSearch && matchMonth && matchWeek;
    });
  }, [data, searchTerm, selectedMonth, selectedWeek]);

  // --- Matrix Generation ---
  const incomeMatrix: any = { "Week 1": {}, "Week 2": {}, "Week 3": {}, "Week 4": {}, "Week 5": {} };
  const expenseMatrix: any = {};
  const incomeTotals = Array(12).fill(0);
  const expenseTotals = Array(12).fill(0);

  filteredData.forEach(d => {
    const isInc = d.category === 'income' || d.category === 'w2_income';
    if (isInc) {
      incomeMatrix[d.weekLabel][d.month] = (incomeMatrix[d.weekLabel][d.month] || 0) + d.amount;
      incomeTotals[d.month] += d.amount;
    } else if (d.category !== 'estimated_tax_paid' && d.category !== 'owner_draw') {
      const cleanName = d.description.split(' (')[0].trim();
      if (!expenseMatrix[cleanName]) expenseMatrix[cleanName] = Array(12).fill(0);
      expenseMatrix[cleanName][d.month] += d.amount;
      expenseTotals[d.month] += d.amount;
    }
  });

  const getRowSum = (arr: any) => (Array.isArray(arr) ? arr : Object.values(arr)).reduce((a:number,b:any)=>a+(Number(b)||0), 0);

  return (
    <Layout>
      <div className="pt-4 pb-40 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 no-print">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-2xl"><TableIcon size={28}/></div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic">Analytics Matrix</h2>
                    <div className="relative inline-block">
                        <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="appearance-none bg-transparent font-black text-emerald-600 outline-none cursor-pointer pr-6">
                            {years.reverse().map(y => <option key={y} value={y}>{y} FISCAL YEAR</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-emerald-600" />
                    </div>
                </div>
            </div>
        </div>

        {/* --- Advanced Filter Bar (ဒီမှာပါ လူကြီးမင်း အလိုရှိတဲ့ အကွက်တွေ) --- */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-50 dark:border-slate-700 mb-10 no-print">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Search Item Name</label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input type="text" placeholder="Tuna, Salmon..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-all" />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Filter by Month</label>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none">
                        <option value="all">All Months (Jan-Dec)</option>
                        {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Filter by Week</label>
                    <select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none">
                        <option value="all">Full Month (Weeks 1-5)</option>
                        {["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"].map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                </div>
            </div>
            {(searchTerm || selectedMonth !== 'all' || selectedWeek !== 'all') && (
                <button onClick={() => {setSearchTerm(''); setSelectedMonth('all'); setSelectedWeek('all');}} className="mt-4 text-[10px] font-black text-rose-500 uppercase flex items-center gap-1 hover:underline"><X size={12}/> Clear Filters</button>
            )}
        </div>

        {/* --- 1. Weekly Income Table --- */}
        <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl border-2 border-slate-50 dark:border-slate-700 overflow-hidden mb-16">
            <div className="p-8 bg-emerald-50/30 dark:bg-emerald-900/10 border-b-2 border-slate-100 dark:border-slate-700 font-black text-emerald-700 dark:text-emerald-400 uppercase text-lg italic tracking-widest">Weekly Income Flow</div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                        <tr className="bg-slate-900 text-slate-400 font-black text-[9px] uppercase tracking-widest">
                            <th className="p-6 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">Weeks</th>
                            {monthNames.map((m, i) => <th key={m} className={`p-6 text-center ${selectedMonth !== 'all' && parseInt(selectedMonth) !== i ? 'opacity-20' : 'opacity-100'}`}>{m}</th>)}
                            <th className="p-6 bg-emerald-600 text-white text-right sticky right-0 z-10">Total</th>
                        </tr>
                    </thead>
                    <tbody className="font-bold text-xs">
                        {Object.keys(incomeMatrix).map(week => (
                            <tr key={week} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                <td className="p-6 bg-slate-50 dark:bg-slate-900 font-black text-slate-900 dark:text-white sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700">{week}</td>
                                {monthNames.map((_, i) => (
                                    <td key={i} className={`p-6 text-right ${selectedMonth !== 'all' && parseInt(selectedMonth) !== i ? 'opacity-10' : 'opacity-100'}`}>
                                        {incomeMatrix[week][i] ? <span className="text-emerald-600 font-black">${incomeMatrix[week][i].toLocaleString()}</span> : "-"}
                                    </td>
                                ))}
                                <td className="p-6 text-right bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-black sticky right-0 z-10 border-l border-emerald-100 dark:border-emerald-800 shadow-[-10px_0_15px_rgba(0,0,0,0.02)]">
                                    ${getRowSum(incomeMatrix[week]).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-emerald-600 text-white font-black">
                            <td className="p-6 sticky left-0 bg-emerald-700">Monthly Totals</td>
                            {incomeTotals.map((t, i) => <td key={i} className="p-6 text-right font-black">${t.toLocaleString()}</td>)}
                            <td className="p-6 text-right bg-emerald-800 text-lg sticky right-0 italic shadow-2xl">${incomeTotals.reduce((a,b)=>a+b, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        {/* --- 2. Itemized Spending Matrix --- */}
        <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl border-2 border-slate-50 dark:border-slate-700 overflow-hidden mb-20">
            <div className="p-8 bg-rose-50/30 dark:bg-rose-900/10 border-b-2 border-slate-100 dark:border-slate-700 font-black text-rose-700 dark:text-rose-400 uppercase text-lg italic tracking-widest">Itemized Spending Matrix</div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1400px]">
                    <thead>
                        <tr className="bg-slate-900 text-slate-500 font-black text-[9px] uppercase tracking-widest">
                            <th className="p-6 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 min-w-[250px]">Purchase Item</th>
                            {monthNames.map((m, i) => <th key={m} className={`p-6 text-center ${selectedMonth !== 'all' && parseInt(selectedMonth) !== i ? 'opacity-20' : 'opacity-100'}`}>{m}</th>)}
                            <th className="p-6 bg-rose-600 text-white text-right sticky right-0 z-10">Total Sum</th>
                        </tr>
                    </thead>
                    <tbody className="font-bold text-xs">
                        {Object.keys(expenseMatrix).sort().map(item => (
                            <tr key={item} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                <td className="p-6 bg-slate-50/80 dark:bg-slate-900 font-black text-slate-900 dark:text-slate-100 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 truncate">{item}</td>
                                {expenseMatrix[item].map((amt: number, i: number) => (
                                    <td key={i} className={`p-6 text-right ${selectedMonth !== 'all' && parseInt(selectedMonth) !== i ? 'opacity-10' : 'opacity-100'}`}>
                                        {amt > 0 ? <span className="text-slate-600 dark:text-slate-400">${amt.toLocaleString()}</span> : "-"}
                                    </td>
                                ))}
                                <td className="p-6 text-right bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-black sticky right-0 z-10 border-l border-rose-100 dark:border-rose-800 shadow-[-10px_0_15px_rgba(0,0,0,0.02)]">
                                    ${getRowSum(expenseMatrix[item]).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-slate-900 text-white font-black border-t-4 border-rose-600">
                            <td className="p-6 sticky left-0 bg-slate-950 uppercase tracking-tighter">All Expenses Total</td>
                            {expenseTotals.map((t, i) => <td key={i} className="p-6 text-right text-rose-400 font-black">${t.toLocaleString()}</td>)}
                            <td className="p-6 text-right bg-rose-600 text-lg sticky right-0 italic shadow-2xl">${expenseTotals.reduce((a,b)=>a+b, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </Layout>
  );
}